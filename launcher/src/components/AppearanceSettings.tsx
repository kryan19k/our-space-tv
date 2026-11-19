import { useRef, useState } from 'react';
import { Check, ImagePlus, Palette, CloudSun, LayoutGrid, Film, Sparkles } from 'lucide-react';
import { householdFetch } from '../lib/household-service';
import { themes } from '../lib/appearance';
import type { Preferences } from '../lib/launcher';
interface Props {
  prefs: Preferences;
  onChange: (p: Preferences) => void;
  sync: string;
}
export function AppearanceSettings({ prefs, onChange, sync }: Props) {
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const latest = useRef(prefs);
  latest.current = prefs;
  const [videoUrl, setVideoUrl] = useState(
    prefs.backgroundVideo.startsWith('https://') ? prefs.backgroundVideo : ''
  );
  const update = (patch: Partial<Preferences>) => onChange({ ...prefs, ...patch });
  async function upload(file?: File) {
    if (!file) return;
    try {
      setError('');
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 15 * 1024 * 1024
      )
        throw new Error('Choose a JPG, PNG, or WebP photo under 15 MB.');
      const source = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = source;
        await image.decode();
        const scale = Math.min(1, 1920 / image.width, 1080 / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Photo processing is unavailable on this screen.');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.8);
        if (data.length > 1800000)
          throw new Error('This photo is too detailed. Try a smaller image.');
        update({ background: 'custom', backgroundImage: data });
      } finally {
        URL.revokeObjectURL(source);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this photo.');
    }
  }
  return (
    <section className="appearance-settings settings-panel">
      <div className="settings-section-title">
        <Palette size={21} />
        <div>
          <h2>Set the mood</h2>
          <p>A view worth coming home to.</p>
        </div>
        <span className="sync-status">{sync}</span>
      </div>
      <div className="theme-picker" aria-label="Background themes">
        {themes.map(theme => (
          <button
            key={theme.id}
            className={`theme-option theme-${theme.id}`}
            aria-label={`${theme.name} background`}
            aria-pressed={prefs.background === theme.id}
            onClick={() => update({ background: theme.id, accent: theme.accent })}
          >
            <span className="theme-sample">
              <span className="sample-moon" />
              <span className="sample-ridge" />
              {prefs.background === theme.id && <Check size={18} />}
            </span>
            <strong>{theme.name}</strong>
            <small>{theme.description}</small>
          </button>
        ))}
      </div>
      <div className="wallpaper-controls">
        <div>
          <button className="secondary-button" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={17} />
            Use your own photo
          </button>
          <input
            ref={fileRef}
            className="file-input"
            tabIndex={-1}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload background photo"
            onChange={e => {
              void upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <p>Choose a photo from this computer. It will appear on the TV too.</p>
          {prefs.backgroundImage && (
            <div className="button-row">
              <button onClick={() => update({ background: 'custom' })}>Use saved photo</button>
              <button
                onClick={() =>
                  update({
                    backgroundImage: '',
                    background: prefs.background === 'custom' ? 'alpine' : prefs.background,
                  })
                }
              >
                Remove photo
              </button>
            </div>
          )}
        </div>
        <label>
          Background dimming <span>{prefs.dimming}%</span>
          <input
            type="range"
            min="0"
            max="80"
            step="5"
            value={prefs.dimming}
            onChange={e => update({ dimming: Number(e.target.value) })}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="video-settings">
        <div className="settings-section-title">
          <Film size={21} />
          <div>
            <h3>Bring the background to life</h3>
            <p>Ocean waves, a fireplace, slow clouds. Your own little escape.</p>
          </div>
        </div>
        <div className="video-actions">
          <>
            <input
              value={videoUrl}
              inputMode="url"
              autoCapitalize="off"
              placeholder="https://… .mp4 or .webm"
              aria-label="Looping background video web address"
              onChange={e => setVideoUrl(e.target.value)}
            />
            <button
              className="secondary-button"
              disabled={!/^https:\/\/\S+$/i.test(videoUrl.trim())}
              onClick={() => update({ background: 'video', backgroundVideo: videoUrl.trim() })}
            >
              <Film size={17} />
              Use this video
            </button>
          </>
          {prefs.backgroundVideo && (
            <>
              <button className="secondary-button" onClick={() => update({ background: 'video' })}>
                Use saved video
              </button>
              <button
                className="text-button"
                onClick={() =>
                  update({
                    background: prefs.background === 'video' ? 'alpine' : prefs.background,
                    backgroundVideo: '',
                  })
                }
              >
                Disconnect video
              </button>
            </>
          )}
        </div>
        <p>
          {
            'Loops silently, with no player controls. Paste the web address of an H.264 MP4 or WebM (up to 1080p works best). The video streams from that address; nothing is uploaded.'
          }
        </p>
        <label>
          <span>
            <Sparkles size={16} />
            Glass & motion
          </span>
          <select
            value={prefs.effects}
            onChange={e => update({ effects: e.target.value as Preferences['effects'] })}
          >
            <option value="balanced">Balanced · soft glass and gentle motion</option>
            <option value="rich">Cinematic · deeper glass, light sweeps and 3D</option>
            <option value="off">Still · no decorative motion or blur</option>
          </select>
        </label>
      </div>
      <div className="appearance-options">
        <section>
          <div className="settings-section-title">
            <CloudSun size={20} />
            <h3>Local weather</h3>
          </div>
          <label>
            City or ZIP code
            <input
              maxLength={80}
              value={prefs.weatherLocation}
              onChange={e => update({ weatherLocation: e.target.value })}
              placeholder="ZIP code, or city and state"
            />
          </label>
          <label>
            Temperature
            <select
              value={prefs.units}
              onChange={e => update({ units: e.target.value as Preferences['units'] })}
            >
              <option value="fahrenheit">Fahrenheit · °F</option>
              <option value="celsius">Celsius · °C</option>
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={prefs.weatherEnabled}
              onChange={e => update({ weatherEnabled: e.target.checked })}
            />
            Show local weather
          </label>
          <p>
            Your selected location is used by Open-Meteo and the National Weather Service for local
            weather. No GPS access is needed.
          </p>
        </section>
        <section>
          <div className="settings-section-title">
            <LayoutGrid size={20} />
            <h3>Your layout</h3>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={prefs.clock24}
              onChange={e => update({ clock24: e.target.checked })}
            />
            24-hour clock
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={prefs.showRecent}
              onChange={e => update({ showRecent: e.target.checked })}
            />
            Show recently opened apps
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={prefs.compact}
              onChange={e => update({ compact: e.target.checked })}
            />
            Compact home screen
          </label>
          <p>
            Compact mode gives your apps more room. Ambient view turns the screen into a quiet
            clock.
          </p>
        </section>
      </div>
    </section>
  );
}
