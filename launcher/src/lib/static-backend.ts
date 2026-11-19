// Everything runs in the TV's own browser; there is no server component.
// - TV commands go straight to the TV's SmartCast API on the home network.
// - Household settings live in this browser's storage.
// - Weather is fetched directly from Open-Meteo / the National Weather Service.
// Nothing here is sent to a server of ours; the pairing token never leaves the TV and phone.

const CONN_KEY = 'ourspace.tv.v1';
const HOUSE_KEY = 'ourspace.household.v1';

interface Conn {
  host: string;
  port: number;
  token: string;
  deviceId: string;
}

function readConn(): Conn {
  try {
    const raw = JSON.parse(localStorage.getItem(CONN_KEY) || 'null');
    if (raw && typeof raw.host === 'string') return raw as Conn;
  } catch {
    /* storage unavailable */
  }
  return { host: '', port: 7345, token: '', deviceId: crypto.randomUUID?.() || String(Date.now()) };
}
function writeConn(c: Conn) {
  try {
    localStorage.setItem(CONN_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable: connection lasts for this session only */
  }
  memory = c;
}
let memory: Conn | undefined;
const conn = () => (memory ??= readConn());

// The phone remote opens this page as  .../tv/?tv=1#ip=…&t=…&d=…  so the TV can talk to itself.
// The fragment is never sent to a web server. It is saved, then removed from the address bar.
function consumeHandoff() {
  if (!location.hash) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const ip = p.get('ip');
  const token = p.get('t');
  if (ip && token && isPrivateIp(ip))
    writeConn({
      host: ip,
      port: 7345,
      token,
      deviceId: p.get('d') || conn().deviceId,
    });
  const cfg = p.get('cfg');
  if (cfg) applyConfig(cfg);
  history.replaceState(null, '', location.pathname + location.search);
}

// Look-and-feel chosen on the phone. Only known keys with valid values are accepted.
const THEMES = ['alpine', 'aurora', 'dunes', 'ocean', 'cosmos', 'video', 'custom'];
function applyConfig(encoded: string) {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    let stored: Record<string, unknown> = {};
    try {
      stored = JSON.parse(localStorage.getItem(HOUSE_KEY) || '{}') || {};
    } catch {
      /* start fresh */
    }
    const next = { ...stored };
    const text = (k: string, max: number) => {
      if (typeof raw[k] === 'string' && raw[k].trim() && raw[k].length <= max)
        next[k] = raw[k].trim();
    };
    const flag = (k: string) => {
      if (typeof raw[k] === 'boolean') next[k] = raw[k];
    };
    text('name', 40);
    text('launcherName', 40);
    text('room', 40);
    if (typeof raw.accent === 'string' && /^#[0-9a-f]{6}$/i.test(raw.accent))
      next.accent = raw.accent;
    if (typeof raw.weatherLocation === 'string' && raw.weatherLocation.length <= 80)
      next.weatherLocation = raw.weatherLocation.trim();
    if (['off', 'balanced', 'rich'].includes(raw.effects)) next.effects = raw.effects;
    if (['fahrenheit', 'celsius'].includes(raw.units)) next.units = raw.units;
    if (Number.isFinite(raw.dimming) && raw.dimming >= 0 && raw.dimming <= 80)
      next.dimming = raw.dimming;
    ['weatherEnabled', 'clock24', 'showRecent', 'compact'].forEach(flag);
    if (typeof raw.backgroundVideo === 'string')
      next.backgroundVideo = /^https:\/\/\S+$/i.test(raw.backgroundVideo)
        ? raw.backgroundVideo
        : '';
    ['showMarkets', 'showDebt', 'showNews', 'showHistory'].forEach(flag);
    if (Array.isArray(raw.coins))
      next.coins = raw.coins
        .filter((c: unknown) => typeof c === 'string' && /^[a-z0-9-]{2,40}$/.test(c))
        .slice(0, 6);
    if (Array.isArray(raw.newsTopics))
      next.newsTopics = raw.newsTopics
        .filter((t: unknown) => typeof t === 'string' && t.trim().length >= 2 && t.length <= 40)
        .map((t: string) => t.trim())
        .slice(0, 6);
    if (Array.isArray(raw.backgroundVideos))
      next.backgroundVideos = raw.backgroundVideos
        .filter(
          (u: unknown) => typeof u === 'string' && u.length <= 300 && /^https:\/\/\S+$/i.test(u)
        )
        .slice(0, 8);
    if (THEMES.includes(raw.background)) {
      const ok =
        raw.background === 'video'
          ? !!next.backgroundVideo
          : raw.background === 'custom'
            ? !!next.backgroundImage
            : true;
      if (ok) next.background = raw.background;
    }
    localStorage.setItem(HOUSE_KEY, JSON.stringify(next));
  } catch {
    /* ignore a malformed configuration */
  }
}
function isPrivateIp(host: string) {
  const p = host.split('.').map(Number);
  return (
    p.length === 4 &&
    p.every(
      (n, i) => Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === host.split('.')[i]
    ) &&
    (p[0] === 10 || (p[0] === 192 && p[1] === 168) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31))
  );
}
consumeHandoff();

