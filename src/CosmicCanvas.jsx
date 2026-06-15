import { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;

function lemniscate(t, a) {
  const denom = 1 + Math.sin(t) * Math.sin(t);
  return {
    x: (a * Math.cos(t)) / denom,
    y: (a * Math.sin(t) * Math.cos(t)) / denom,
  };
}

function heartPoint(t, scale) {
  const x = scale * 16 * Math.pow(Math.sin(t), 3);
  const y = -scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x, y };
}

export default function CosmicCanvas({ mouseRef, revealProgress }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Stars
    const starCount = Math.floor((window.innerWidth * window.innerHeight) / 1800);
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.2,
      twinkleSpeed: Math.random() * 0.015 + 0.005,
      twinkleOffset: Math.random() * TAU,
      color: Math.random() < 0.15 ? '#f5c97a' : Math.random() < 0.1 ? '#7ab3f5' : '#ffffff',
      layer: Math.floor(Math.random() * 3),
    }));

    const shootingStars = [];
    let nextShoot = 2 + Math.random() * 4;

    const nebulae = [
      { cx: 0.18, cy: 0.25, rx: 0.35, ry: 0.22, color: 'rgba(60,30,120,0.18)', angle: -0.3 },
      { cx: 0.75, cy: 0.6,  rx: 0.30, ry: 0.20, color: 'rgba(20,60,110,0.14)', angle:  0.5 },
      { cx: 0.5,  cy: 0.45, rx: 0.25, ry: 0.18, color: 'rgba(80,20,100,0.12)', angle:  0.1 },
      { cx: 0.88, cy: 0.15, rx: 0.22, ry: 0.15, color: 'rgba(10,40,90,0.12)',  angle: -0.2 },
    ];

    const auroraLayers = [
      { yBase: 0.3,  amp: 0.06, freq: 2.2, speed: 0.00025, phase: 0,   color: 'rgba(30,200,160,0.055)', thick: 60 },
      { yBase: 0.22, amp: 0.04, freq: 1.8, speed: 0.00018, phase: 1.2, color: 'rgba(80,120,240,0.045)', thick: 50 },
      { yBase: 0.38, amp: 0.05, freq: 2.8, speed: 0.00030, phase: 2.5, color: 'rgba(160,60,220,0.035)', thick: 45 },
    ];

    const constellations = [
      { stars: [[0.12,0.18],[0.18,0.12],[0.25,0.15],[0.22,0.22],[0.16,0.26]], lines: [[0,1],[1,2],[2,3],[3,4],[4,0]] },
      { stars: [[0.72,0.12],[0.78,0.08],[0.82,0.14],[0.77,0.18],[0.74,0.22]], lines: [[0,1],[1,2],[2,3],[3,4]] },
      { stars: [[0.85,0.55],[0.90,0.50],[0.92,0.58],[0.88,0.63]], lines: [[0,1],[1,2],[2,3],[3,0]] },
    ];

    const trailAru = [], trailAnu = [];
    const TRAIL_LEN = 55;
    const petals = [];
    const MAX_PETALS = 80;

    function spawnPetal(x, y, isAru) {
      if (petals.length >= MAX_PETALS) return;
      const angle = Math.random() * TAU;
      const speed = Math.random() * 0.4 + 0.15;
      petals.push({
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.5,
        life: 1, decay: Math.random() * 0.008 + 0.006,
        size: Math.random() * 2.5 + 1,
        angle: Math.random() * TAU, spin: (Math.random() - 0.5) * 0.06,
        colorBase: isAru ? 'rgba(245,201,122,' : 'rgba(122,179,245,',
      });
    }

    // --- Draw helpers ---
    function drawNebulae(W, H) {
      nebulae.forEach(n => {
        ctx.save();
        ctx.translate(n.cx * W, n.cy * H);
        ctx.rotate(n.angle);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx * W);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.scale(1, n.ry / n.rx);
        ctx.beginPath();
        ctx.arc(0, 0, n.rx * W, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
    }

    function drawAurora(W, H, t) {
      auroraLayers.forEach(layer => {
        const phase = layer.phase + t * layer.speed * 1000;
        ctx.save();
        ctx.beginPath();
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * W;
          const y = (layer.yBase + Math.sin(i / steps * TAU * layer.freq + phase) * layer.amp) * H;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        for (let i = steps; i >= 0; i--) {
          const x = (i / steps) * W;
          const y = (layer.yBase + Math.sin(i / steps * TAU * layer.freq + phase) * layer.amp) * H + layer.thick;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.fill();
        ctx.restore();
      });
    }

    function drawStars(W, H, t, px, py) {
      const pf = [0.003, 0.007, 0.012];
      stars.forEach(s => {
        const sx = ((s.x * W + px * pf[s.layer] * W) % W + W) % W;
        const sy = ((s.y * H + py * pf[s.layer] * H) % H + H) % H;
        const alpha = 0.55 + 0.45 * Math.sin(t * s.twinkleSpeed * 1000 + s.twinkleOffset);
        ctx.save();
        ctx.globalAlpha = alpha;
        if (s.r > 1.0) {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = alpha * 0.35;
          const spikeLen = s.r * 4;
          [[1,0],[0,1],[0.7,0.7],[-0.7,0.7]].forEach(([dx,dy]) => {
            ctx.beginPath();
            ctx.moveTo(sx - dx * spikeLen, sy - dy * spikeLen);
            ctx.lineTo(sx + dx * spikeLen, sy + dy * spikeLen);
            ctx.stroke();
          });
          ctx.globalAlpha = alpha;
        }
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 2);
        grad.addColorStop(0, s.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r * 2, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
    }

    function drawConstellations(W, H) {
      constellations.forEach(c => {
        ctx.save();
        ctx.strokeStyle = 'rgba(180,190,255,0.12)';
        ctx.lineWidth = 0.8;
        c.lines.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(c.stars[a][0] * W, c.stars[a][1] * H);
          ctx.lineTo(c.stars[b][0] * W, c.stars[b][1] * H);
          ctx.stroke();
        });
        c.stars.forEach(([x, y]) => {
          ctx.fillStyle = 'rgba(200,210,255,0.35)';
          ctx.beginPath();
          ctx.arc(x * W, y * H, 1.2, 0, TAU);
          ctx.fill();
        });
        ctx.restore();
      });
    }

    function drawShootingStars(W, H, dt) {
      nextShoot -= dt;
      if (nextShoot <= 0) {
        nextShoot = 3 + Math.random() * 6;
        shootingStars.push({
          x: Math.random() * W * 0.7,
          y: Math.random() * H * 0.3,
          vx: (3 + Math.random() * 5) * (Math.random() < 0.5 ? 1 : -1),
          vy: 1.5 + Math.random() * 2.5,
          life: 1, decay: 0.018 + Math.random() * 0.012,
          tailLen: 80 + Math.random() * 120,
        });
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx; s.y += s.vy; s.life -= s.decay;
        if (s.life <= 0) { shootingStars.splice(i, 1); continue; }
        const mag = Math.hypot(s.vx, s.vy);
        const tailX = s.x - s.vx * (s.tailLen / mag);
        const tailY = s.y - s.vy * (s.tailLen / mag);
        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.6, `rgba(220,230,255,${s.life * 0.4})`);
        grad.addColorStop(1, `rgba(255,255,255,${s.life * 0.9})`);
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(180,200,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawGalaxySpiral(cx, cy, t, reveal) {
      if (reveal < 0.05) return;
      const alpha = Math.min(1, reveal * 2.5) * 0.1;
      ctx.save();
      ctx.globalAlpha = alpha;
      const arms = 2;
      const ptsPerArm = 90;
      const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.28;
      const rotOffset = t * 0.1;
      for (let arm = 0; arm < arms; arm++) {
        const armBase = (arm / arms) * TAU;
        for (let i = 0; i < ptsPerArm; i++) {
          const frac = i / ptsPerArm;
          const r = frac * maxR;
          const angle = armBase + frac * TAU * 2.2 + rotOffset;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r * 0.42;
          const brightness = Math.pow(1 - frac, 1.5);
          ctx.fillStyle = arm === 0
            ? `rgba(245,200,120,${brightness * 0.55})`
            : `rgba(120,175,245,${brightness * 0.55})`;
          ctx.beginPath();
          ctx.arc(x, y, (1 - frac) * 1.8 + 0.3, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function drawHeartHalo(cx, cy, a, t, reveal) {
      const s = Math.min(1, reveal * 2);
      if (s < 0.01) return;
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.5);
      ctx.save();
      ctx.globalAlpha = 0.13 * s;
      ctx.strokeStyle = 'rgba(220,160,200,0.7)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(220,160,200,0.4)';
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * TAU;
        const p = heartPoint(theta, a * 0.006 * pulse);
        i === 0 ? ctx.moveTo(cx + p.x, cy + p.y) : ctx.lineTo(cx + p.x, cy + p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Vibrating string — sine harmonics with envelope
    function drawVibratingString(aruX, aruY, anuX, anuY, t) {
      const dx = anuX - aruX;
      const dy = anuY - aruY;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const nx = -dy / len;
      const ny =  dx / len;

      const pulse = 0.7 + 0.3 * Math.sin(t * TAU * 1.2);
      const amp = 14 * pulse;
      const p1 = t * 4.5;
      const p2 = t * 7.1;

      const steps = 50;
      const threadGrad = ctx.createLinearGradient(aruX, aruY, anuX, anuY);
      threadGrad.addColorStop(0,   'rgba(245,201,122,0.5)');
      threadGrad.addColorStop(0.5, 'rgba(220,200,255,0.3)');
      threadGrad.addColorStop(1,   'rgba(122,179,245,0.5)');

      ctx.save();
      ctx.strokeStyle = threadGrad;
      ctx.lineWidth = pulse * 1.6;
      ctx.shadowBlur = 10 * pulse;
      ctx.shadowColor = 'rgba(200,180,255,0.45)';
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const envelope = Math.sin(frac * Math.PI);
        const disp = envelope * (
          amp * 0.65 * Math.sin(3 * frac * TAU + p1) +
          amp * 0.35 * Math.sin(5 * frac * TAU + p2)
        );
        const x = aruX + dx * frac + nx * disp;
        const y = aruY + dy * frac + ny * disp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawLemniscatePath(cx, cy, a) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180,170,255,0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const theta = (i / 200) * TAU;
        const p = lemniscate(theta, a);
        i === 0 ? ctx.moveTo(cx + p.x, cy + p.y) : ctx.lineTo(cx + p.x, cy + p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawTrail(trail, colorFn) {
      if (trail.length < 2) return;
      ctx.save();
      for (let i = 1; i < trail.length; i++) {
        ctx.strokeStyle = colorFn(i / trail.length * 0.5);
        ctx.lineWidth = (i / trail.length) * 2.5;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawPetals(dt) {
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life -= p.decay; p.angle += p.spin;
        if (p.life <= 0) { petals.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = p.colorBase + (p.life * 0.7) + ')';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawSoul(x, y, color1, color2, size, heartbeat) {
      const corona = ctx.createRadialGradient(x, y, 0, x, y, size * 3.5);
      corona.addColorStop(0, color1.replace('1)', '0.25)'));
      corona.addColorStop(1, 'transparent');
      ctx.save();
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(x, y, size * 3.5, 0, TAU);
      ctx.fill();

      const mid = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
      mid.addColorStop(0, color1.replace('1)', '0.55)'));
      mid.addColorStop(0.4, color2.replace('1)', '0.35)'));
      mid.addColorStop(1, 'transparent');
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.arc(x, y, size * 1.8, 0, TAU);
      ctx.fill();

      const core = ctx.createRadialGradient(x, y, 0, x, y, size * heartbeat);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.3, color1);
      core.addColorStop(1, color2.replace('1)', '0.4)'));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, size * heartbeat, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    function drawSoulLabel(x, y, label, color, t, reveal) {
      const alpha = Math.min(1, reveal * 3) * (0.5 + 0.2 * Math.sin(t * 1.3));
      if (alpha < 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'italic 300 13px "Cormorant Garamond", Georgia, serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 12;
      ctx.shadowColor = color.replace('1)', '0.5)');
      ctx.fillText(label, x, y - 22);
      ctx.restore();
    }

    let lastTime = null, animId;
    let t = 0;

    function draw(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      t = timestamp / 1000;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      const mouse = mouseRef.current;
      const px = (mouse.x / W - 0.5) * -1;
      const py = (mouse.y / H - 0.5) * -1;
      const reveal = revealProgress.current;

      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
      bg.addColorStop(0, '#050212');
      bg.addColorStop(0.4, '#080520');
      bg.addColorStop(0.7, '#060318');
      bg.addColorStop(1, '#04020f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      drawNebulae(W, H);
      drawAurora(W, H, t);
      drawConstellations(W, H);
      drawGalaxySpiral(cx + px * 5, cy + py * 5, t, reveal);
      drawStars(W, H, t, px * 30, py * 30);
      drawShootingStars(W, H, dt);

      const a = Math.min(W, H) * 0.175;
      const orbitT = t * 0.45;
      const pAru = lemniscate(orbitT, a);
      const pAnu = lemniscate(orbitT + Math.PI, a);
      const aruX = cx + pAru.x + px * 8;
      const aruY = cy + pAru.y + py * 8;
      const anuX = cx + pAnu.x + px * 8;
      const anuY = cy + pAnu.y + py * 8;

      trailAru.push({ x: aruX, y: aruY });
      if (trailAru.length > TRAIL_LEN) trailAru.shift();
      trailAnu.push({ x: anuX, y: anuY });
      if (trailAnu.length > TRAIL_LEN) trailAnu.shift();

      // Heartbeat rhythm (lub-dub at ~72bpm)
      const beatT = t % (60 / 72);
      const heartbeat = beatT < 0.08 ? 1 + 0.12 * Math.sin((beatT / 0.08) * Math.PI)
                      : beatT < 0.25 ? 1 + 0.06 * Math.sin(((beatT - 0.1) / 0.15) * Math.PI)
                      : 1.0;

      if (Math.random() < 0.08) spawnPetal(aruX, aruY, true);
      if (Math.random() < 0.08) spawnPetal(anuX, anuY, false);

      drawLemniscatePath(cx + px * 8, cy + py * 8, a);
      drawTrail(trailAru, a => `rgba(245,201,122,${a})`);
      drawTrail(trailAnu, a => `rgba(122,179,245,${a})`);
      drawPetals(dt);
      drawHeartHalo(cx + px * 6, cy + py * 6, a, t, reveal);
      drawVibratingString(aruX, aruY, anuX, anuY, t);
      drawSoul(aruX, aruY, 'rgba(245,201,122,1)', 'rgba(255,180,80,1)', 7, heartbeat);
      drawSoul(anuX, anuY, 'rgba(122,179,245,1)', 'rgba(80,140,255,1)', 7, heartbeat);
      drawSoulLabel(aruX, aruY, 'Aru', 'rgba(245,201,122,1)', t, reveal);
      drawSoulLabel(anuX, anuY, 'Anu', 'rgba(122,179,245,1)', t, reveal);

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ zIndex: 1 }} />;
}
