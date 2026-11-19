import type { Preferences } from '../lib/launcher';
import { useEffect, useRef, useState } from 'react';
import { householdUrl } from '../lib/household-service';
export function Backdrop({ prefs }: { prefs: Preferences }) {
  const video = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [errorInfo, setErrorInfo] = useState('');
  const retries = useRef(0);
  // A playlist rotates to the next clip once the current one has played for a minute.
  const playlist = prefs.backgroundVideos?.length
    ? prefs.backgroundVideos
    : prefs.backgroundVideo
      ? [prefs.backgroundVideo]
      : [];
  const listKey = playlist.join('|');
  const [index, setIndex] = useState(0);
  const startedAt = useRef(Date.now());
  const current = playlist.length ? playlist[index % playlist.length] : '';
  useEffect(() => {
    setIndex(0);
  }, [listKey]);
  useEffect(() => {
    let active = true;
    setFailed(false);
    setSource('');
    setAttempt(0);
    retries.current = 0;
    startedAt.current = Date.now();
    if (current)
      void householdUrl(current).then(url => {
        if (active) setSource(url);
      });
    return () => {
      active = false;
    };
  }, [current]);
  useEffect(() => {
    if (prefs.background !== 'video' || !source) return;
    const update = () => {
      if (document.hidden) video.current?.pause();
      else void video.current?.play().catch(() => setFailed(true));
    };
    document.addEventListener('visibilitychange', update);
    update();
    return () => document.removeEventListener('visibilitychange', update);
  }, [source, prefs.background]);
  useEffect(() => {
    if (prefs.background !== 'video' || !source || failed) return;
    const timer = setInterval(() => {
      const v = video.current;
      if (v && !document.hidden && v.paused) void v.play().catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [source, prefs.background, failed, attempt]);
  const onVideoError = () => {
    const e = video.current?.error;
    // Retry a few times before giving up; one hiccup should not end the video for good.
    if (retries.current < 4) {
      retries.current += 1;
      setTimeout(() => setAttempt(a => a + 1), 1200 * retries.current);
      return;
    }
    setErrorInfo(`code ${e?.code ?? '?'}${e?.message ? ', ' + e.message : ''}`);
    setFailed(true);
  };
  return (
    <div className={`scenery scenery-${prefs.background}`} aria-hidden="true">
      {prefs.background === 'video' && source && !failed ? (
        <video
          key={`${source}#${attempt}`}
          ref={video}
          className="video-scenery"
          src={source}
          autoPlay
          muted
          loop={playlist.length < 2}
          playsInline
          preload="auto"
          disablePictureInPicture
          onError={onVideoError}
          onPlaying={() => (retries.current = 0)}
          onEnded={event => {
            if (playlist.length > 1 && Date.now() - startedAt.current >= 60000) {
              setIndex(i => (i + 1) % playlist.length);
              return;
            }
            // Backup for browsers that ignore `loop` on very short clips.
            event.currentTarget.currentTime = 0;
            void event.currentTarget.play().catch(() => {});
          }}
        />
      ) : prefs.background === 'video' ? (
        <div className="ember-glow" />
      ) : prefs.background === 'custom' && prefs.backgroundImage ? (
        <img className="custom-scenery" src={prefs.backgroundImage} alt="" />
      ) : (
        <>
          <div className="sky-glow" />
          <div className="sky-stars" />
          <div className="sky-moon" />
          <div className="aurora-ribbon" />
          <svg className="landscape" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="peakBack" x2="0" y2="1">
                <stop stopColor="var(--ridge-light)" />
                <stop offset="1" stopColor="var(--ridge-dark)" />
              </linearGradient>
              <linearGradient id="peakFront" x2="0" y2="1">
                <stop stopColor="var(--foreground-ridge)" />
                <stop offset="1" stopColor="#0a1024" />
              </linearGradient>
              <linearGradient id="mist">
                <stop stopColor="#b9abdb" stopOpacity="0" />
                <stop offset=".5" stopColor="#b9abdb" stopOpacity=".14" />
                <stop offset="1" stopColor="#b9abdb" stopOpacity="0" />
              </linearGradient>
            </defs>
            {prefs.background === 'dunes' ? (
              <>
                <path fill="url(#peakBack)" d="M0 690Q480 280 1010 640T1920 500V1080H0Z" />
                <path fill="url(#peakFront)" d="M0 790Q600 460 1150 770T1920 660V1080H0Z" />
                <path fill="#281d2d" d="M0 930Q580 650 1140 920T1920 820V1080H0Z" />
              </>
            ) : prefs.background === 'ocean' ? (
              <>
                <path fill="url(#peakBack)" d="M0 620Q400 570 900 620T1920 605V1080H0Z" />
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <path
                    key={i}
                    d={`M0 ${700 + i * 55}Q480 ${640 + i * 55} 960 ${700 + i * 55}T1920 ${700 + i * 55}`}
                    fill="none"
                    stroke="#96e6ed"
                    strokeOpacity={0.11 - i * 0.012}
                    strokeWidth="2"
                  />
                ))}
              </>
            ) : prefs.background === 'cosmos' ? (
              <>
                <circle cx="1450" cy="410" r="210" fill="url(#peakBack)" />
                <ellipse
                  cx="1450"
                  cy="410"
                  rx="330"
                  ry="54"
                  transform="rotate(-22 1450 410)"
                  fill="none"
                  stroke="#bdc8ef"
                  strokeOpacity=".3"
                  strokeWidth="3"
                />
              </>
            ) : (
              <>
                <path
                  fill="url(#peakBack)"
                  d="M0 740L210 500 330 570 630 230 770 410 850 330 1100 660 1260 450 1380 550 1530 330 1720 590 1830 490 1920 590V1080H0Z"
                />
                <path
                  fill="#e5d9ef"
                  opacity=".25"
                  d="M630 230L525 390 595 355 630 378 668 335 710 362ZM1530 330L1440 463 1510 430 1550 452 1570 412 1615 448Z"
                />
                <path
                  fill="url(#peakFront)"
                  d="M0 830L180 730 360 790 620 590 790 760 910 710 1170 870 1440 620 1700 800 1920 710V1080H0Z"
                />
                <path fill="url(#mist)" d="M0 785Q600 710 1100 790T1920 750V900H0Z" />
                <path
                  fill="#090f20"
                  opacity=".8"
                  d="M0 1030L70 940 85 965 110 880 155 990 240 1015 340 975 500 1020 650 980 900 1040 1120 995 1380 1040 1650 960 1730 990 1775 875 1800 960 1840 920 1880 1005 1920 960V1080H0Z"
                />
              </>
            )}
          </svg>
        </>
      )}
      <div className="scenery-shade" style={{ opacity: prefs.dimming / 100 }} />
      <div className="scenery-vignette" />
      {prefs.background === 'video' && failed && (
        <span className="video-fallback-note">
          Video couldn’t play{errorInfo ? ` (${errorInfo})` : ''}. Choose an H.264 MP4 in Settings.
        </span>
      )}
    </div>
  );
}
