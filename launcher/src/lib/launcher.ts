import { standaloneApi } from './static-backend';

export interface Shortcut {
  id: string;
  name: string;
  mark: string;
  color: string;
  category: string;
  url: string;
  appId: string;
  namespace: number;
  favorite: boolean;
}
export interface Preferences {
  name: string;
  room: string;
  mode: 'browser' | 'tv';
  accent: string;
  launcherName: string;
  background: string;
  backgroundImage: string;
  backgroundVideo: string;
  backgroundVideos?: string[];
  showMarkets?: boolean;
  showDebt?: boolean;
  showNews?: boolean;
  showHistory?: boolean;
  coins?: string[];
  newsTopics?: string[];
  effects: 'off' | 'balanced' | 'rich';
  dimming: number;
  weatherLocation: string;
  weatherEnabled: boolean;
  units: 'fahrenheit' | 'celsius';
  clock24: boolean;
  showRecent: boolean;
  compact: boolean;
}
export const defaults: Shortcut[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    mark: 'N',
    color: '#e50914',
    category: 'Movies & TV',
    url: 'https://www.netflix.com',
    appId: '1',
    namespace: 3,
    favorite: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    mark: '▶',
    color: '#ff3434',
    category: 'Video',
    url: 'https://www.youtube.com/tv',
    appId: '',
    namespace: 0,
    favorite: true,
  },
  {
    id: 'prime',
    name: 'Prime Video',
    mark: 'prime',
    color: '#59c6ff',
    category: 'Movies & TV',
    url: 'https://www.primevideo.com',
    appId: '4',
    namespace: 2,
    favorite: true,
  },
  {
    id: 'hulu',
    name: 'Hulu',
    mark: 'hulu',
    color: '#1ce783',
    category: 'Movies & TV',
    url: 'https://www.hulu.com',
    appId: '3',
    namespace: 2,
    favorite: true,
  },
  {
    id: 'plex',
    name: 'Plex',
    mark: 'plex',
    color: '#e5ad38',
    category: 'Your media',
    url: 'https://app.plex.tv',
    appId: '9',
    namespace: 2,
    favorite: true,
  },
  {
    id: 'disney',
    name: 'Disney+',
    mark: 'Disney+',
    color: '#91c8ff',
    category: 'Movies & TV',
    url: 'https://www.disneyplus.com',
    appId: '',
    namespace: 2,
    favorite: false,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    mark: '◉',
    color: '#1ed760',
    category: 'Music',
    url: 'https://open.spotify.com',
    appId: '',
    namespace: 2,
    favorite: false,
  },
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    mark: '△',
    color: '#b599ff',
    category: 'Your media',
    url: 'http://localhost:8096',
    appId: '',
    namespace: 2,
    favorite: false,
  },
];
export function readSaved<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function validShortcuts(v: unknown): v is Shortcut[] {
  return (
    Array.isArray(v) &&
    v.every(
      a =>
        a &&
        typeof a.id === 'string' &&
        typeof a.name === 'string' &&
        typeof a.mark === 'string' &&
        /^#[0-9a-f]{6}$/i.test(a.color) &&
        typeof a.category === 'string' &&
        typeof a.url === 'string' &&
        typeof a.appId === 'string' &&
        Number.isInteger(a.namespace) &&
        typeof a.favorite === 'boolean'
    )
  );
}
export function validPreferences(v: unknown): v is Preferences {
  const p = v as Preferences;
  return (
    !!p &&
    typeof p.name === 'string' &&
    typeof p.room === 'string' &&
    ['browser', 'tv'].includes(p.mode) &&
    /^#[0-9a-f]{6}$/i.test(p.accent)
  );
}
export async function api(path: string, body?: unknown) {
  return standaloneApi(path, body);
}
