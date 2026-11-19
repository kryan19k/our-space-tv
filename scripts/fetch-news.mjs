// Fetches Google News headlines for each topic in news-topics.json and writes news.json.
// Runs on a schedule in GitHub Actions (see .github/workflows/news.yml); the TV and phone read the result.
import { readFileSync, writeFileSync } from 'node:fs';

const topics = JSON.parse(readFileSync(new URL('../news-topics.json', import.meta.url), 'utf8'));
const decode = s =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
const pick = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]) : '';
};
const out = { updated: new Date().toISOString(), topics: {} };
const dedupe = list => {
  const seen = new Set();
  return list.filter(h => h.title && !seen.has(h.title) && seen.add(h.title)).slice(0, 8);
};
async function fromGoogle(topic) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic + ' when:2d')}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Google News ${res.status}`);
  const xml = await res.text();
  return dedupe(
    [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
      const full = pick(m[1], 'title');
      const source = pick(m[1], 'source');
      const title = source && full.endsWith(' - ' + source) ? full.slice(0, -(source.length + 3)) : full;
      return { title, source, link: pick(m[1], 'link'), date: pick(m[1], 'pubDate') };
    })
  );
}
// Backup source. The key is a repository secret (NEWSAPI_KEY) and is never written to any file.
async function fromNewsApi(topic) {
  const key = process.env.NEWSAPI_KEY;
  if (!key) throw new Error('no NEWSAPI_KEY set');
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=en&sortBy=publishedAt&pageSize=20`;
  const res = await fetch(url, { headers: { 'X-Api-Key': key } });
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
  const json = await res.json();
  return dedupe(
    (json.articles ?? []).map(a => ({
      title: (a.title ?? '').replace(/\s+-\s+[^-]+$/, ''),
      source: a.source?.name ?? '',
      link: a.url,
      date: a.publishedAt,
    }))
  );
}
for (const topic of topics) {
  let list = [];
  for (const [name, load] of [['Google News', fromGoogle], ['NewsAPI', fromNewsApi]]) {
    try {
      list = await load(topic);
      if (list.length) {
        console.log(topic, list.length, 'via', name);
        break;
      }
    } catch (e) {
      console.error(topic, name, 'failed:', e.message);
    }
  }
  if (list.length) out.topics[topic] = list;
  await new Promise(r => setTimeout(r, 1500));
}
if (!Object.keys(out.topics).length) process.exit(1);
writeFileSync(new URL('../news.json', import.meta.url), JSON.stringify(out));
