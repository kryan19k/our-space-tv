import { useEffect, useRef, useState } from 'react';
import { loadPreferences, sharedAppearance } from '../lib/appearance';
import type { Preferences } from '../lib/launcher';
import { householdFetch } from '../lib/household-service';

export function useHousehold() {
  const [prefs, setPrefs] = useState(loadPreferences);
  const [sync, setSync] = useState('Connecting…');
  const [ready, setReady] = useState(false);
  const last = useRef('');
  const current = useRef(prefs);
  current.current = prefs;
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await householdFetch('/api/household', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!alive) return;
        const encoded = JSON.stringify(data);
        // Keep an unsaved local edit until its debounced write has completed.
        const local = JSON.stringify(sharedAppearance(current.current));
        if (!last.current || local === last.current) {
          last.current = encoded;
          setPrefs(previous => ({ ...previous, ...data, mode: previous.mode }));
          setSync('Synced with your TV');
        } else {
          setSync('Saving changes…');
        }
      } catch {
        if (alive) setSync('Saved on this screen');
      } finally {
        if (alive) setReady(true);
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const encoded = JSON.stringify(sharedAppearance(prefs));
    if (encoded === last.current) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const save = async () => {
      try {
        setSync('Saving…');
        const response = await householdFetch('/api/household', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: encoded,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        last.current = encoded;
        setSync('Synced with your TV');
      } catch {
        if (!controller.signal.aborted) {
          setSync('Saved on this screen · retrying sync');
          timer = setTimeout(save, 5000);
        }
      }
    };
    timer = setTimeout(save, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [prefs, ready]);
  return { prefs, setPrefs, sync };
}
