/* ───────────────────────── Wild herds ─────────────────────────
   Deer, boar, wild sheep, grouse and the odd aurochs roam the open ground, flee fire, and breed
   slowly. Hunters take game from them, and sometimes bring a young one home alive to raise. */
const HERD_KINDS = [['deer', 0.35, 'deer', null, 5], ['boar', 0.15, 'boar', 'pigs', 4], ['sheep', 0.12, 'sheep', 'sheep', 3], ['fowl', 0.12, 'fowl', 'chickens', 2], ['aurochs', 0.04, 'aurochs', 'cattle', 8], ['elk', 0.1, 'elk', null, 7], ['hare', 0.12, 'hare', null, 1]];
const HERD_NAME = { deer: 'deer', boar: 'wild boar', sheep: 'wild sheep', fowl: 'grouse', aurochs: 'aurochs', elk: 'elk', hare: 'hares' };
const LIVESTOCK = ['cattle', 'pigs', 'sheep', 'chickens'];
const LIVESTOCK_FOOD = { cattle: 3, pigs: 2, sheep: 1.5, chickens: 0.5 };
const LIVESTOCK_SPRITE = { cattle: 'cow', pigs: 'pig', sheep: 'sheep', chickens: 'chicken' };
function herdKind() { let r = rand ? Math.random() : Math.random(); for (const k of HERD_KINDS) { r -= k[1]; if (r <= 0) return k; } return HERD_KINDS[0]; }
// Is the straight line from (x0,y0) to (x1,y1) walkable? Beasts will not set out across water.
function clearLine(x0, y0, x1, y1) {
  const n = world.n, steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 1; k <= steps; k++) { const x = Math.round(x0 + (x1 - x0) * k / steps), y = Math.round(y0 + (y1 - y0) * k / steps); if (x < 0 || y < 0 || x >= n || y >= n) return false; const t = world.type[y * n + x]; if (!passable(t) || isBuilding(t)) return false; }
  return true;
}
function herdCell(i) { const t = world.type[i]; return (t === T.GRASS || t === T.SCRUB || t === T.REEDS || t === T.SAND || isTree(t) || t === T.ASH || t === T.MUD || t === T.STUMP) && !world.road[i] && world.townOf[i] < 0 && world.burnLeft[i] <= 0; }
function seedHerds(n) {
  const N = n * n, want = Math.max(4, Math.round(N / 1200));
  for (let k = 0; k < want; k++) {
    let i = -1; for (let tries = 0; tries < 200 && i < 0; tries++) { const c = Math.floor(rand() * N); if (herdCell(c)) i = c; }
    if (i < 0) break;
    const kind = herdKindFor(world.biome[i]);
    world.herds.push({ kind: kind[0], x: i % n, y: Math.floor(i / n), px: i % n, py: Math.floor(i / n), face: 1, size: kind[0] === 'fowl' ? 6 + Math.floor(rand() * 6) : kind[0] === 'hare' ? 6 + Math.floor(rand() * 8) : 3 + Math.floor(rand() * 5), wx: -1, wy: -1, rest: 0, t0: 0, breedT: 0 });
  }
}
function updateHerds() {
  if (world.tick % 3 !== 0) return;
  const n = world.n, N = n * n, herds = world.herds || (world.herds = []), keep = [];
  const maxHerds = Math.max(6, Math.round(N / 1000));
  const migration = season() === 2 && world.tick % YEAR < YEAR * 0.5 + 200; // the first weeks of autumn: the herds come down from the hills
  if (migration && world.migrationYear !== Math.floor(world.tick / YEAR)) { world.migrationYear = Math.floor(world.tick / YEAR); say(null, 'migration', {}, 'weather'); stat('ev', 'migrations'); }
  const scarce = herds.filter(h => h.size > 0).length < maxHerds / 3; // hunted thin: more come in from beyond the edge
  if (herds.length < maxHerds && Math.random() < (migration ? 0.036 : 0.012) * (scarce ? 3 : 1)) { // a new herd wanders in from the edge
    const edge = Math.floor(Math.random() * 4); let x = Math.floor(Math.random() * n), y = Math.floor(Math.random() * n);
    if (edge === 0) y = 0; else if (edge === 1) y = n - 1; else if (edge === 2) x = 0; else x = n - 1;
    if (herdCell(y * n + x)) { const kind = herdKindFor(world.biome[y * n + x]); herds.push({ kind: kind[0], x, y, px: x, py: y, face: 1, size: kind[0] === 'hare' ? 5 + Math.floor(Math.random() * 6) : (migration ? 4 : 2) + Math.floor(Math.random() * (migration ? 6 : 4)), wx: -1, wy: -1, rest: 0, t0: world.tick, breedT: 0 }); }
  }
  for (const h of herds) {
    if (h.size <= 0) continue; // hunted out
    h.px = h.x; h.py = h.y; h.t0 = world.tick;
    const here = h.y * n + h.x;
    if (world.burnLeft[here] > 0) { const lost = Math.min(h.size, 1 + Math.floor(Math.random() * 2)); h.size -= lost; stat('ev', 'animalsBurned', lost); if (h.size <= 0) continue; h.wx = -1; }
    // Fire nearby: run the other way.
    let fx = 0, fy = 0, scared = false;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = h.x + dx, y = h.y + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; if (world.burnLeft[y * n + x] > 0) { fx += dx; fy += dy; scared = true; } }
    if (scared) {
      // Run away from the fire; if that way is blocked, try sideways.
      let set = false;
      for (const [ax, ay] of [[-Math.sign(fx), -Math.sign(fy)], [-Math.sign(fy), Math.sign(fx)], [Math.sign(fy), -Math.sign(fx)]]) {
        const tx = Math.max(0, Math.min(n - 1, h.x + ax * 8)), ty = Math.max(0, Math.min(n - 1, h.y + ay * 8));
        if ((ax || ay) && clearLine(h.x, h.y, tx, ty)) { h.wx = tx; h.wy = ty; set = true; break; }
      }
      if (!set) { h.wx = -1; }
      h.rest = 0; h.leaving = false;
    }
    else if (h.wx < 0 || (h.wx === h.x && h.wy === h.y)) {
      if (h.leaving) { if (Math.random() < 0.3) say(null, 'herdLeaves', { kind: HERD_NAME[h.kind] || h.kind }, 'weather'); continue; } // over the edge and gone
      if (h.rest > 0) { h.rest--; keep.push(h); continue; }
      const nearEdge = Math.min(h.x, h.y, n - 1 - h.x, n - 1 - h.y) <= 6;
      if (nearEdge && Math.random() < 0.03) { // wander off the map
        h.wx = h.x <= 6 ? 0 : n - 1 - h.x <= 6 ? n - 1 : h.x; h.wy = h.y <= 6 ? 0 : n - 1 - h.y <= 6 ? n - 1 : h.y; h.leaving = true;
      } else {
        for (let k = 0; k < 10; k++) { const x = h.x + Math.floor(Math.random() * 17) - 8, y = h.y + Math.floor(Math.random() * 17) - 8; if (x < 0 || y < 0 || x >= n || y >= n || !herdCell(y * n + x) || !clearLine(h.x, h.y, x, y)) continue; h.wx = x; h.wy = y; break; }
        h.rest = 4 + Math.floor(Math.random() * 10);
      }
    }
    if (h.wx >= 0) {
      const steps = scared ? 2 : 1; // they run from fire
      for (let st = 0; st < steps; st++) {
        const dx = Math.sign(h.wx - h.x), dy = Math.sign(h.wy - h.y);
        if (!dx && !dy) break;
        const before = Math.max(Math.abs(h.wx - h.x), Math.abs(h.wy - h.y)), from = h.y * n + h.x;
        let moved = false;
        for (let pass = 0; pass < 2 && !moved; pass++) for (const [mx, my] of [[dx, dy], [dx, 0], [0, dy], [-dx, dy], [dx, -dy]]) {
          if (!mx && !my) continue;
          const x = h.x + mx, y = h.y + my; if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const j = y * n + x; if (pass === 0 && j === h.last) continue; // no shuffling back into the cell just left
          if (!passable(world.type[j]) || isBuilding(world.type[j]) || world.burnLeft[j] > 0) continue;
          h.x = x; h.y = y; if (mx) h.face = mx; moved = true; break;
        }
        if (!moved) { h.wx = -1; h.leaving = false; break; }
        h.last = from;
        const after = Math.max(Math.abs(h.wx - h.x), Math.abs(h.wy - h.y));
        h.stall = after < before ? 0 : (h.stall || 0) + 1;
        if (h.stall > 1) { h.wx = -1; h.leaving = false; h.stall = 0; h.rest = 6; h.last = -1; break; } // blocked: graze a while, then pick somewhere else
      }
    }
    if (++h.breedT >= (h.kind === 'hare' ? 20 : h.size < 5 ? 35 : 50) && h.size < 16) { h.breedT = 0; if (Math.random() < 0.6) h.size++; } // a small herd recovers a little faster // a new animal every ~250 ticks; hares breed like hares
    keep.push(h);
  }
  world.herds = keep;
}

