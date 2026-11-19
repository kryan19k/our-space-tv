import { useState } from 'react';
import type { Shortcut } from '../lib/launcher';

// Real brand logos live in /logos (single-color SVGs). Unknown apps keep their text mark.
const FILES: [RegExp, string][] = [
  [/netflix/, 'netflix'],
  [/youtube/, 'youtube'],
  [/prime|amazon/, 'primevideo'],
  [/hulu/, 'hulu'],
  [/plex/, 'plex'],
  [/spotify/, 'spotify'],
  [/jellyfin/, 'jellyfin'],
  [/\bmax\b|hbo/, 'max'],
  [/apple\s?tv/, 'appletv'],
  [/paramount/, 'paramountplus'],
  [/twitch/, 'twitch'],
  [/crunchyroll/, 'crunchyroll'],
  [/tubi/, 'tubi'],
  [/kodi/, 'kodi'],
];
export function logoFile(app: Pick<Shortcut, 'id' | 'name'>) {
  const key = `${app.id} ${app.name}`.toLowerCase();
  return FILES.find(([re]) => re.test(key))?.[1];
}
export function AppLogo({
  app,
  className = '',
  mark,
}: {
  app: Shortcut;
  className?: string;
  mark?: string;
}) {
  const file = logoFile(app);
  const [broken, setBroken] = useState(false);
  if (!file || broken) return <span className={className}>{mark ?? app.mark}</span>;
  return (
    <span className={`${className} has-logo`}>
      <img
        className={`app-logo logo-${file}`}
        src={`${import.meta.env.BASE_URL}logos/${file}.svg`}
        alt=""
        draggable={false}
        onError={() => setBroken(true)}
      />
    </span>
  );
}
