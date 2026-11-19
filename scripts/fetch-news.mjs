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
for (const topic of topics) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic + ' when:2d')}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(String(res.status));
    const xml = await res.text();
    const seen = new Set();
    out.topics[topic] = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map(m => {
        const full = pick(m[1], 'title');
        const source = pick(m[1], 'source');
        const title = source && full.endsWith(' - ' + source) ? full.slice(0, -(source.length + 3)) : full;
        return { title, source, link: pick(m[1], 'link'), date: pick(m[1], 'pubDate') };
      })
      .filter(h => h.title && !seen.has(h.title) && seen.add(h.title))
      .slice(0, 8);
    console.log(topic, out.topics[topic].length);
  } catch (e) {
    console.error('failed', topic, e.message);
  }
  await new Promise(r => setTimeout(r, 1500));
}
if (!Object.keys(out.topics).length) process.exit(1);
writeFileSync(new URL('../news.json', import.meta.url), JSON.stringify(out));
