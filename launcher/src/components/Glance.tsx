import { useEffect, useState, type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Landmark, Newspaper, CalendarDays } from 'lucide-react';
import type { Preferences } from '../lib/launcher';

// "At a glance" cards. Everything is fetched straight from the TV's browser from public, key-free
// sources, so nothing goes through a server of ours.

const SYMBOLS: Record<string, string> = {
  bitcoin: 'BTC',
  ripple: 'XRP',
  ethereum: 'ETH',
  solana: 'SOL',
  dogecoin: 'DOGE',
  cardano: 'ADA',
  litecoin: 'LTC',
  chainlink: 'LINK',
};
const usd = (n: number) =>
  n >= 100
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });

function useJson<T>(url: string, every: number, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || !url) return;
    let alive = true;
    const load = async () => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 12000);
      try {
        const r = await fetch(url, { signal: ctl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as T;
        if (alive) {
          setData(j);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      } finally {
        clearTimeout(t);
      }
    };
    void load();
    const timer = setInterval(load, every);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [url, every, enabled]);
  return { data, failed };
}

function Markets({ coins }: { coins: string[] }) {
  const ids = coins.join(',');
  const { data, failed } = useJson<Record<string, { usd: number; usd_24h_change?: number }>>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`,
    60000,
    coins.length > 0
  );
  return (
    <article className="glance-card">
      <h3>
        <TrendingUp size={15} /> Markets
      </h3>
      <ul className="coins">
        {coins.map(id => {
          const p = data?.[id];
          const ch = p?.usd_24h_change;
          return (
            <li key={id}>
              <b>{SYMBOLS[id] ?? id.toUpperCase()}</b>
              <strong>{p ? usd(p.usd) : '—'}</strong>
              {typeof ch === 'number' && (
                <em className={ch >= 0 ? 'up' : 'down'}>
                  {ch >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(ch).toFixed(1)}%
                </em>
              )}
            </li>
          );
        })}
      </ul>
      <small>
        {failed && !data ? 'Prices unavailable right now.' : '24-hour change · CoinGecko'}
      </small>
    </article>
  );
}

interface DebtRows {
  data?: { record_date: string; tot_pub_debt_out_amt: string }[];
}
function Debt() {
  const { data, failed } = useJson<DebtRows>(
    'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page%5Bsize%5D=31',
    6 * 3600000,
    true
  );
  const rows = data?.data;
  // Treasury publishes one number per day; extrapolate the recent trend so it ticks live (an estimate).
  const base = rows?.length ? Number(rows[0].tot_pub_debt_out_amt) : 0;
  const stamp = rows?.length ? new Date(rows[0].record_date + 'T00:00:00Z').getTime() : 0;
  const oldest = rows && rows.length > 1 ? rows[rows.length - 1] : null;
  const perSecond =
    oldest && rows
      ? (base - Number(oldest.tot_pub_debt_out_amt)) /
        ((stamp - new Date(oldest.record_date + 'T00:00:00Z').getTime()) / 1000)
      : 0;
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!base) return;
    const tick = () => setValue(base + Math.max(0, perSecond) * ((Date.now() - stamp) / 1000));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [base, stamp, perSecond]);
  return (
    <article className="glance-card">
      <h3>
        <Landmark size={15} /> U.S. national debt
      </h3>
      <strong className="debt">
        {value ? '$' + Math.round(value).toLocaleString('en-US') : '—'}
      </strong>
      <small>
        {failed && !rows
          ? 'Unavailable right now.'
          : perSecond > 0
            ? `Growing about $${Math.round(perSecond).toLocaleString('en-US')} every second · U.S. Treasury (estimate)`
            : 'U.S. Treasury'}
      </small>
    </article>
  );
}

interface Headline {
  title: string;
  source: string;
  link: string;
  date: string;
}
// Headlines are fetched every 30 minutes by a scheduled job (see .github/workflows/news.yml) and
// published next to this page as news.json, so the TV never has to call a news service itself.
function News({ topics }: { topics: string[] }) {
  const [feed, setFeed] = useState<Record<string, Headline[]> | null>(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const url = new URL('../news.json', window.location.href).href;
        const r = await fetch(`${url}?t=${Math.floor(Date.now() / 600000)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as { topics?: Record<string, Headline[]> };
        if (!alive || !j.topics) return;
        const map: Record<string, Headline[]> = {};
        for (const [name, list] of Object.entries(j.topics)) map[name.toLowerCase()] = list;
        setFeed(map);
        setError('');
      } catch (e) {
        if (alive) setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      }
    };
    void load();
    const timer = setInterval(load, 10 * 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  // Only topics the job publishes can be shown. Others are ignored rather than left blank.
  const shown = feed ? topics.filter(t => feed[t.toLowerCase()]?.length) : topics;
  const key = shown.join('|');
  useEffect(() => {
    setActive(0);
    if (shown.length < 2) return;
    const timer = setInterval(() => setActive(i => (i + 1) % shown.length), 20000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const topic = shown[active % Math.max(shown.length, 1)];
  const items = (feed && topic && feed[topic.toLowerCase()]) || [];
  return (
    <article className="glance-card news">
      <h3>
        <Newspaper size={15} /> News
        <span className="topics">
          {shown.map((t, i) => (
            <i key={t} className={i === active % shown.length ? 'on' : ''}>
              {t}
            </i>
          ))}
        </span>
      </h3>
      <ul className="headlines">
        {items.length ? (
          items.slice(0, 4).map(h => (
            <li key={h.link}>
              <span>{h.title}</span>
              {h.source && <small>{h.source}</small>}
            </li>
          ))
        ) : (
          <li>
            <span>
              {error
                ? `Can't load the headline file (${error}).`
                : feed === null
                  ? 'Loading headlines…'
                  : 'None of your chosen topics have headlines yet. Pick topics in the phone remote.'}
            </span>
          </li>
        )}
      </ul>
    </article>
  );
}

function History() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const { data } = useJson<{ events?: { year: number; text: string }[] }>(
    `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${mm}/${dd}`,
    12 * 3600000,
    true
  );
  const events = data?.events?.filter(e => e.text.length < 190) ?? [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (events.length < 2) return;
    const timer = setInterval(() => setI(n => (n + 1) % Math.min(events.length, 12)), 15000);
    return () => clearInterval(timer);
  }, [events.length]);
  const e = events[i % Math.max(events.length, 1)];
  return (
    <article className="glance-card">
      <h3>
        <CalendarDays size={15} /> On this day
      </h3>
      {e ? (
        <p className="fact">
          <b>{e.year}</b> {e.text}
        </p>
      ) : (
        <p className="fact">Loading…</p>
      )}
      <small>Wikipedia</small>
    </article>
  );
}

export function Glance({ prefs, children }: { prefs: Preferences; children?: ReactNode }) {
  const coins = (prefs.coins ?? ['bitcoin', 'ripple']).slice(0, 6);
  const topics = (prefs.newsTopics ?? ['Technology']).filter(Boolean).slice(0, 6);
  const showMarkets = prefs.showMarkets !== false && coins.length > 0;
  const showDebt = prefs.showDebt !== false;
  const showNews = prefs.showNews !== false && topics.length > 0;
  const showHistory = prefs.showHistory !== false;
  return (
    <section className="glance" aria-label="At a glance">
      {children}
      {showMarkets && <Markets coins={coins} />}
      {showDebt && <Debt />}
      {showNews && <News topics={topics} />}
      {showHistory && <History />}
    </section>
  );
}
