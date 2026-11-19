import { readSaved, validPreferences, type Preferences } from './launcher';

export const themes = [
  {
    id: 'alpine',
    name: 'Alpine dusk',
    description: 'Quiet peaks, soft lavender skies',
    accent: '#c9c3ff',
  },
  {
    id: 'aurora',
    name: 'Northern lights',
    description: 'Emerald light across a midnight sky',
    accent: '#83ead1',
  },
  {
    id: 'dunes',
    name: 'Desert glow',
    description: 'Warm sand and the last light of day',
    accent: '#f1c397',
  },
  {
    id: 'ocean',
    name: 'Blue hour',
    description: 'Deep water, a little room to breathe',
    accent: '#9cdbf0',
  },
  {
    id: 'cosmos',
    name: 'Deep space',
    description: 'A small window into the universe',
    accent: '#b4bfff',
  },
] as const;

export const appearanceDefaults = {
  name: 'everyone',
  launcherName: 'Our Space',
  room: 'Living room',
  accent: '#c9c3ff',
  background: 'alpine',
  backgroundImage: '',
  backgroundVideo: '',
  effects: 'balanced',
  dimming: 35,
  // No location ships with the app; it is set from the phone remote and stored on the TV.
  weatherLocation: '',
  weatherEnabled: false,
  units: 'fahrenheit',
  clock24: false,
  showRecent: true,
  compact: false,
};
export function loadPreferences(): Preferences {
  const old = readSaved<Preferences | null>(
    'quiet.preferences.v1',
    null,
    (v): v is Preferences | null => v === null || validPreferences(v)
  );
  return {
    ...appearanceDefaults,
    ...old,
    name: old?.name || 'everyone',
    mode:
      new URLSearchParams(window.location.search).get('tv') === '1' ? 'tv' : old?.mode || 'browser',
  } as Preferences;
}
export function sharedAppearance(p: Preferences) {
  const { mode: _mode, ...shared } = p;
  return shared;
}
