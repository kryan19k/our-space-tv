import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { AppLogo } from '../AppLogo';
import {
  Home,
  Grid2X2,
  Heart,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Monitor,
  Star,
  Pencil,
  Trash2,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  Expand,
  Palette,
  Moon,
  Clock3,
} from 'lucide-react';
import { useHousehold } from '../../hooks/use-household';
import { Backdrop } from '../Backdrop';
import { Weather } from '../Weather';
import { Glance } from '../Glance';
import { AppearanceSettings } from '../AppearanceSettings';
import { StartupSettings } from '../StartupSettings';
import {
  api,
  defaults,
  readSaved,
  validPreferences,
  validShortcuts,
  type Preferences,
  type Shortcut,
} from '../../lib/launcher';
import { useRemote } from '../../hooks/use-remote';
type Page = 'home' | 'apps' | 'favorites' | 'settings';
const blank: Shortcut = {
  id: '',
  name: '',
  mark: '',
  color: '#77e7da',
  category: 'Your media',
  url: '',
  appId: '',
  namespace: 2,
  favorite: false,
};

export function Homescreen() {
  const [apps, setApps] = useState(() => readSaved('quiet.apps.v1', defaults, validShortcuts));
  const { prefs, setPrefs, sync } = useHousehold();
  const [ambient, setAmbient] = useState(false);
  const ambientExit = useRef<HTMLButtonElement>(null);
  const [recent, setRecent] = useState(() =>
    readSaved<string[]>(
      'quiet.recent.v1',
      [],
      (v): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')
    )
  );
  const [page, setPage] = useState<Page>('home');
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(new Date());
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<Shortcut | null>(null);
  const [managing, setManaging] = useState(false);
  const [connected, setConnected] = useState(false);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('7345');
  const [pin, setPin] = useState('');
  const [pairing, setPairing] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useRemote();
  useEffect(() => {
    document.title = `${prefs.launcherName} — Welcome home`;
  }, [prefs.launcherName]);
  useEffect(() => {
    if (!ambient) return;
    ambientExit.current?.focus();
    const exit = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.keyCode === 10009) {
        event.preventDefault();
        setAmbient(false);
      }
    };
    document.addEventListener('keydown', exit);
    return () => document.removeEventListener('keydown', exit);
  }, [ambient]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    try {
      localStorage.setItem('quiet.apps.v1', JSON.stringify(apps));
      localStorage.setItem('quiet.preferences.v1', JSON.stringify(prefs));
      localStorage.setItem('quiet.recent.v1', JSON.stringify(recent));
    } catch {
      setNotice('Storage is unavailable. Changes will last for this session.');
    }
  }, [apps, prefs, recent]);
  useEffect(() => {
    api('status')
      .then(s => {
        setConnected(Boolean(s.paired));
        setHost(String(s.host ?? ''));
        setPort(String(s.port));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (editing) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editing]);
  const navigate = (next: Page) => {
    setPage(next);
    setQuery('');
    setManaging(false);
    window.scrollTo(0, 0);
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  const launch = (app: Shortcut) =>
    void run(async () => {
      if (prefs.mode === 'tv') {
        if (!app.appId) {
          setNotice(`Set the SmartCast app ID for ${app.name} in Edit apps first.`);
          return;
        }
        await api('launch', { appId: app.appId, namespace: app.namespace });
        setNotice(`Launch command accepted for ${app.name}.`);
      } else {
        const url = new URL(app.url);
        if (!['http:', 'https:'].includes(url.protocol))
          throw new Error('Use an HTTP or HTTPS address.');
        window.open(url.href, '_blank', 'noopener,noreferrer');
        setNotice(`Opened ${app.name} in a browser tab. If no tab appeared, allow pop-ups.`);
      }
      setRecent(current => [app.id, ...current.filter(id => id !== app.id)].slice(0, 6));
    });
  const favorite = (id: string) =>
    setApps(current => current.map(a => (a.id === id ? { ...a, favorite: !a.favorite } : a)));
  const saveApp = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      const url = new URL(editing.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      const saved = {
        ...editing,
        id:
          editing.id ||
          (crypto.randomUUID?.() ?? `app-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        name: editing.name.trim(),
        mark: editing.mark.trim() || editing.name.slice(0, 2),
        url: url.href,
      };
      if (!saved.name) throw new Error();
      setApps(current =>
        current.some(a => a.id === saved.id)
          ? current.map(a => (a.id === saved.id ? saved : a))
          : [...current, saved]
      );
      setEditing(null);
    } catch {
      setNotice('Enter an app name and a valid HTTP or HTTPS address.');
    }
  };
  const shown = apps.filter(
    a =>
      (page !== 'favorites' || a.favorite) &&
      `${a.name} ${a.category}`.toLowerCase().includes(query.toLowerCase())
  );
  const hour = now.getHours();
  const card = (app: Shortcut) => (
    <article className="app-card" key={app.id} style={{ '--brand': app.color } as CSSProperties}>
      <button
        className="app-launch"
        disabled={busy}
        onClick={() => launch(app)}
        onPointerMove={event => {
          if (prefs.effects !== 'rich') return;
          const r = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty(
            '--tilt-x',
            `${(0.5 - (event.clientY - r.top) / r.height) * 10}deg`
          );
          event.currentTarget.style.setProperty(
            '--tilt-y',
            `${((event.clientX - r.left) / r.width - 0.5) * 12}deg`
          );
        }}
        onPointerLeave={event => {
          event.currentTarget.style.removeProperty('--tilt-x');
          event.currentTarget.style.removeProperty('--tilt-y');
        }}
        aria-label={`Open ${app.name}`}
      >
        <AppLogo app={app} className={`app-mark ${app.id}`} />
        <span className="launch-corner">
          <ArrowUpRight size={20} />
        </span>
      </button>
      <div className="app-caption">
        <div>
          <h3>{app.name}</h3>
          <p>{app.category}</p>
        </div>
        <button
          className="icon-button favorite"
          data-nav-skip={managing ? undefined : 'true'}
          aria-label={`${app.favorite ? 'Unpin' : 'Pin'} ${app.name}`}
          aria-pressed={app.favorite}
          onClick={() => favorite(app.id)}
        >
          <Star size={17} fill={app.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      {managing && (
        <div className="edit-actions">
          <button onClick={() => setEditing({ ...app })}>
            <Pencil size={14} /> Edit
          </button>
          <button
            aria-label={`Remove ${app.name}`}
            onClick={() => {
              setApps(current => current.filter(a => a.id !== app.id));
              setRecent(current => current.filter(id => id !== app.id));
            }}
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      )}
    </article>
  );
  return (
    <div
      className={`launcher enhanced effects-${prefs.effects} ${prefs.compact ? 'compact-home' : ''}`}
      style={{ '--accent': prefs.accent } as CSSProperties}
    >
      <Backdrop prefs={prefs} />
      <aside className="sidebar" inert={ambient}>
        <button
          className="logo"
          onClick={() => navigate('home')}
          aria-label={`${prefs.launcherName} home`}
        >
          <span className="brand-spark">✦</span>
        </button>
        <nav aria-label="Main navigation">
          {(
            [
              { id: 'home', label: 'Home', icon: Home },
              { id: 'apps', label: 'All apps', icon: Grid2X2 },
              { id: 'favorites', label: 'Favorites', icon: Heart },
            ] as const
          ).map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={23} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          className={`nav-item settings-nav ${page === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}
        >
          <Settings size={23} />
          <span>Settings</span>
        </button>
        <span className="sidebar-line" />
        <span className="version">{prefs.launcherName.toUpperCase()}</span>
      </aside>
      <main className="content" inert={ambient}>
        <header className="topbar">
          <div className="room">
            <Monitor size={17} />
            <span>{prefs.room}</span>
            <span className="room-divider">/</span>
            <span>YOUR SPACE, YOUR RULES</span>
          </div>
          <div className="top-right">
            <Weather prefs={prefs} compact onConfigure={() => navigate('settings')} />
            <button className="connection" onClick={() => navigate('settings')}>
              <i className={connected ? 'paired' : ''} />
              {connected ? 'TV paired' : 'Browser mode / TV setup'}
            </button>
            <time>
              {now.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: !prefs.clock24,
              })}
            </time>
            <button
              className="avatar"
              onClick={() => navigate('settings')}
              aria-label="Profile settings"
            >
              {prefs.name.slice(0, 1).toUpperCase() || 'Q'}
            </button>
          </div>
        </header>
        {page !== 'settings' ? (
          <>
            <section className="greeting">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow-line" />
                  {prefs.launcherName.toUpperCase()}{' '}
                  <span className="eyebrow-note">/ MAKE YOURSELF AT HOME</span>
                </p>
                <h1>
                  {page === 'home' ? (
                    <>
                      Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'},{' '}
                      <span>{prefs.name || 'friend'}.</span>
                    </>
                  ) : page === 'favorites' ? (
                    <>
                      Only your <span>favorites.</span>
                    </>
                  ) : (
                    <>
                      All your apps. <span>One quiet place.</span>
                    </>
                  )}
                </h1>
                <p className="subtitle">
                  {page === 'home'
                    ? 'A familiar place. A little space to unwind.'
                    : 'No recommendations. No sponsored rows. Just what you choose.'}
                </p>
              </div>
              <span className="date">
                {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </section>
            {page === 'home' && !query && (
              <Glance prefs={prefs}>
                <Weather prefs={prefs} onConfigure={() => navigate('settings')} />
                {!prefs.weatherEnabled && (
                  <div className="hero-clock glance-card">
                    <Clock3 size={24} />
                    <strong>
                      {now.toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: !prefs.clock24,
                      })}
                    </strong>
                    <span>
                      {now.toLocaleDateString([], {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </Glance>
            )}
            {page === 'home' && !query && (
              <div className="home-tools">
                <span className="view-caption">
                  <span className="live-dot" />{' '}
                  {prefs.background === 'video'
                    ? 'Your living background'
                    : prefs.background === 'custom'
                      ? 'Your own view'
                      : (
                          {
                            alpine: 'Alpine dusk',
                            aurora: 'Northern lights',
                            dunes: 'Desert glow',
                            ocean: 'Blue hour',
                            cosmos: 'Deep space',
                          } as Record<string, string>
                        )[prefs.background]}
                </span>
                <div>
                  <button onClick={() => setAmbient(true)}>
                    <Moon size={16} />
                    Ambient view
                  </button>
                  <button onClick={() => navigate('settings')}>
                    <Palette size={16} />
                    Customize your space
                  </button>
                </div>
              </div>
            )}
            <section className="apps-section">
              <div className="section-heading">
                <div>
                  <h2>
                    {query
                      ? 'Search results'
                      : page === 'home'
                        ? 'Your favorites'
                        : page === 'favorites'
                          ? 'Pinned by you'
                          : 'Your app library'}{' '}
                    <span>
                      {(page === 'home' && !query ? shown.filter(a => a.favorite) : shown).length
                        .toString()
                        .padStart(2, '0')}
                    </span>
                  </h2>
                  <p>
                    {page === 'home'
                      ? 'The things you actually came here for.'
                      : 'Choose an app to get started.'}
                  </p>
                </div>
                <div className="section-actions">
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search apps"
                      placeholder="Find an app"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                  </label>
                  <button className="text-button" onClick={() => setManaging(!managing)}>
                    <Pencil size={15} />
                    {managing ? 'Done editing' : 'Edit apps'}
                  </button>
                </div>
              </div>
              <div className="apps-grid">
                {(page === 'home' && !query ? shown.filter(a => a.favorite) : shown).map(card)}
                <button className="add-app" onClick={() => setEditing({ ...blank })}>
                  <span>
                    <Plus size={28} />
                  </span>
                  <strong>Add an app</strong>
                  <small>Make yourself at home</small>
                </button>
              </div>
              {shown.length === 0 && (
                <p className="empty">No apps here yet. Add a shortcut or try another search.</p>
              )}
            </section>
            {page === 'home' && !query && prefs.showRecent && (
              <section className="recent-section">
                <div className="section-heading">
                  <div>
                    <h2>Recently opened</h2>
                    <p>Pick up where you left off.</p>
                  </div>
                  {recent.length > 0 && (
                    <button className="text-button" onClick={() => setRecent([])}>
                      Clear history
                    </button>
                  )}
                </div>
                {recent.length ? (
                  <div className="recent-list">
                    {recent
                      .map(id => apps.find(a => a.id === id))
                      .filter((a): a is Shortcut => !!a)
                      .map(app => (
                        <button key={app.id} onClick={() => launch(app)} disabled={busy}>
                          <AppLogo app={app} className="recent-mark" />
                          <span>
                            {app.name}
                            <small>Open app</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="recent-empty">
                    <Monitor size={20} />
                    <span>A fresh start. Apps you open will appear here.</span>
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <section className="settings-page">
            <p className="eyebrow">MAKE IT YOURS</p>
            <h1>
              A little more <span>personal.</span>
            </h1>
            <div className="settings-grid">
              <AppearanceSettings prefs={prefs} onChange={setPrefs} sync={sync} />
              <StartupSettings />
              <section className="settings-panel">
                <h2>A home for everyone</h2>
                <label>
                  Launcher name
                  <input
                    value={prefs.launcherName}
                    maxLength={40}
                    onChange={e => setPrefs({ ...prefs, launcherName: e.target.value })}
                  />
                </label>
                <label>
                  Greeting name
                  <input
                    value={prefs.name}
                    maxLength={35}
                    onChange={e => setPrefs({ ...prefs, name: e.target.value })}
                  />
                </label>
                <label>
                  Room name
                  <input
                    value={prefs.room}
                    maxLength={40}
                    onChange={e => setPrefs({ ...prefs, room: e.target.value })}
                  />
                </label>
                <label>
                  Accent color
                  <input
                    type="color"
                    value={prefs.accent}
                    onChange={e => setPrefs({ ...prefs, accent: e.target.value })}
                  />
                </label>
                <label>
                  Launch apps on
                  <select
                    value={prefs.mode}
                    onChange={e =>
                      setPrefs({ ...prefs, mode: e.target.value as Preferences['mode'] })
                    }
                  >
                    <option value="browser">This browser</option>
                    <option value="tv">Vizio TV through local bridge</option>
                  </select>
                </label>
                <p>
                  Use “everyone,” a family name, or whatever feels like home. Appearance and weather
                  settings sync between this computer and the TV.
                </p>
              </section>
              <section className="settings-panel">
                <h2>Connect your Vizio</h2>
                <p>V4K55M-0804 · SmartCast. The local bridge must be running on this computer.</p>
                <label>
                  TV IP address
                  <input
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    placeholder="192.168.1.50"
                  />
                </label>
                <label>
                  SmartCast HTTPS port
                  <select value={port} onChange={e => setPort(e.target.value)}>
                    <option value="7345">7345 (current firmware)</option>
                    <option value="9000">9000 (older firmware)</option>
                  </select>
                </label>
                <div className="button-row">
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api('configure', { host, port: Number(port) });
                        setConnected(false);
                        setPairing(false);
                        await api('probe', {});
                        setNotice('TV responded. Start pairing to connect.');
                      })
                    }
                  >
                    Test connection
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api('configure', { host, port: Number(port) });
                        setConnected(false);
                        await api('pair/start', {});
                        setPairing(true);
                        setNotice('Enter the pairing PIN shown on your TV.');
                      })
                    }
                  >
                    Start pairing
                  </button>
                </div>
                {pairing && (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      void run(async () => {
                        await api('pair/finish', { pin });
                        setConnected(true);
                        setPairing(false);
                        setPin('');
                        setPrefs(current => ({ ...current, mode: 'tv' }));
                        setNotice('Paired. App launches now go to your TV.');
                      });
                    }}
                  >
                    <label>
                      PIN on TV
                      <input
                        value={pin}
                        inputMode="numeric"
                        autoComplete="off"
                        onChange={e => setPin(e.target.value)}
                        required
                      />
                    </label>
                    <button className="primary-button" disabled={busy}>
                      Complete pairing
                    </button>
                  </form>
                )}
                <div className="button-row">
                  <button
                    disabled={busy || !connected}
                    onClick={() =>
                      void run(async () => {
                        await api('remote', { command: 'volumeDown' });
                      })
                    }
                  >
                    <Volume2 size={16} /> −
                  </button>
                  <button
                    disabled={busy || !connected}
                    onClick={() =>
                      void run(async () => {
                        await api('remote', { command: 'volumeUp' });
                      })
                    }
                  >
                    <Volume2 size={16} /> +
                  </button>
                  <button
                    disabled={busy || !connected}
                    onClick={() =>
                      void run(async () => {
                        await api('remote', { command: 'mute' });
                      })
                    }
                  >
                    <VolumeX size={16} /> Mute
                  </button>
                </div>
                <p>
                  The launcher runs through this computer. The Vizio Home button still opens the
                  TV’s original home screen.
                </p>
              </section>
            </div>
          </section>
        )}
        <footer>
          <span>
            <ShieldCheck size={15} /> Ad-free by design<span className="footer-dot">·</span>Made for
            your living room
          </span>
          <div>
            <span className="remote-hint">
              ↑ ↓ ← → Navigate <kbd>OK</kbd> Open
            </span>
            <button
              className="icon-button"
              aria-label="Toggle fullscreen"
              onClick={() =>
                void run(async () => {
                  if (document.fullscreenElement) await document.exitFullscreen();
                  else await document.documentElement.requestFullscreen();
                })
              }
            >
              <Expand size={17} />
            </button>
          </div>
        </footer>
      </main>
      {ambient && (
        <section className="ambient-view" aria-label="Ambient clock">
          <p className="eyebrow">{prefs.launcherName.toUpperCase()}</p>
          <time>
            {now.toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
              hour12: !prefs.clock24,
            })}
          </time>
          <p>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <Weather
            prefs={prefs}
            compact
            onConfigure={() => {
              setAmbient(false);
              navigate('settings');
            }}
          />
          <button ref={ambientExit} className="secondary-button" onClick={() => setAmbient(false)}>
            Back to your apps <ArrowUpRight size={16} />
          </button>
          <small>Press OK or Back to return</small>
        </section>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={18} />
          </button>
        </div>
      )}
      <dialog ref={dialog} onCancel={() => setEditing(null)} onClose={() => setEditing(null)}>
        <form onSubmit={saveApp}>
          {editing && (
            <>
              <div className="dialog-heading">
                <h2>{editing.id ? 'Edit your app' : 'A new favorite.'}</h2>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Close editor"
                  onClick={() => setEditing(null)}
                >
                  <X />
                </button>
              </div>
              <label>
                App name
                <input
                  autoFocus
                  required
                  maxLength={40}
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label>
                Website address
                <input
                  type="url"
                  required
                  value={editing.url}
                  onChange={e => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://…"
                />
              </label>
              <div className="form-row">
                <label>
                  Tile lettering
                  <input
                    maxLength={10}
                    value={editing.mark}
                    onChange={e => setEditing({ ...editing, mark: e.target.value })}
                  />
                </label>
                <label>
                  Color
                  <input
                    type="color"
                    value={editing.color}
                    onChange={e => setEditing({ ...editing, color: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Category
                <select
                  value={editing.category}
                  onChange={e => setEditing({ ...editing, category: e.target.value })}
                >
                  {['Movies & TV', 'Video', 'Music', 'Your media', 'Other'].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <details>
                <summary>SmartCast launch configuration</summary>
                <p>App IDs vary by firmware. Verify these values for your TV.</p>
                <div className="form-row">
                  <label>
                    App ID
                    <input
                      value={editing.appId}
                      onChange={e => setEditing({ ...editing, appId: e.target.value })}
                    />
                  </label>
                  <label>
                    Namespace
                    <input
                      type="number"
                      min="0"
                      max="10"
                      required
                      value={editing.namespace}
                      onChange={e => setEditing({ ...editing, namespace: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </details>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={editing.favorite}
                  onChange={e => setEditing({ ...editing, favorite: e.target.checked })}
                />{' '}
                Pin to home
              </label>
              <button className="primary-button" type="submit">
                Save app <ArrowUpRight size={18} />
              </button>
            </>
          )}
        </form>
      </dialog>
    </div>
  );
}
