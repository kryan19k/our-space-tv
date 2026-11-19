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
  link: string;
  pubDate: string;
}
async function getJson(url: string) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}
// Free news feeds rate-limit, so each topic is staggered and tries two sources before giving up.
async function loadHeadlines(topic: string): Promise<Headline[]> {
  try {
    const feed = `https://news.google.com/rss/search?q=${encodeURIComponent(topic + ' when:2d')}&hl=en-US&gl=US&ceid=US:en`;
    const j = await getJson(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`
    );
    if (j.status === 'ok' && j.items?.length) return j.items.slice(0, 5);
  } catch {
    /* fall through to the second source */
  }
  const j = await getJson(
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(topic + ' sourcelang:english')}&mode=artlist&maxrecords=6&format=json&sort=datedesc&timespan=2d`
  );
  return (j.articles ?? [])
    .slice(0, 5)
    .map((a: { title: string; url: string; domain: string; seendate: string }) => ({
      title: `${a.title} - ${a.domain}`,
      link: a.url,
      pubDate: a.seendate,
    }));
}
function TopicNews({
  topic,
  delay,
  onItems,
}: {
  topic: string;
  delay: number;
  onItems: (h: Headline[]) => void;
}) {
  useEffect(() => {
    let alive = true;
    const run = () => {
      loadHeadlines(topic)
        .then(list => alive && list.length && onItems(list))
        .catch(() => {});
    };
    const first = setTimeout(run, delay);
    const timer = setInterval(run, 15 * 60000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, delay]);
  return null;
}
function News({ topics }: { topics: string[] }) {
  const [byTopic, setByTopic] = useState<Record<string, Headline[]>>({});
  const [published, setPublished] = useState<Record<string, Headline[]> | null>(null);
  const [feedError, setFeedError] = useState('');
  const [active, setActive] = useState(0);
  const key = topics.join('|');
  // Headlines are refreshed every 30 minutes by a scheduled job and published next to this page.
  useEffect(() => {
    let alive = true;
    const load = () =>
      getJson(
        new URL('../news.json', window.location.href).href + '?t=' + Math.floor(Date.now() / 600000)
      )
        .then(
          (j: {
            topics?: Record<
              string,
              { title: string; source: string; link: string; date: string }[]
            >;
          }) => {
            if (!alive || !j.topics) return;
            const map: Record<string, Headline[]> = {};
            for (const [name, list] of Object.entries(j.topics))
              map[name.toLowerCase()] = list.map(h => ({
                title: h.source ? `${h.title} - ${h.source}` : h.title,
                link: h.link,
                pubDate: h.date,
              }));
            setPublished(map);
            setFeedError('');
          }
        )
        .catch(e => {
          if (!alive) return;
          setFeedError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
          setPublished(cur => cur ?? {});
        });
    void load();
    const timer = setInterval(load, 10 * 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    setActive(0);
    if (topics.length < 2) return;
    const timer = setInterval(() => setActive(i => (i + 1) % topics.length), 20000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const topic = topics[active % Math.max(topics.length, 1)];
  const items = (topic && (published?.[topic.toLowerCase()] ?? byTopic[topic])) || [];
  return (
    <article className="glance-card news">
      <h3>
        <Newspaper size={15} /> News
        <span className="topics">
          {topics.map((t, i) => (
            <i key={t} className={i === active % topics.length ? 'on' : ''}>
              {t}
            </i>
          ))}
        </span>
      </h3>
      {topics
        .filter(t => published !== null && !published[t.toLowerCase()])
        .map((t, n) => (
          <TopicNews
            key={t}
            topic={t}
            delay={n * 6500}
            onItems={list => setByTopic(cur => (cur[t] === list ? cur : { ...cur, [t]: list }))}
          />
        ))}
      <ul className="headlines">
        {items.length ? (
          items.slice(0, 4).map(h => {
            const i = h.title.lastIndexOf(' - ');
            return (
              <li key={h.link}>
                <span>{i > 0 ? h.title.slice(0, i) : h.title}</span>
                {i > 0 && <small>{h.title.slice(i + 3)}</small>}
              </li>
            );
          })
        ) : (
          <li>
            <span>
              {feedError
                ? `Can't load the headline file (${feedError}). Trying live sources…`
                : published === null
                  ? 'Loading headlines…'
                  : 'No headlines for this topic yet.'}
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
