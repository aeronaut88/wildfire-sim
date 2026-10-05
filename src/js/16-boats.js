/* ───────────────────────── Boats ───────────────────────── */

// Fishing boats drift about on the water for life. Towns with waterworks that touch water get a fireboat.
function updateBoats() {
  const n = world.n, type = world.type;
  if (world.tick % 5 !== 0) return;
  const want = Math.min(6, Math.floor(world.water.length / 220));
  const fishing = world.boats.filter(b => !b.fire).length;
  if (fishing < want && world.water.length && Math.random() < 0.3) {
    const i = world.water[Math.floor(Math.random() * world.water.length)];
    world.boats.push({ x: i % n, y: Math.floor(i / n), px: i % n, py: Math.floor(i / n), face: 1, fire: false, idle: 0 });
  }
  // Fireboats for towns with waterworks that have water within reach.
  for (const t of world.towns) {
    if (!isAlive(t) || t.civ < 2 || world.boats.some(b => b.fire && b.town === t.id)) continue;
    const near = world.water.find(i => Math.hypot(i % n - t.cx, Math.floor(i / n) - t.cy) <= t.R + 4);
    if (near === undefined || Math.random() > 0.2) continue;
    world.boats.push({ x: near % n, y: Math.floor(near / n), px: near % n, py: Math.floor(near / n), face: 1, fire: true, town: t.id, water: 30, idle: 0 });
    log(`${t.name} launches a fireboat`, 'build');
  }
  const keep = [];
  for (const b of world.boats) {
    b.px = b.x; b.py = b.y; b.t0 = world.tick;
    if (world.snow[b.y * n + b.x] >= ICE_AT) { keep.push(b); continue; } // frozen in
    if (b.fire) {
      const t = world.towns[b.town];
      if (!t || !isAlive(t)) continue;
      // Find a burning cell near the water close to the town; move along water toward it and spray.
      let best = -1, bd = Infinity;
      if (t.mobilized) for (const i of world.burning) { if (world.burnLeft[i] <= 0) continue; const x = i % n, y = (i - x) / n; if (Math.hypot(x - t.cx, y - t.cy) > t.R + 8) continue; const d = Math.hypot(x - b.x, y - b.y); if (d < bd) { bd = d; best = i; } }
      if (best >= 0 && bd > 2.2) waterStep(b, best % n, Math.floor(best / n));
      else if (best >= 0) {
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = b.x + dx, y = b.y + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x; if (world.burnLeft[j] > 0 && Math.random() < 0.6) { extinguish(j, 25, 1); spray(j); } else if (isFuel(type[j]) && world.wet[j] <= 0 && Math.random() < 0.3) extinguish(j, 20, 1); }
      } else wander(b, 4, 0.12);
    } else {
      wander(b, 10, 0.5);
      // Every so often a boat lands its catch at the nearest town.
      if (b.catchT === undefined) b.catchT = 30 + Math.floor(Math.random() * 40);
      if (--b.catchT <= 0) {
        b.catchT = 40 + Math.floor(Math.random() * 60);
        let near = null, nd = Infinity; for (const t of world.towns) { if (!isAlive(t)) continue; const d = Math.hypot(t.cx - b.x, t.cy - b.y); if (d < nd && d <= t.R + 14) { nd = d; near = t; } }
        if (near) { addRes(near, 'fish', 2 + Math.floor(Math.random() * 3)); const [px, py] = cellCenter(b.y * n + b.x); for (let k = 0; k < 3; k++) particles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0, max: 400, color: '#9fd0ff', size: 2, grav: 60 }); }
      }
    }
    keep.push(b);
  }
  world.boats = keep;
}
// One cell of water travel toward (tx, ty): take the neighbouring water cell that closes the most
// distance, never the cell just left, and only move if it is no worse than holding station.
// Drift: pick a water cell within `reach` as a destination, cruise there, then rest a while.
function wander(b, reach, pace) {
  if (b.wx === undefined || (b.wx === b.x && b.wy === b.y) || Math.random() < 0.01) {
    if (b.rest === undefined) b.rest = 2 + Math.floor(Math.random() * 10);
    if (b.rest-- > 0) return;
    b.rest = undefined;
    const n = world.n;
    for (let k = 0; k < 12; k++) {
      const x = b.x + Math.floor(Math.random() * (2 * reach + 1)) - reach, y = b.y + Math.floor(Math.random() * (2 * reach + 1)) - reach;
      if (x < 0 || y < 0 || x >= n || y >= n || world.type[y * n + x] !== T.WATER) continue;
      b.wx = x; b.wy = y; break;
    }
    if (b.wx === undefined) return;
  }
  if (Math.random() < pace && !waterStep(b, b.wx, b.wy)) { b.wx = undefined; } // blocked: pick somewhere else
}
function waterStep(b, tx, ty) {
  const n = world.n, type = world.type;
  const here = Math.hypot(tx - b.x, ty - b.y);
  let bx = -1, by = -1, bd = here + 0.3; // a small allowance lets it slide along a bank
  for (let my = -1; my <= 1; my++) for (let mx = -1; mx <= 1; mx++) {
    if (!mx && !my) continue;
    const nx = b.x + mx, ny = b.y + my;
    if (nx < 0 || ny < 0 || nx >= n || ny >= n || type[ny * n + nx] !== T.WATER || world.snow[ny * n + nx] >= ICE_AT) continue;
    if (nx === b.lx && ny === b.ly) continue; // no shuffling back and forth
    const d = Math.hypot(tx - nx, ty - ny) + (mx && mx !== b.face ? 0.15 : 0); // mild preference to keep heading
    if (d < bd) { bd = d; bx = nx; by = ny; }
  }
  if (bx < 0) return false;
  b.lx = b.x; b.ly = b.y;
  if (bx !== b.x) b.face = bx > b.x ? 1 : -1;
  b.x = bx; b.y = by;
  return true;
}

