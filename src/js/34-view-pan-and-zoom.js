/* ───────────────────────── View: pan and zoom ─────────────────────────
   Everything is drawn in map pixels; the view transform magnifies a window of it. Wheel zooms
   at the cursor, drag pans, pinch and one-finger drag do the same on a phone. */
const view = { zoom: 1, x: 0, y: 0 };
function clampView() {
  const size = canvas.width, span = size / view.zoom;
  view.x = Math.max(0, Math.min(size - span, view.x));
  view.y = Math.max(0, Math.min(size - span, view.y));
}
function applyView() { ctx.setTransform(view.zoom, 0, 0, view.zoom, -view.x * view.zoom, -view.y * view.zoom); }
function zoomAt(factor, sx, sy) { // sx, sy in canvas pixels
  const wx = view.x + sx / view.zoom, wy = view.y + sy / view.zoom;
  view.zoom = Math.max(1, Math.min(12, view.zoom * factor));
  view.x = wx - sx / view.zoom; view.y = wy - sy / view.zoom;
  clampView(); updateZoomHud();
}
function panBy(dx, dy) { if (typeof stopFollowing === 'function') stopFollowing(); view.x -= dx / view.zoom; view.y -= dy / view.zoom; clampView(); }
function resetView() { view.zoom = 1; view.x = 0; view.y = 0; updateZoomHud(); }
function updateZoomHud() { const el = $('hudZoom'); if (el) el.textContent = view.zoom < 1.05 ? '1x' : view.zoom.toFixed(1).replace(/\.0$/, '') + 'x'; }
function canvasPoint(clientX, clientY) { const r = canvas.getBoundingClientRect(); return [(clientX - r.left) / r.width * canvas.width, (clientY - r.top) / r.height * canvas.height]; }
function fillScreen(style) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = style; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); }

