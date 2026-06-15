import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

const TAU = Math.PI * 2;

function drawSnowflakeBranch(ctx, x, y, angle, length, depth) {
  if (depth === 0 || length < 1.5) return;
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  const branchAngles = [-Math.PI / 3, Math.PI / 3];
  branchAngles.forEach(da => {
    drawSnowflakeBranch(ctx, ex, ey, angle + da, length * 0.5, depth - 1);
  });
}

function drawSnowflake(ctx, cx, cy, size, rotation) {
  ctx.save();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = `rgba(200,215,245,${0.18 + Math.random() * 0.22})`;
  for (let i = 0; i < 6; i++) {
    drawSnowflakeBranch(ctx, cx, cy, rotation + (i / 6) * TAU, size, 4);
  }
  ctx.restore();
}

function buildFrost(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, 'rgb(235,240,250)');
  bg.addColorStop(0.3, 'rgb(228,235,248)');
  bg.addColorStop(0.6, 'rgb(232,238,252)');
  bg.addColorStop(1, 'rgb(225,232,248)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
  vignette.addColorStop(0, 'rgba(210,220,245,0)');
  vignette.addColorStop(1, 'rgba(190,205,235,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  const count = Math.floor((W * H) / 14000);
  for (let i = 0; i < count; i++) {
    drawSnowflake(ctx, Math.random() * W, Math.random() * H, 8 + Math.random() * 28, Math.random() * TAU);
  }

  for (let i = 0; i < 800; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.2, 0, TAU);
    ctx.fillStyle = `rgba(180,195,230,${0.08 + Math.random() * 0.12})`;
    ctx.fill();
  }

  for (let i = 0; i < 18; i++) {
    const sx = Math.random() * W;
    const sy = Math.random() * H;
    ctx.save();
    ctx.strokeStyle = `rgba(170,190,225,${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    let cx = sx, cy = sy, angle = Math.random() * TAU;
    for (let j = 0; j < 12; j++) {
      angle += (Math.random() - 0.5) * 0.8;
      const len = 20 + Math.random() * 40;
      cx += Math.cos(angle) * len;
      cy += Math.sin(angle) * len;
      j === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();
  }
}

const WIPE_RADIUS = 68;

const FrostCanvas = forwardRef(function FrostCanvas({ onProgress, onReveal }, ref) {
  const frostRef = useRef(null);
  const sparkRef = useRef(null);
  const touchMapRef = useRef(new Map()); // touchId -> {lastX, lastY}
  const stateRef = useRef({
    isDown: false,
    lastX: 0,
    lastY: 0,
    sparks: [],
    glowRings: [],
    progress: 0,
    revealed: false,
    fading: false,
    lastInteractTime: Date.now(),
    _sampleCount: 0,
  });

  useImperativeHandle(ref, () => ({
    getProgress: () => stateRef.current.progress,
  }));

  const sampleProgress = useCallback(() => {
    const canvas = frostRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    const step = 14;
    const W = canvas.width;
    const H = canvas.height;
    let cleared = 0, total = 0;
    const data = ctx.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        total++;
        if (data[(y * W + x) * 4 + 3] < 30) cleared++;
      }
    }
    return total > 0 ? cleared / total : 0;
  }, []);

  const wipe = useCallback((x, y) => {
    const canvas = frostRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, WIPE_RADIUS);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, WIPE_RADIUS, 0, TAU);
    ctx.fill();
    ctx.restore();
  }, []);

  const spawnSparks = useCallback((x, y) => {
    const s = stateRef.current;
    const count = 5 + Math.floor(Math.random() * 6);
    const sparkPalettes = [
      [220, 200, 255], // lavender
      [180, 220, 255], // ice blue
      [200, 180, 255], // periwinkle
      [160, 200, 255], // frost
      [220, 200, 230], // pink frost
    ];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const speed = 0.8 + Math.random() * 2.5;
      const [r, g, b] = sparkPalettes[Math.floor(Math.random() * sparkPalettes.length)];
      s.sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.025,
        size: 1.5 + Math.random() * 3,
        color: `rgb(${r},${g},${b})`,
        trail: [],
      });
    }
  }, []);

  const addGlowRing = useCallback((x, y) => {
    stateRef.current.glowRings.push({ x, y, life: 1, decay: 0.06 });
  }, []);

  const doWipe = useCallback((fromX, fromY, toX, toY) => {
    const s = stateRef.current;
    if (s.fading) return;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;

    s.lastInteractTime = Date.now();
    const steps = Math.ceil(dist / 8);
    for (let i = 0; i <= steps; i++) {
      const ix = fromX + (dx * i) / steps;
      const iy = fromY + (dy * i) / steps;
      wipe(ix, iy);
      if (i % 3 === 0) spawnSparks(ix, iy);
      if (i % 2 === 0) addGlowRing(ix, iy);
    }

    s._sampleCount++;
    if (s._sampleCount % 8 === 0) {
      const prog = sampleProgress();
      s.progress = prog;
      onProgress?.(prog);
      if (prog >= 0.35 && !s.fading) {
        s.fading = true;
      }
    }
  }, [wipe, spawnSparks, addGlowRing, sampleProgress, onProgress]);

  // Spark / glow / idle / burst animation loop
  useEffect(() => {
    const sparkCanvas = sparkRef.current;
    if (!sparkCanvas) return;
    const ctx = sparkCanvas.getContext('2d');
    const s = stateRef.current;
    let animId;
    let frostAlpha = 1;
    let shimmerX = -0.2; // 0..1.2 across screen
    let burstDone = false;

    function resize() {
      sparkCanvas.width = window.innerWidth;
      sparkCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function emitRevealBurst(W, H) {
      const cx = W / 2;
      const cy = H / 2;
      const burstColors = [
        'hsl(42,95%,75%)',   // warm gold
        'hsl(210,90%,78%)',  // soft blue
        'hsl(280,80%,82%)',  // lavender
        'hsl(0,0%,96%)',     // white
        'hsl(320,70%,80%)',  // pink
        'hsl(180,60%,78%)',  // teal
        'hsl(45,90%,85%)',   // champagne
      ];
      // Ring burst — concentric rings of particles
      for (let ring = 0; ring < 3; ring++) {
        const ringCount = 40 + ring * 20;
        for (let i = 0; i < ringCount; i++) {
          const angle = (i / ringCount) * TAU + Math.random() * 0.12;
          const speed = (2 + ring * 1.5) + Math.random() * 5;
          s.sparks.push({
            x: cx + (Math.random() - 0.5) * 40,
            y: cy + (Math.random() - 0.5) * 40,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 1,
            decay: 0.006 + Math.random() * 0.01,
            size: 2 + Math.random() * 3.5,
            color: burstColors[Math.floor(Math.random() * burstColors.length)],
            trail: [],
          });
        }
      }
    }

    function loop(timestamp) {
      const W = sparkCanvas.width;
      const H = sparkCanvas.height;
      ctx.clearRect(0, 0, W, H);

      // Fade out frost
      if (s.fading) {
        frostAlpha = Math.max(0, frostAlpha - 0.014);
        if (frostRef.current) frostRef.current.style.opacity = frostAlpha;
        if (frostAlpha <= 0 && !s.revealed) {
          s.revealed = true;
          if (!burstDone) { burstDone = true; emitRevealBurst(W, H); }
          onReveal?.();
        }
      }

      // Idle shimmer hint — sweeping stripe across the frost
      const idleMs = Date.now() - s.lastInteractTime;
      if (!s.fading && idleMs > 3000) {
        const speed = 0.00018;
        shimmerX += speed * 16; // ~60fps
        if (shimmerX > 1.25) shimmerX = -0.25;
        const sx = shimmerX * W;
        const shimmerGrad = ctx.createLinearGradient(sx - 80, 0, sx + 80, 0);
        shimmerGrad.addColorStop(0, 'rgba(200,215,255,0)');
        shimmerGrad.addColorStop(0.4, 'rgba(210,225,255,0.12)');
        shimmerGrad.addColorStop(0.5, 'rgba(220,235,255,0.22)');
        shimmerGrad.addColorStop(0.6, 'rgba(210,225,255,0.12)');
        shimmerGrad.addColorStop(1, 'rgba(200,215,255,0)');
        ctx.fillStyle = shimmerGrad;
        ctx.fillRect(sx - 80, 0, 160, H);
      } else if (!s.fading && idleMs <= 3000) {
        shimmerX = -0.25; // reset when active
      }

      // Glow rings at wipe edges
      for (let i = s.glowRings.length - 1; i >= 0; i--) {
        const r = s.glowRings[i];
        r.life -= r.decay;
        if (r.life <= 0) { s.glowRings.splice(i, 1); continue; }

        const inner = WIPE_RADIUS * 0.65;
        const outer = WIPE_RADIUS * 1.25;
        const grad = ctx.createRadialGradient(r.x, r.y, inner, r.x, r.y, outer);
        grad.addColorStop(0, 'rgba(160,195,255,0)');
        grad.addColorStop(0.4, `rgba(180,210,255,${r.life * 0.35})`);
        grad.addColorStop(0.7, `rgba(140,180,255,${r.life * 0.2})`);
        grad.addColorStop(1, 'rgba(120,160,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, outer, 0, TAU);
        ctx.fill();
      }

      // Sparks
      for (let i = s.sparks.length - 1; i >= 0; i--) {
        const p = s.sparks[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.vx *= 0.97;
        p.life -= p.decay;
        if (p.life <= 0) { s.sparks.splice(i, 1); continue; }

        for (let j = 1; j < p.trail.length; j++) {
          ctx.save();
          ctx.globalAlpha = (j / p.trail.length) * p.life * 0.5;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = (j / p.trail.length) * p.size * 0.7;
          ctx.beginPath();
          ctx.moveTo(p.trail[j - 1].x, p.trail[j - 1].y);
          ctx.lineTo(p.trail[j].x, p.trail[j].y);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = p.life;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(0.3, p.color);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [onReveal]);

  // Frost canvas init
  useEffect(() => {
    const canvas = frostRef.current;
    if (!canvas) return;
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildFrost(canvas);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Mouse
  const onMouseDown = useCallback(e => {
    const s = stateRef.current;
    s.isDown = true;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastInteractTime = Date.now();
  }, []);

  const onMouseMove = useCallback(e => {
    const s = stateRef.current;
    if (!s.isDown) return;
    doWipe(s.lastX, s.lastY, e.clientX, e.clientY);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
  }, [doWipe]);

  const onMouseUp = useCallback(() => {
    stateRef.current.isDown = false;
  }, []);

  // Multi-touch — track each finger independently
  const onTouchStart = useCallback(e => {
    e.preventDefault();
    stateRef.current.isDown = true;
    stateRef.current.lastInteractTime = Date.now();
    Array.from(e.changedTouches).forEach(t => {
      touchMapRef.current.set(t.identifier, { lastX: t.clientX, lastY: t.clientY });
    });
  }, []);

  const onTouchMove = useCallback(e => {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      const prev = touchMapRef.current.get(t.identifier);
      if (prev) {
        doWipe(prev.lastX, prev.lastY, t.clientX, t.clientY);
        prev.lastX = t.clientX;
        prev.lastY = t.clientY;
      }
    });
  }, [doWipe]);

  const onTouchEnd = useCallback(e => {
    Array.from(e.changedTouches).forEach(t => {
      touchMapRef.current.delete(t.identifier);
    });
    if (touchMapRef.current.size === 0) stateRef.current.isDown = false;
  }, []);

  return (
    <>
      <canvas ref={frostRef} style={{ zIndex: 4 }} />
      <canvas ref={sparkRef} style={{ zIndex: 5, pointerEvents: 'none' }} />
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 6, cursor: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    </>
  );
});

export default FrostCanvas;
