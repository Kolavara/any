import { useRef, useState, useCallback, useEffect } from 'react';
import CosmicCanvas from './CosmicCanvas.jsx';
import FrostCanvas from './FrostCanvas.jsx';
import Letter from './Letter.jsx';
import { useChime } from './useChime.js';

export default function App() {
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const revealProgress = useRef(0);
  const cursorRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [letterVisible, setLetterVisible] = useState(false);
  const [frostHidden, setFrostHidden] = useState(false);
  const [chimePlayed, setChimePlayed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [pressing, setPressing] = useState(false);

  const { playReveal, unlock } = useChime();

  useEffect(() => {
    const onMove = e => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + 'px';
        cursorRef.current.style.top = e.clientY + 'px';
      }
    };
    const onTouch = e => {
      const t = e.touches[0];
      if (t) {
        mouseRef.current = { x: t.clientX, y: t.clientY };
        if (cursorRef.current) {
          cursorRef.current.style.left = t.clientX + 'px';
          cursorRef.current.style.top = t.clientY + 'px';
        }
      }
    };
    const onDown = (e) => {
      setPressing(true);
      const src = e.touches ? e.touches[0] : e;
      const x = src?.clientX;
      const y = src?.clientY;
      if (x != null && y != null) {
        const id = Date.now() + Math.random();
        setRipples(prev => [...prev, { id, x, y }]);
        setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
      }
    };
    const onUp = () => setPressing(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchstart', onDown);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!hasInteracted) { unlock(); setHasInteracted(true); }
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('touchstart', handler);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [hasInteracted, unlock]);

  const handleProgress = useCallback(prog => {
    revealProgress.current = prog;
    setProgress(prog);
    if (prog >= 0.35 && !chimePlayed) {
      setChimePlayed(true);
      playReveal();
    }
  }, [chimePlayed, playReveal]);

  const handleReveal = useCallback(() => {
    setShowFlash(true);
    setFrostHidden(true);
    setLetterVisible(true);
    setTimeout(() => setShowFlash(false), 2000);
  }, []);

  const progressPct = Math.min(100, Math.round(progress * 100));

  // Mobile tap ripple state
  const [ripples, setRipples] = useState([]);

  return (
    <div className="scene">
      <CosmicCanvas mouseRef={mouseRef} revealProgress={revealProgress} />

      <div className="vignette" />

      <Letter visible={letterVisible} />

      {showFlash && <div className="reveal-flash" />}

      {ripples.map(r => (
        <div key={r.id} className="tap-ripple" style={{ left: r.x, top: r.y }} />
      ))}

      {!frostHidden && (
        <FrostCanvas onProgress={handleProgress} onReveal={handleReveal} />
      )}

      {!frostHidden && (
        <div
          className="frost-title"
          style={{ opacity: Math.max(0, 1 - progress * 3) }}
        >
          <h1>Aru &amp; Anu.</h1>
          <p>{progress < 0.02 ? '{ wipe the screen }' : '{ keep going... }'}</p>
        </div>
      )}

      {!frostHidden && (
        <div className="progress-wrap" style={{ opacity: progress > 0.02 ? 1 : 0 }}>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ transform: `scaleX(${Math.min(1, progress / 0.35)})` }}
            />
          </div>
          <div className="progress-label">{progressPct}%</div>
        </div>
      )}

      <div
        ref={cursorRef}
        className={`cursor-dot${pressing && !frostHidden ? ' pressing' : ''}`}
      />
    </div>
  );
}