const WALKER_SPRITE = { constable: 'constable', fugitive: 'fugitive', convict: 'fugitive', rounds: 'healer', forage: 'forager', log: 'logger', hunt: 'hunter', water: 'carrier', mine: 'miner', quarry: 'miner', tend: 'farmer', farm: 'farmer', harvest: 'farmer', haul: 'hauler', fish: 'fisher', icefish: 'icefisher' };
function render(now, tickFrac) {
  flushDirty();
  ctx.save();
  applyView();
  if (shake > 0) {
    const a = shake * 3;
    ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
  }
  ctx.drawImage(terrain, 0, 0);
  const n = world.n;
  // When zoomed in, sprites outside the window are skipped; at 1x everything is in view.
  const cull = view.zoom > 1.05, vx0 = view.x - cellPx * 3, vy0 = view.y - cellPx * 3, vx1 = view.x + canvas.width / view.zoom + cellPx * 3, vy1 = view.y + canvas.height / view.zoom + cellPx * 3;
  const vis = (px, py) => !cull || (px >= vx0 && px <= vx1 && py >= vy0 && py <= vy1);
  const tiny = cellPx * view.zoom * ((parseFloat(canvas.style.width) || canvas.width) / canvas.width) < 3; // a worker would be a speck smaller than three pixels

  if (world.wetList.length) {
    for (const i of world.wetList) {
      if (world.wetKind[i] === 3) continue; // damp ground after a thaw
      const x = i % n, y = (i - x) / n;
      const a = Math.min(1, world.wet[i] / 12);
      ctx.fillStyle = world.wetKind[i] === 2 ? `rgba(255,90,130,${0.45 * a})` : `rgba(90,160,255,${0.4 * a})`;
      ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
    }
  }

  if (world.falloutList.length) {
    for (const i of world.falloutList) {
      const x = i % n, y = (i - x) / n;
      const a = world.fallout[i] / 255;
      ctx.fillStyle = `rgba(150,170,60,${0.12 + 0.5 * a})`;
      ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
      if (a > 0.5 && ((x * 7 + y * 13) % 5) === 0) { ctx.fillStyle = `rgba(0,0,0,${0.5 * a})`; ctx.fillRect(x * cellPx + cellPx * 0.3, y * cellPx + cellPx * 0.3, cellPx * 0.4, cellPx * 0.4); }
    }
  }

  const frames = [SPR.fire0, SPR.fire1, SPR.fire2];
  const crownFrames = [SPR.crown0, SPR.crown1, SPR.crown2];
  const burnLeft = world.burnLeft, intensity = world.intensity;
  for (const i of world.burning) {
    if (burnLeft[i] <= 0) continue;
    const x = i % n, y = (i - x) / n;
    if (!vis(x * cellPx, y * cellPx)) continue;
    ctx.drawImage((intensity[i] ? crownFrames : frames)[(fireFrame + i) % 3], x * cellPx, y * cellPx);
  }

  ctx.font = `${Math.max(8, Math.round(cellPx * 1.1))}px Silkscreen, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const nameFont = `${Math.max(8, Math.round(cellPx * 1.1))}px Silkscreen, monospace`;
  const statFont = `${Math.max(7, Math.round(cellPx * 0.8))}px Silkscreen, monospace`;
  for (const t of world.towns) {
    const x = (t.cx + 0.5) * cellPx; let y = (t.cy - t.R - 0.6) * cellPx;
    if (y - cellPx * 0.9 - Math.max(8, cellPx * 1.1) < 2) y = (t.cy + t.R + 1.6) * cellPx + cellPx * 0.9 + Math.max(8, cellPx * 1.1); // no room above: label below
    const dead = t.housesLeft === 0 || t.popLeft <= 0;
    ctx.font = nameFont;
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = Math.max(2, cellPx * 0.4); // outlined so names read on snow and ash alike
    ctx.strokeText(t.name.toUpperCase(), x, y - cellPx * 0.9);
    ctx.fillStyle = dead ? '#b8a890' : (t.mobilized ? '#ffb627' : '#e9dccb');
    ctx.fillText(t.name.toUpperCase(), x, y - cellPx * 0.9);
    if (cellPx >= 4) {
      const stat = dead ? (t.popLeft > 0 ? `${t.popLeft} survivors` : 'abandoned') : `pop ${t.popLeft} · ${t.housesLeft} homes${t.hasStation ? ' · ' + t.trucks.filter(q => q.alive).length + ' eng' : ''}`;
      ctx.font = statFont;
      ctx.lineWidth = Math.max(2, cellPx * 0.3);
      ctx.strokeText(stat, x, y);
      ctx.fillStyle = dead ? '#b8a890' : 'rgba(233,220,203,0.95)';
      ctx.fillText(stat, x, y);
    }
  }

  for (const t of world.towns) {
    if (t.workers && !tiny) for (const w of t.workers) {
      const x = (w.px + (w.x - w.px) * tickFrac) * cellPx, y = (w.py + (w.y - w.py) * tickFrac) * cellPx;
      if (!vis(x, y)) continue;
      ctx.drawImage(w.soldier ? SPR.soldier : w.convict || w.ousted ? SPR.fugitive : w.mason ? SPR.mason : w.job === 'craft' ? (SPR[w.craft] || SPR.worker) : (SPR[WALKER_SPRITE[w.job]] || SPR.worker), x, y);
      if (w.ice) { ctx.fillStyle = '#16283a'; ctx.fillRect(x + cellPx * 0.55, y + cellPx * 0.75, cellPx * 0.3, cellPx * 0.15); } // the hole in the ice
      if (w.animal) ctx.drawImage(SPR[LIVESTOCK_SPRITE[w.animal]] || SPR.sheep, x + cellPx * 0.4, y + cellPx * 0.3);
      if (w.carry) { ctx.fillStyle = w.job === 'log' ? '#7a4e22' : w.job === 'quarry' ? '#9a9aa4' : w.job === 'water' ? '#5a97d6' : w.job === 'forage' ? '#4ea955' : w.kind === 'coal' ? '#17171b' : w.kind === 'copper' ? '#2fa37a' : w.kind === 'uranium' ? '#b8ff2e' : '#c2602c'; ctx.fillRect(x + cellPx * 0.1, y + cellPx * 0.15, cellPx * 0.35, cellPx * 0.3); } // the load on their back
    }
    for (const c of t.crews) {
      const x = (c.px + (c.x - c.px) * tickFrac) * cellPx, y = (c.py + (c.y - c.py) * tickFrac) * cellPx;
      if (!vis(x, y)) continue;
      ctx.drawImage(SPR.crew, x, y);
    }
    for (const tr of t.trucks) {
      if (!tr.alive) continue;
      const x = (tr.px + (tr.x - tr.px) * tickFrac) * cellPx, y = (tr.py + (tr.y - tr.py) * tickFrac) * cellPx;
      if (tr.face < 0) { ctx.save(); ctx.translate(x + cellPx, y); ctx.scale(-1, 1); ctx.drawImage(SPR.truck, 0, 0); ctx.restore(); }
      else ctx.drawImage(SPR.truck, x, y);
      if (tr.state === 'out' || tr.state === 'refill') {
        const w = cellPx, h = Math.max(1, cellPx * 0.15);
        ctx.fillStyle = '#000'; ctx.fillRect(x, y - h - 1, w, h);
        ctx.fillStyle = '#8fd3ff'; ctx.fillRect(x, y - h - 1, w * tr.water / tr.cap, h);
      }
    }
  }

  // Industry smokes.
  if (Math.random() < 0.5) for (const t of world.towns) {
    if (!t.buildings) continue;
    for (const i of t.buildings) {
      const tt = world.type[i];
      if ((tt === T.FACTORY && Math.random() < 0.25) || (tt === T.FORGE && Math.random() < 0.08) || (tt === T.PLANT && t.plantLit && Math.random() < 0.4) || (tt === T.NUCLEAR && t.reactorOn && Math.random() < 0.3) || (tt === T.DERRICK && !t.spent[i] && Math.random() < 0.06)) {
        const [px, py] = cellCenter(i);
        particles.push({ x: px + (tt === T.FACTORY ? (Math.random() < 0.5 ? -1 : 1) * cellPx * 0.3 : 0), y: py - cellPx * 0.45, vx: params.windX * params.windStrength * 25 + (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, life: 0, max: 1600 + Math.random() * 900, color: 'smoke', size: 1.5 + Math.random() * 2, grav: -6 });
      }
    }
  }

  for (const b of world.warbands) {
    const x = (b.px + (b.x - b.px) * tickFrac) * cellPx, y = (b.py + (b.y - b.py) * tickFrac) * cellPx;
    const cnt = Math.min(3, 1 + Math.floor(b.size / 8));
    for (let k = 0; k < cnt; k++) {
      const ox = (k - (cnt - 1) / 2) * cellPx * 0.6;
      if (b.face < 0) { ctx.save(); ctx.translate(x + ox + cellPx, y); ctx.scale(-1, 1); ctx.drawImage(SPR.soldier, 0, 0); ctx.restore(); }
      else ctx.drawImage(SPR.soldier, x + ox, y);
    }
    const hw = (b.armour || 0) + (b.guns || 0);
    for (let k = 0; k < Math.min(3, hw); k++) {
      const spr = k < (b.armour || 0) ? SPR.tank : SPR.cannon;
      const ox = -(k + 1) * cellPx * (b.face < 0 ? -1 : 1) * 0.9;
      if (b.face < 0) { ctx.save(); ctx.translate(x + ox + cellPx, y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); } else ctx.drawImage(spr, x + ox, y);
    }
    ctx.font = `${Math.max(7, Math.round(cellPx * 0.8))}px Silkscreen, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2; ctx.strokeText(String(b.size), x + cellPx / 2, y - 2); ctx.fillStyle = '#ffb08a'; ctx.fillText(String(b.size), x + cellPx / 2, y - 2);
  }

  if (world.beavers && world.beavers.stage === 'building') {
    const bv = world.beavers;
    ctx.drawImage(SPR.beaver, (bv.x + (Math.sin(now / 400) * 0.6)) * cellPx, bv.y * cellPx);
  }

  for (const h of world.herds || []) {
    const u = Math.min(1, (world.tick - (h.t0 || world.tick) + tickFrac) / 3);
    const hx = (h.px + (h.x - h.px) * u) * cellPx, hy = (h.py + (h.y - h.py) * u) * cellPx;
    if (!vis(hx, hy)) continue;
    const spr = SPR[h.kind] || SPR.deer, shown = Math.min(h.size, 7);
    for (let k = 0; k < shown; k++) {
      const ox = (hash2(k, 1, 5) - 0.5) * cellPx * 3.2, oy = (hash2(k, 2, 5) - 0.5) * cellPx * 2.6;
      if (h.face < 0) { ctx.save(); ctx.translate(hx + ox + cellPx, hy + oy); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); } else ctx.drawImage(spr, hx + ox, hy + oy);
    }
  }
  for (const t of world.towns) {
    if (!t.livestock) continue;
    const pastures = t.buildings.filter(i => world.type[i] === T.PASTURE);
    if (!pastures.length) continue;
    let k = 0;
    for (const kind of LIVESTOCK) for (let a = 0; a < Math.min(t.livestock[kind] || 0, 12); a++, k++) {
      const cell = pastures[k % pastures.length], cx = cell % n, cy = (cell - cx) / n;
      const ox = 0.1 + hash2(k, 3, 9) * 0.55, oy = 0.15 + hash2(k, 4, 9) * 0.55;
      ctx.drawImage(SPR[LIVESTOCK_SPRITE[kind]], (cx + ox) * cellPx - cellPx * 0.35, (cy + oy) * cellPx - cellPx * 0.4);
    }
  }
  for (const b of world.boats) {
    const u = Math.min(1, (world.tick - (b.t0 === undefined ? world.tick : b.t0) + tickFrac) / 5); // boats step every 5 ticks
    const x = (b.px + (b.x - b.px) * u) * cellPx, y = (b.py + (b.y - b.py) * u) * cellPx;
    if (!vis(x, y)) continue;
    const spr = b.fire ? SPR.fireboat : SPR.boat;
    if (b.face < 0) { ctx.save(); ctx.translate(x + cellPx, y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); } else ctx.drawImage(spr, x, y);
  }

  // Battles: two lines of soldiers, volleys between them.
  for (const bt of world.battles) {
    const now2 = performance.now();
    for (const ag of bt.defAgents) ctx.drawImage(SPR.soldier, ag.x * cellPx, ag.y * cellPx);
    for (const ag of bt.attAgents) ctx.drawImage(SPR.raider, ag.x * cellPx, ag.y * cellPx);
    for (const g of bt.tanks || []) ctx.drawImage(g.tank ? SPR.tank : SPR.cannon, g.x * cellPx, g.y * cellPx);
    for (let k = bt.proj.length - 1; k >= 0; k--) {
      const pr = bt.proj[k];
      const u = (now2 - pr.t0) / pr.dur;
      if (u >= 1) { bt.proj.splice(k, 1); continue; }
      const x = (pr.x0 + (pr.x1 - pr.x0) * u + 0.5) * cellPx, y = (pr.y0 + (pr.y1 - pr.y0) * u + 0.5) * cellPx - (pr.kind === 'arrow' || pr.kind === 'bolt' ? Math.sin(u * Math.PI) * cellPx * 1.5 : 0);
      const dx = (pr.x1 - pr.x0), dy = (pr.y1 - pr.y0), L = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = pr.kind === 'arrow' ? '#e9dccb' : pr.kind === 'bolt' ? '#c9c9d1' : '#ffe866';
      ctx.lineWidth = pr.kind === 'gun' ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx / L * cellPx * 0.6, y - dy / L * cellPx * 0.6); ctx.stroke();
    }
  }

  for (const w of world.wagons || []) {
    const x = (w.px + (w.x - w.px) * tickFrac) * cellPx, y = (w.py + (w.y - w.py) * tickFrac) * cellPx;
    const sz = Math.max(cellPx, 10);
    if (w.face < 0) { ctx.save(); ctx.translate(x + sz, y - (sz - cellPx)); ctx.scale(-1, 1); ctx.drawImage(SPR16.wagon, 0, 0, sz, sz); ctx.restore(); }
    else ctx.drawImage(SPR16.wagon, x, y - (sz - cellPx), sz, sz);
  }

  if (world.settlers) {
    const s = world.settlers;
    const x = (s.px + (s.x - s.px) * tickFrac) * cellPx, y = (s.py + (s.y - s.py) * tickFrac) * cellPx;
    const sz = Math.max(cellPx, 10);
    if (s.face < 0) { ctx.save(); ctx.translate(x + sz, y - (sz - cellPx)); ctx.scale(-1, 1); ctx.drawImage(SPR16.wagon, 0, 0, sz, sz); ctx.restore(); }
    else ctx.drawImage(SPR16.wagon, x, y - (sz - cellPx), sz, sz);
  }

  for (const pr of world.roadProjects || []) {
    const x = (pr.px + (pr.x - pr.px) * tickFrac) * cellPx, y = (pr.py + (pr.y - pr.py) * tickFrac) * cellPx;
    ctx.drawImage(SPR.miner, x, y);
    if (Math.random() < 0.3 && !pr.halted) dust(pr.y * world.n + pr.x);
  }
  if (world.trader) {
    const s = world.trader;
    const x = (s.px + (s.x - s.px) * tickFrac) * cellPx, y = (s.py + (s.y - s.py) * tickFrac) * cellPx;
    const sz = Math.max(cellPx, 10);
    if (s.face < 0) { ctx.save(); ctx.translate(x + sz, y - (sz - cellPx)); ctx.scale(-1, 1); ctx.drawImage(SPR16.trader, 0, 0, sz, sz); ctx.restore(); }
    else ctx.drawImage(SPR16.trader, x, y - (sz - cellPx), sz, sz);
  }

  for (const p of world.packs || []) {
    const u = Math.min(1, (world.tick - (p.t0 || world.tick) + tickFrac) / 3);
    const x = (p.px + (p.x - p.px) * u) * cellPx, y = (p.py + (p.y - p.py) * u) * cellPx;
    if (!vis(x, y)) continue;
    const spr = p.kind === 'bear' ? SPR.bear : SPR.wolf, s = p.kind === 'bear' ? cellPx * 1.5 : cellPx;
    for (let k = 0; k < Math.min(p.size, 4); k++) { const ox = (k % 2) * cellPx * 0.7, oy = Math.floor(k / 2) * cellPx * 0.6; if (p.face < 0) { ctx.save(); ctx.translate(x + ox + s, y + oy); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0, s, s); ctx.restore(); } else ctx.drawImage(spr, x + ox, y + oy, s, s); }
  }
  for (const v of world.travellers || []) {
    const x = (v.px + (v.x - v.px) * tickFrac) * cellPx, y = (v.py + (v.y - v.py) * tickFrac) * cellPx;
    if (!vis(x, y)) continue;
    ctx.drawImage(v.kind === 'exile' ? SPR.fugitive : SPR.worker, x, y);
    if (v.kind === 'wedding') ctx.drawImage(SPR.worker, x + cellPx * 0.6, y);
  }
  for (const b of world.firebugs || []) {
    const x = (b.px + (b.x - b.px) * tickFrac) * cellPx, y = (b.py + (b.y - b.py) * tickFrac) * cellPx;
    if (!vis(x, y)) continue;
    ctx.drawImage(SPR.fugitive, x, y);
    if (b.kind === 'gang') for (let k = 1; k < Math.min(3, b.size || 3); k++) ctx.drawImage(SPR.fugitive, x + k * cellPx * 0.7, y + (k % 2) * cellPx * 0.4);
  }

  for (const p of world.bombers) {
    const s = cellPx * 2.4;
    ctx.save();
    ctx.translate((p.x + 0.5) * cellPx, (p.y + 0.5) * cellPx);
    ctx.rotate(p.heading + Math.PI / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.3; ctx.drawImage(SIL16.plane, -s / 2 + s * 0.15, -s / 2 + s * 0.3, s, s); ctx.globalAlpha = 1;
    ctx.drawImage(SPR16.bomber, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  for (const f of world.fighters || []) {
    const s = cellPx * 1.9;
    if (!vis(f.x * cellPx, f.y * cellPx)) continue;
    ctx.save();
    ctx.translate((f.x + 0.5) * cellPx, (f.y + 0.5) * cellPx);
    ctx.rotate(f.heading + Math.PI / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.25; ctx.drawImage(SIL16.plane, -s / 2 + s * 0.15, -s / 2 + s * 0.3, s, s); ctx.globalAlpha = 1;
    ctx.drawImage(SPR16.fighter, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  if (world.air && world.air.plane) {
    const p = world.air.plane;
    const s = cellPx * 2.4;
    ctx.save();
    ctx.translate((p.x + 0.5) * cellPx, (p.y + 0.5) * cellPx);
    ctx.rotate(p.heading + Math.PI / 2);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(SIL16.plane, -s / 2 + s * 0.15, -s / 2 + s * 0.3, s, s);
    ctx.globalAlpha = 1;
    ctx.drawImage(SPR.plane, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  if (world.dragon) {
    const d = world.dragon;
    const sz = Math.max(40, cellPx * 5.5);
    const flap = Math.floor(now / 140) % 2;
    if (!d.frames) { const k = DRAGON_KINDS.find(q => q.name === d.kind) || DRAGON_KINDS[0]; d.frames = tintDragonFrames(k); d.flame = k.flame; }
    const frame = d.frames[flap];
    const px = (d.x + 0.5) * cellPx, py = (d.y + 0.5) * cellPx;
    // Shadow on the ground: the dragon's own silhouette, offset for altitude.
    ctx.save();
    ctx.translate(px + sz * 0.22, py + sz * 0.3);
    ctx.rotate(d.heading + Math.PI / 2);
    ctx.globalAlpha = 0.38;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(flap ? SIL16.dragon1 : SIL16.dragon0, -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(d.heading + Math.PI / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame, -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
    if (d.name) {
      ctx.font = `${Math.max(8, Math.round(cellPx * 1.0))}px Silkscreen, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3; ctx.strokeText(d.name.toUpperCase(), px, py - sz * 0.55);
      ctx.fillStyle = '#ff6a6a'; ctx.fillText(d.name.toUpperCase(), px, py - sz * 0.55);
    }
    // Flame jet from the mouth while breathing over the town.
    if (Math.hypot(d.x - d.town.cx, d.y - d.town.cy) < d.town.R + 2.5 && d.leg >= 1) {
      const hx = Math.cos(d.heading), hy = Math.sin(d.heading);
      for (let k = 0; k < 3; k++) {
        const spread = (Math.random() - 0.5) * 0.9;
        const vx = Math.cos(d.heading + spread) * (120 + Math.random() * 80), vy = Math.sin(d.heading + spread) * (120 + Math.random() * 80);
        particles.push({ x: px + hx * sz * 0.45, y: py + hy * sz * 0.45, vx, vy, life: 0, max: 260 + Math.random() * 160,
          color: d.flame[Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? 1 : 2)], size: Math.max(2.5, cellPx * 0.55), grav: 30 });
      }
    }
  }

  if (world.dragon) fillScreen('rgba(120, 10, 0, 0.10)'); // the sky goes ugly while it is here
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); drawWeather(now); ctx.restore(); // weather is a screen-space effect
  drawEffects(now);

  for (let k = markers.length - 1; k >= 0; k--) {
    const m = markers[k], t = (now - m.t0) / m.dur;
    if (t >= 1) { markers.splice(k, 1); continue; }
    const [mx, my] = cellCenter(m.cell), r = cellPx * (1.5 + t * 6);
    ctx.globalAlpha = 1 - t; ctx.lineWidth = Math.max(1.5, cellPx * 0.3) / view.zoom * 2; ctx.strokeStyle = '#ffe866';
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const stacks = new Map(); // popups near the same spot stack upward instead of overprinting
  for (let k = popups.length - 1; k >= 0; k--) {
    const p = popups[k];
    const t = (now - p.t0) / p.dur;
    if (t >= 1) { popups.splice(k, 1); continue; }
    const key = Math.round(p.x / 40) + ':' + Math.round(p.y / 30);
    const lift = (stacks.get(key) || 0); stacks.set(key, lift + 1);
    const fs = Math.max(10, Math.round(cellPx * 1.6));
    ctx.globalAlpha = 1 - t * t;
    ctx.font = `bold ${fs}px Silkscreen, monospace`;
    const yy = p.y - t * 24 - lift * (fs + 2);
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = Math.max(2, fs * 0.22); ctx.strokeText(p.text, p.x, yy);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, yy);
    ctx.globalAlpha = 1;
  }

  if (hover >= 0 && hover < n * n) {
    const x = (hover % n) * cellPx, y = Math.floor(hover / n) * cellPx;
    const r = params.blast * cellPx;
    ctx.strokeStyle = 'rgba(255,182,39,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cellPx - 1, cellPx - 1);
    if (r > 0) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255,106,31,0.55)';
      ctx.beginPath();
      ctx.arc(x + cellPx / 2, y + cellPx / 2, r + cellPx / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

