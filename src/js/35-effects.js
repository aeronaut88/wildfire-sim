/* ───────────────────────── Effects ───────────────────────── */

const missiles = [], explosions = [], bolts = [], particles = [], popups = [];

let rainDrops = null, flakes = null;
function drawWeather(now) {
  const W = WEATHER[world.weather.kind];
  const w = canvas.width, h = canvas.height;
  const st = SEASON_TINT[season()];
  if (st) { ctx.fillStyle = st; ctx.fillRect(0, 0, w, h); }
  if (!W.tint) return;
  ctx.fillStyle = W.tint;
  ctx.fillRect(0, 0, w, h);
  if (W.rainOut > 0) {
    if (!rainDrops) rainDrops = Array.from({ length: 140 }, () => [Math.random(), Math.random()]);
    const storm = world.weather.kind === 'storm';
    const speed = storm ? 0.0011 : 0.0007;
    const slant = storm ? 0.35 : 0.15;
    ctx.strokeStyle = 'rgba(190,210,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of rainDrops) {
      const y = ((d[1] + now * speed) % 1) * h;
      const x = ((d[0] + now * speed * slant) % 1) * w;
      ctx.moveTo(x, y); ctx.lineTo(x - 24 * slant, y - 10);
    }
    ctx.stroke();
    if (storm && Math.random() < 0.012) {
      ctx.fillStyle = 'rgba(220,230,255,0.18)';
      ctx.fillRect(0, 0, w, h);
    }
  } else if (world.weather.kind === 'snow') {
    // Flakes of three sizes drift down with the wind; the big ones fall fastest, like they are nearer.
    if (!flakes) flakes = Array.from({ length: 320 }, () => ({ x: Math.random(), y: Math.random(), s: 1 + Math.floor(Math.random() * 3), v: 0.6 + Math.random() * 0.9, ph: Math.random() * 6.28 }));
    const wx = params.windX * params.windStrength, wy = params.windY * params.windStrength;
    const t = now * 0.00007;
    for (const f of flakes) {
      const y = (((f.y + t * f.v * (0.8 + f.s * 0.25) * (1 + wy * 0.5)) % 1) + 1) % 1 * h;
      const x = (((f.x + t * f.v * wx * 0.8 + Math.sin(now * 0.001 * f.v + f.ph) * 0.005) % 1) + 1) % 1 * w;
      const sz = Math.max(1, Math.round(f.s * cellPx / 7));
      ctx.fillStyle = f.s === 3 ? 'rgba(255,255,255,0.95)' : f.s === 2 ? 'rgba(240,245,255,0.8)' : 'rgba(225,235,255,0.6)';
      ctx.fillRect(x, y, sz, sz);
    }
  } else if (world.weather.kind === 'drystorm' && Math.random() < 0.02) {
    ctx.fillStyle = 'rgba(255,230,255,0.14)';
    ctx.fillRect(0, 0, w, h);
  }
}

function launchMissile(targetIdx) {
  stat('ev', 'missiles');
  const [tx, ty] = cellCenter(targetIdx);
  const W = canvas.width, H = canvas.height;
  const fromLeft = tx > W / 2;
  const sx = fromLeft ? -30 : W + 30;
  const sy = H + 20;
  const dist = Math.hypot(tx - sx, ty - sy);
  missiles.push({ sx, sy, tx, ty, target: targetIdx, t0: performance.now(), dur: 650 + dist * 0.55, arc: Math.max(80, dist * 0.45), lastSmoke: 0 }); // missiles stay real time
}
function missilePos(m, t) {
  return [m.sx + (m.tx - m.sx) * t, m.sy + (m.ty - m.sy) * t - Math.sin(Math.PI * t) * m.arc];
}
function detonate(m) {
  const n = world.n;
  if (m.nuke) { detonateNuke(m.target); return; }
  const radius = m.radius !== undefined ? m.radius : params.blast;
  if (m.meteor) {
    const n = world.n, cx = m.target % n, cy = Math.floor(m.target / n);
    let near = null, nd = Infinity; for (const t of world.towns) { const dd = Math.hypot(t.cx - cx, t.cy - cy); if (dd < nd) { nd = dd; near = t; } }
    log(`METEOR STRIKE${near && nd < near.R + 12 ? ' beside ' + near.name : ' in the wilds'}. The ground shakes.`, 'alarm');
    popups.push({ x: m.tx, y: m.ty - 20, text: 'METEOR', color: '#fff0b0', t0: performance.now(), dur: 3000 });
    for (let k = 0; k < 10; k++) { const a = Math.random() * Math.PI * 2, d = (radius + 1 + Math.random() * 6); const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d); if (x >= 0 && y >= 0 && x < n && y < n) ignite(y * n + x); }
    shake = 2;
  }
  strikeCell(m.target % n, Math.floor(m.target / n), radius);
  explosions.push({ x: m.tx, y: m.ty, t0: performance.now(), dur: 700, r: (radius + 1.5) * cellPx });
  shake = Math.max(shake, radius >= 2 ? 1 : 0.4);
  const count = 24 + radius * 10;
  for (let k = 0; k < count; k++) {
    const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 160;
    particles.push({ x: m.tx, y: m.ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: 500 + Math.random() * 600,
      color: Math.random() < 0.5 ? '#ffb627' : (Math.random() < 0.5 ? '#ff6a1f' : '#ffe866'), size: 1.5 + Math.random() * 2.5, grav: 180 });
  }
}
function lightning(targetIdx) {
  stat('ev', 'lightning');
  const [tx, ty] = cellCenter(targetIdx);
  const pts = [];
  let x = tx + (Math.random() - 0.5) * 120, y = -10;
  pts.push([x, y]);
  const segs = 10;
  for (let k = 1; k < segs; k++) {
    const t = k / segs;
    pts.push([tx + (x - tx) * (1 - t) + (Math.random() - 0.5) * 36 * (1 - t), y + (ty - y) * t]);
  }
  pts.push([tx, ty]);
  bolts.push({ pts, t0: performance.now(), dur: 380 });
  ignite(targetIdx);
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90;
    particles.push({ x: tx, y: ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 400, color: '#cfe6ff', size: 1.5, grav: 100 });
  }
}

