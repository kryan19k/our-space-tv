import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Moon,
  Wind,
  Droplets,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import type { Preferences } from '../lib/launcher';
import { householdFetch } from '../lib/household-service';
interface Forecast {
  kind?: string;
  source?: string;
  sourceUrl?: string;
  description?: string;
  location: string;
  updated: number;
  units: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number | null;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_probability_max: (number | null)[];
    sunset: string[];
  };
}
export function describeWeather(code: number) {
  return code === 0
    ? 'Clear skies'
    : code <= 2
      ? 'Partly cloudy'
      : code === 3
        ? 'Overcast'
        : code <= 48
          ? 'Foggy'
          : code <= 67
            ? 'Rain'
            : code <= 77
              ? 'Snow'
              : code <= 82
                ? 'Rain showers'
                : code <= 86
                  ? 'Snow showers'
                  : 'Thunderstorms';
}
function WeatherIcon({
  code,
  day = true,
  size = 28,
}: {
  code: number;
  day?: boolean;
  size?: number;
}) {
  const Icon =
    code === 0
      ? day
        ? Sun
        : Moon
      : code <= 2
        ? CloudSun
        : code <= 48
          ? Cloud
          : code <= 67 || (code >= 80 && code <= 82) || code >= 95
            ? CloudRain
            : CloudSnow;
  return <Icon size={size} strokeWidth={1.3} />;
}
export function Weather({
  prefs,
  compact = false,
  onConfigure,
}: {
  prefs: Preferences;
  compact?: boolean;
  onConfigure: () => void;
}) {
  const [data, setData] = useState<Forecast | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!prefs.weatherEnabled) return;
    let alive = true;
    const controller = new AbortController();
    setData(null);
    setError('');
    const load = async () => {
      try {
        const params = new URLSearchParams({ location: prefs.weatherLocation, units: prefs.units });
        const response = await householdFetch(`/api/weather?${params}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.current)
          throw new Error(result.error || 'Weather is unavailable');
        if (alive) {
          setData(result);
          setError('');
        }
      } catch (e) {
        if (alive && !controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Weather is unavailable');
      }
    };
    void load();
    const timer = setInterval(load, 15 * 60 * 1000);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [prefs.weatherLocation, prefs.units, prefs.weatherEnabled, retry]);
  if (!prefs.weatherEnabled) return null;
  if (compact)
    return (
      <button className="weather-mini" onClick={onConfigure} aria-label="Weather settings">
        {data ? (
          <>
            <WeatherIcon code={data.current.weather_code} day={!!data.current.is_day} size={20} />
            <span>{Math.round(data.current.temperature_2m)}°</span>
            <small>{data.location.split(',')[0]}</small>
          </>
        ) : (
          <>
            <Cloud size={20} />
            <small>{error ? 'Weather offline' : 'Loading weather'}</small>
          </>
        )}
      </button>
    );
  return (
    <section className="weather-card" aria-label="Local weather">
      <div className="weather-heading">
        <span>
          <MapPin size={14} />
          {data?.location || prefs.weatherLocation}
        </span>
        <button
          className="icon-button"
          onClick={() => setRetry(n => n + 1)}
          aria-label="Refresh weather"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {data ? (
        <>
          <div className="weather-current">
            <div>
              <strong>
                {Math.round(data.current.temperature_2m)}
                <sup>°{prefs.units === 'fahrenheit' ? 'F' : 'C'}</sup>
              </strong>
              <p>
                {data.description || describeWeather(data.current.weather_code)}
                {data.kind === 'forecast' ? ' · Forecast' : ''}
              </p>
            </div>
            <span className="weather-symbol">
              <WeatherIcon code={data.current.weather_code} day={!!data.current.is_day} size={67} />
            </span>
          </div>
          <div className="weather-details">
            {data.current.apparent_temperature !== null && (
              <span>Feels like {Math.round(data.current.apparent_temperature)}°</span>
            )}
            <span>
              <Wind size={13} />
              {Math.round(data.current.wind_speed_10m)}{' '}
              {prefs.units === 'fahrenheit' ? 'mph' : 'km/h'}
            </span>
            <span>
              <Droplets size={13} />
              {data.daily.precipitation_probability_max[0] === null
                ? '—'
                : `${data.daily.precipitation_probability_max[0]}%`}
            </span>
          </div>
          <div className="forecast-days">
            {data.daily.time.slice(0, 3).map((date, i) => (
              <div key={date}>
                <small>
                  {i === 0
                    ? 'Today'
                    : new Date(date + 'T12:00:00').toLocaleDateString([], { weekday: 'short' })}
                </small>
                <WeatherIcon code={data.daily.weather_code[i]} size={21} />
                <span>
                  {data.daily.temperature_2m_max[i] === null
                    ? '—'
                    : `${Math.round(data.daily.temperature_2m_max[i]!)}°`}{' '}
                  <em>
                    {data.daily.temperature_2m_min[i] === null
                      ? '—'
                      : `${Math.round(data.daily.temperature_2m_min[i]!)}°`}
                  </em>
                </span>
              </div>
            ))}
          </div>
          <div className="weather-source">
            <a href={data.sourceUrl || 'https://open-meteo.com/'} target="_blank" rel="noreferrer">
              {data.source || 'Open-Meteo'}
            </a>
            <span>
              Updated{' '}
              {new Date(data.updated).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
          {error && (
            <p className="weather-stale" role="status">
              Refresh unavailable · showing the last forecast.
            </p>
          )}
        </>
      ) : (
        <div className="weather-empty">
          <Cloud size={44} />
          <p>{error || 'A little local atmosphere…'}</p>
          {error && (
            <button className="text-button" onClick={onConfigure}>
              Check weather settings
            </button>
          )}
        </div>
      )}
    </section>
  );
}