interface SmartCastReply {
  STATUS?: { RESULT?: string; DETAIL?: string };
  ITEM?: Record<string, unknown>;
  ITEMS?: { VALUE?: unknown }[];
}
async function tv(
  path: string,
  method = 'GET',
  body?: unknown,
  auth = true
): Promise<SmartCastReply> {
  const c = conn();
  if (!c.host) throw new Error('Open Our Space from your phone remote so it can find the TV.');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && c.token) headers.AUTH = c.token;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  let res: Response;
  try {
    res = await fetch(`https://${c.host}:${c.port}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch {
    throw new Error('TV did not respond. Check that it is on and on the same Wi-Fi.');
  } finally {
    clearTimeout(timer);
  }
  let data: SmartCastReply;
  try {
    data = await res.json();
  } catch {
    throw new Error('Device returned an invalid SmartCast response');
  }
  const result = data.STATUS?.RESULT?.toUpperCase();
  if (result === 'REQUIRES_PAIRING') {
    writeConn({ ...c, token: '' });
    throw Object.assign(new Error('Pair your TV from the phone remote first.'), { pairing: true });
  }
  if (result !== 'SUCCESS') throw new Error(`SmartCast: ${data.STATUS?.RESULT ?? 'error'}`);
  return data;
}

let challenge: { PAIRING_REQ_TOKEN: number; CHALLENGE_TYPE: number; started: number } | undefined;
const KEYCODES: Record<string, number> = { volumeDown: 0, volumeUp: 1, mute: 4 };

export async function standaloneApi(
  path: string,
  body?: unknown
): Promise<Record<string, unknown>> {
  const b = (body ?? {}) as Record<string, unknown>;
  const c = conn();
  switch (path) {
    case 'status':
      return {
        host: c.host,
        port: c.port,
        paired: !!c.token,
        persistent: true,
        persistenceError: '',
      };
    case 'configure': {
      const host = String(b.host ?? '');
      if (!isPrivateIp(host) || ![7345, 9000].includes(Number(b.port)))
        throw new Error('Use a private LAN IPv4 address and port 7345 or 9000');
      const changed = host !== c.host || Number(b.port) !== c.port;
      writeConn({ ...c, host, port: Number(b.port), token: changed ? '' : c.token });
      return { ok: true, paired: !changed && !!c.token };
    }
    case 'probe':
      await tv('/state/device/deviceinfo', 'GET', undefined, false);
      return { ok: true };
    case 'pair/start': {
      const d = await tv(
        '/pairing/start',
        'PUT',
        { DEVICE_ID: c.deviceId, DEVICE_NAME: 'Our Space' },
        false
      );
      const item = d.ITEM as { PAIRING_REQ_TOKEN?: number; CHALLENGE_TYPE?: number } | undefined;
      if (!Number.isInteger(item?.PAIRING_REQ_TOKEN) || !Number.isInteger(item?.CHALLENGE_TYPE))
        throw new Error('TV did not return a pairing challenge');
      challenge = {
        PAIRING_REQ_TOKEN: item!.PAIRING_REQ_TOKEN!,
        CHALLENGE_TYPE: item!.CHALLENGE_TYPE!,
        started: Date.now(),
      };
      return { ok: true };
    }
    case 'pair/finish': {
      if (!challenge || Date.now() - challenge.started > 180000)
        throw new Error('Start pairing again; the challenge has expired');
      const pin = String(b.pin ?? '');
      if (!/^\d{4,6}$/.test(pin)) throw new Error('Enter the 4–6 digit code displayed on the TV');
      const d = await tv(
        '/pairing/pair',
        'PUT',
        {
          DEVICE_ID: c.deviceId,
          CHALLENGE_TYPE: challenge.CHALLENGE_TYPE,
          RESPONSE_VALUE: pin,
          PAIRING_REQ_TOKEN: challenge.PAIRING_REQ_TOKEN,
        },
        false
      );
      const token = d.ITEM?.AUTH_TOKEN;
      if (typeof token !== 'string' || !token)
        throw new Error('TV did not return an authentication token');
      writeConn({ ...conn(), token });
      challenge = undefined;
      return { ok: true };
    }
    case 'launch': {
      const appId = String(b.appId ?? '');
      const namespace = Number(b.namespace);
      if (
        !appId ||
        appId.length > 100 ||
        !Number.isInteger(namespace) ||
        namespace < 0 ||
        namespace > 10
      )
        throw new Error('Invalid app launch configuration');
      await tv('/app/launch', 'PUT', {
        VALUE: { APP_ID: appId, NAME_SPACE: namespace, MESSAGE: '' },
      });
      return { ok: true };
    }
    case 'remote': {
      const code = KEYCODES[String(b.command)];
      if (code === undefined) throw new Error('Unsupported remote command');
      await tv('/key_command/', 'PUT', {
        KEYLIST: [{ CODESET: 5, CODE: code, ACTION: 'KEYPRESS' }],
      });
      return { ok: true };
    }
    default:
      throw new Error('This feature is not available in standalone mode');
  }
}

// ---- household settings (stored in this browser) -------------------------------------------
const json = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

export async function standaloneFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(path, location.href);
  if (url.pathname.endsWith('/api/household')) {
    if (!init?.method || init.method === 'GET') {
      try {
        const stored = localStorage.getItem(HOUSE_KEY);
        return json(200, stored ? JSON.parse(stored) : {});
      } catch {
        return json(200, {});
      }
    }
    try {
      const value = JSON.parse(String(init.body ?? '{}'));
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Invalid settings');
      if (
        value.backgroundImage &&
        (!/^data:image\/(jpeg|png|webp);base64,/i.test(value.backgroundImage) ||
          value.backgroundImage.length > 1800000)
      )
        throw new Error('Choose a smaller JPG, PNG, or WebP photo');
      if (value.backgroundVideo && !/^https:\/\//i.test(value.backgroundVideo))
        throw new Error('Background video addresses must start with https://');
      localStorage.setItem(HOUSE_KEY, JSON.stringify(value));
      return json(200, { ok: true });
    } catch (e) {
      return json(400, { error: e instanceof Error ? e.message : 'Could not save settings' });
    }
  }
  if (url.pathname.endsWith('/api/weather')) {
    try {
      const location = (url.searchParams.get('location') || '').trim();
      const units = url.searchParams.get('units') === 'celsius' ? 'celsius' : 'fahrenheit';
      return json(200, await weather(location, units));
    } catch (e) {
      return json(502, { error: e instanceof Error ? e.message : 'Weather is unavailable' });
    }
  }
  return json(501, { error: 'Not supported. Use a video web address instead.' });
}

// ---- weather (ported from the PC helper) ---------------------------------------------------
const cache = new Map<string, { at: number; data: unknown }>();
function condition(text = '') {
  const s = text.toLowerCase();
  if (/thunder/.test(s)) return 95;
  if (/snow|sleet|ice/.test(s)) return 73;
  if (/rain|shower|drizzle/.test(s)) return 61;
  if (/fog|mist/.test(s)) return 45;
  if (/mostly cloudy|cloudy|overcast/.test(s) && !/partly/.test(s)) return 3;
  if (/partly|mostly sunny|mostly clear/.test(s)) return 2;
  return 0;
}
async function getJson(url: string, headers?: Record<string, string>) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Weather service is temporarily unavailable');
  return r.json();
}
interface Period {
  startTime: string;
  temperature: number;
  isDaytime?: boolean;
  shortForecast?: string;
  probabilityOfPrecipitation?: { value: number | null };
}
async function weather(location: string, units: 'fahrenheit' | 'celsius') {
  if (location.length < 2 || location.length > 80) throw new Error('Enter a city or ZIP code');
  const key = location.toLowerCase() + units;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 900000) return hit.data;
  const geo = new URLSearchParams({
    name: location,
    count: '1',
    language: 'en',
    ...(/^\d{5}$/.test(location) ? { countryCode: 'US' } : {}),
  });
  const place = (await getJson(`https://geocoding-api.open-meteo.com/v1/search?${geo}`))
    .results?.[0];
  if (!place) throw new Error('Location not found. Try a city and state or a ZIP code.');
  const label = `${place.name}, ${place.admin1 || place.country_code}`;
  let data: Record<string, unknown>;
  if (place.country_code === 'US') {
    const nws = { Accept: 'application/geo+json' };
    const point = await getJson(
      `https://api.weather.gov/points/${Number(place.latitude).toFixed(4)},${Number(place.longitude).toFixed(4)}`,
      nws
    );
    const [hourly, forecast] = await Promise.all([
      getJson(point.properties.forecastHourly, nws),
      getJson(point.properties.forecast, nws),
    ]);
    const now = hourly.properties?.periods?.[0];
    if (!now || !Number.isFinite(now.temperature))
      throw new Error('Local forecast data is unavailable');
    const temp = (p?: Period) =>
      p == null ? null : units === 'fahrenheit' ? p.temperature : ((p.temperature - 32) * 5) / 9;
    const grouped = new Map<string, Period[]>();
    for (const p of forecast.properties?.periods || []) {
      const d = String(p.startTime).slice(0, 10);
      grouped.set(d, [...(grouped.get(d) || []), p]);
    }
    const daily = {
      time: [] as string[],
      weather_code: [] as number[],
      temperature_2m_max: [] as (number | null)[],
      temperature_2m_min: [] as (number | null)[],
      precipitation_probability_max: [] as (number | null)[],
      sunset: [] as string[],
    };
    for (const [date, periods] of [...grouped].slice(0, 3)) {
      const day = periods.find(p => p.isDaytime);
      const night = periods.find(p => !p.isDaytime);
      daily.time.push(date);
      daily.weather_code.push(condition((day || night)?.shortForecast));
      daily.temperature_2m_max.push(temp(day));
      daily.temperature_2m_min.push(temp(night));
      const probs = periods
        .map(p => p.probabilityOfPrecipitation?.value)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      daily.precipitation_probability_max.push(probs.length ? Math.max(...probs) : null);
    }
    data = {
      kind: 'forecast',
      source: 'National Weather Service',
      sourceUrl: 'https://www.weather.gov/',
      description: now.shortForecast,
      current: {
        temperature_2m: temp(now),
        apparent_temperature: null,
        weather_code: condition(now.shortForecast),
        is_day: now.isDaytime ? 1 : 0,
        wind_speed_10m: (parseFloat(now.windSpeed) || 0) * (units === 'fahrenheit' ? 1 : 1.609344),
      },
      daily,
    };
  } else {
    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset',
      temperature_unit: units,
      wind_speed_unit: units === 'fahrenheit' ? 'mph' : 'kmh',
      timezone: place.timezone || 'auto',
      forecast_days: '3',
    });
    const w = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!Number.isFinite(w.current?.temperature_2m) || !Array.isArray(w.daily?.time))
      throw new Error('Forecast data is incomplete');
    data = {
      kind: 'current',
      source: 'Open-Meteo',
      sourceUrl: 'https://open-meteo.com/',
      current: w.current,
      daily: w.daily,
    };
  }
  const result = { location: label, updated: Date.now(), units, ...data };
  cache.set(key, { at: Date.now(), data: result });
  return result;
}
