/* ───────────────────────── Beavers ───────────────────────── */

function updateBeavers() {
  const n = world.n, type = world.type;
  const b = world.beavers;
  if (!b) {
    if (!world.river.length || world.tick < 300 || Math.random() > 0.0006) return;
    // A river cell with trees to chew on, away from towns.
    for (let tries = 0; tries < 60; tries++) {
      const i = world.river[Math.floor(Math.random() * world.river.length)];
      if (world.flow[i] === i) continue;
      const x = i % n, y = (i - x) / n;
      let trees = 0; for (const [ox, oy] of OFFS8) { const xx = x + ox, yy = y + oy; if (xx >= 0 && yy >= 0 && xx < n && yy < n && isTree(type[yy * n + xx])) trees++; }
      if (trees < 2) continue;
      if (world.towns.some(t => Math.hypot(t.cx - x, t.cy - y) < t.R + 7)) continue;
      world.beavers = { cell: i, x, y, stage: 'building', progress: 0, pond: new Set(), lodge: null }; stat('ev', 'beavers');
      let near = null, nd = Infinity; for (const t of world.towns) { const d = Math.hypot(t.cx - x, t.cy - y); if (d < nd) { nd = d; near = t; } }
      log(`Beavers are at work on the river${near ? ' ' + (nd < 25 ? 'near ' : 'far from ') + near.name : ''}`, 'build');
      return;
    }
    return;
  }
  // Fire nearby kills the colony.
  const bx = b.cell % n, by = (b.cell - bx) / n;
  let hot = false; for (let dy = -2; dy <= 2 && !hot; dy++) for (let dx = -2; dx <= 2; dx++) { const x = bx + dx, y = by + dy; if (x >= 0 && y >= 0 && x < n && y < n && world.burnLeft[y * n + x] > 0) { hot = true; break; } }
  if (hot || type[b.cell] === T.WATER && b.stage === 'built') {
    // Dam burned or washed out: pond drains, beavers gone.
    if (b.stage === 'built') { for (const i of b.pond) { if (type[i] === T.WATER) { const orig = world.floodOrig.get(i); type[i] = orig === T.RUBBLE ? T.RUBBLE : T.MUD; world.since[i] = world.tick; dirty.add(i); } world.floodOrig.delete(i); } world.flooded = world.flooded.filter(i => !b.pond.has(i)); if (type[b.cell] === T.DAM) { type[b.cell] = T.WATER; dirty.add(b.cell); } log('The beaver dam is gone and the pond drains to mud', 'weather'); }
    else log('Fire reaches the beavers before the dam is finished', 'loss');
    world.beavers = null; return;
  }
  if (b.stage === 'building') {
    if (world.tick % 3 === 0 && Math.random() < 0.4) dust(b.cell);
    if (++b.progress < 140) return;
    // Dam up: the cell becomes a dam, the ground upstream below the new water line floods.
    type[b.cell] = T.DAM; dirty.add(b.cell);
    const up = upstreamOf(b.cell, 18);
    const before = new Set(world.flooded);
    const count = floodArea(up.length ? up : [b.cell], 0.02, 3, true, 'The beaver pond rises');
    for (const i of world.flooded) if (!before.has(i)) b.pond.add(i);
    b.stage = 'built';
    log(`The beavers finish their dam. A pond of ${count} cells spreads behind it.`, 'build');
    return;
  }
  // Built: the colony lives on, occasionally repairing. Townsfolk may trap it out if a town is close and hungry.
  if (Math.random() < 0.00005) { log('The beavers move on. Their dam will not last.', 'weather'); b.stage = 'abandoned'; b.decay = 400; return; }
  if (b.stage === 'abandoned' && --b.decay <= 0) { type[b.cell] = T.WATER; dirty.add(b.cell); for (const i of b.pond) { if (type[i] === T.WATER) { type[i] = T.MUD; world.since[i] = world.tick; dirty.add(i); } world.floodOrig.delete(i); } world.flooded = world.flooded.filter(i => !b.pond.has(i)); world.beavers = null; log('The old beaver dam gives way', 'weather'); }
}