let lastFx = 0;
function drawEffects(now) {
  const dt = Math.min(50, now - (lastFx || now)) / 1000;
  lastFx = now;

  for (let k = missiles.length - 1; k >= 0; k--) {
    const m = missiles[k];
    const t = (now - m.t0) / m.dur;
    if (t >= 1) { detonate(m); missiles.splice(k, 1); continue; }
    const [x, y] = missilePos(m, t);
    const [px, py] = missilePos(m, Math.max(0, t - 0.02));
    const ang = Math.atan2(y - py, x - px);
    if (now - m.lastSmoke > 22) {
      m.lastSmoke = now;
      particles.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: -10 + (Math.random() - 0.5) * 20, life: 0, max: 900, color: 'smoke', size: 2 + Math.random() * 3, grav: -10 });
    }
    if (m.meteor) {
      const s = Math.max(5, cellPx * 1.4);
      for (let k = 0; k < 3; k++) particles.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, life: 0, max: 500, color: k ? '#ffb627' : '#ffffff', size: s * 0.4, grav: 0 });
      ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3a2a'; ctx.beginPath(); ctx.arc(x, y, s * 0.35, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const s = Math.max(3, cellPx * 0.9);
    ctx.fillStyle = '#ffe866'; ctx.fillRect(-s * 1.6, -s * 0.25, s * 0.6, s * 0.5);
    ctx.fillStyle = '#ff6a1f'; ctx.fillRect(-s * 2.2, -s * 0.18, s * 0.7, s * 0.36);
    ctx.fillStyle = '#c9c9d1'; ctx.fillRect(-s, -s * 0.35, s * 1.8, s * 0.7);
    ctx.fillStyle = '#8a8a94'; ctx.fillRect(-s, 0, s * 1.8, s * 0.35);
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(-s, -s * 0.75, s * 0.5, s * 0.4); ctx.fillRect(-s, s * 0.35, s * 0.5, s * 0.4);
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.35); ctx.lineTo(s * 1.5, 0); ctx.lineTo(s * 0.8, s * 0.35); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  for (let k = explosions.length - 1; k >= 0; k--) {
    const e = explosions[k];
    const t = Math.max(0, (now - e.t0) / e.dur); // the frame clock can trail performance.now() on a heavy frame; never let the ring go negative
    if (t >= 1) { explosions.splice(k, 1); continue; }
    const ease = 1 - Math.pow(1 - t, 3);
    ctx.strokeStyle = `rgba(255,230,180,${(1 - t) * 0.8})`;
    ctx.lineWidth = Math.max(1, 4 * (1 - t));
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.3 + ease * 1.8), 0, Math.PI * 2); ctx.stroke();
    if (t < 0.6) {
      const ft = t / 0.6;
      const fr = e.r * (0.3 + ft * 0.9) * (1 - ft * 0.3);
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, fr);
      g.addColorStop(0, `rgba(255,255,255,${1 - ft})`);
      g.addColorStop(0.3, `rgba(255,230,102,${0.95 - ft * 0.8})`);
      g.addColorStop(0.7, `rgba(255,106,31,${0.8 - ft * 0.8})`);
      g.addColorStop(1, 'rgba(40,20,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(e.x, e.y, fr, 0, Math.PI * 2); ctx.fill();
    }
    if (t < 0.12) {
      fillScreen(`rgba(255,240,200,${(0.12 - t) / 0.12 * (e.nuke ? 1 : 0.35)})`);
    }
    if (e.nuke) {
      // Mushroom column and cap, rising.
      const rise = ease * e.r * 2.2;
      ctx.fillStyle = `rgba(90,70,60,${0.7 * (1 - t)})`;
      ctx.fillRect(e.x - e.r * 0.25, e.y - rise, e.r * 0.5, rise);
      ctx.beginPath(); ctx.arc(e.x, e.y - rise, e.r * (0.6 + ease * 0.9), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,170,80,${0.5 * (1 - t)})`;
      ctx.beginPath(); ctx.arc(e.x, e.y - rise, e.r * (0.3 + ease * 0.5), 0, Math.PI * 2); ctx.fill();
    }
  }

  for (let k = bolts.length - 1; k >= 0; k--) {
    const b = bolts[k];
    const t = (now - b.t0) / b.dur;
    if (t >= 1) { bolts.splice(k, 1); continue; }
    const a = t < 0.15 ? 1 : (1 - t) / 0.85;
    const flicker = 0.6 + 0.4 * Math.sin(now * 0.08);
    fillScreen(`rgba(200,220,255,${a * 0.18})`);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(120,170,255,${a * 0.5 * flicker})`; ctx.lineWidth = 6; strokePath(b.pts);
    ctx.strokeStyle = `rgba(255,255,255,${a * flicker})`; ctx.lineWidth = 2; strokePath(b.pts);
  }

  for (let k = particles.length - 1; k >= 0; k--) {
    const p = particles[k];
    p.life += dt * 1000;
    if (p.life >= p.max) { particles.splice(k, 1); continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    const f = 1 - p.life / p.max;
    if (p.color === 'smoke') {
      ctx.fillStyle = `rgba(120,110,105,${f * 0.5})`;
      const s = p.size * (1 + (1 - f) * 2);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    } else {
      ctx.globalAlpha = f;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 5);
}
function strokePath(pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

