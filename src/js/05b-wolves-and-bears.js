/* ───────────────────────── Wolves and bears ─────────────────────────
   Packs come down in hard winters and take sheep from the pastures and the odd forager from the
   woods; hunters and militia go out after them. A bear lives in the deep timber and does not like
   company. Both are visible, both run from fire, both can be killed. */

function updatePacks() {
  if (world.tick % 3 !== 0) return;
  const n = world.n, N = n * n, packs = world.packs || (world.packs = []), keep = [];
  const cold = (world.snowCover || 0) > 0.3 || season() === 3;
  const maxPacks = Math.max(1, Math.round(N / 14000));
  if (packs.length < maxPacks && Math.random() < (cold ? 0.004 : 0.0008) * (season() === 2 && world.tick % YEAR < YEAR * 0.5 + 300 ? 3 : 1)) { // the packs follow the herds down
    const edge = Math.floor(Math.random() * 4); let x = Math.floor(Math.random() * n), y = Math.floor(Math.random() * n);
    if (edge === 0) y = 0; else if (edge === 1) y = n - 1; else if (edge === 2) x = 0; else x = n - 1;
    if (herdCell(y * n + x)) { packs.push({ kind: 'wolves', x, y, px: x, py: y, face: 1, size: 3 + Math.floor(Math.random() * 4), wx: -1, wy: -1, rest: 0, t0: world.tick, hunger: 0, next: world.tick + 100 }); stat('ev', 'packs'); if (Math.random() < 0.6) log(`Wolves come down ${cold ? 'with the snow' : 'out of the far timber'}: a pack of ${packs[packs.length - 1].size} on the ${edge === 0 ? 'north' : edge === 1 ? 'south' : edge === 2 ? 'west' : 'east'} edge`, 'weather'); }
  }
  if (!packs.some(p => p.kind === 'bear') && Math.random() < 0.0006) {
    let i = -1; for (let tries = 0; tries < 100 && i < 0; tries++) { const c = Math.floor(Math.random() * N); if (isTree(world.type[c]) && world.townOf[c] < 0 && !world.towns.some(t => Math.hypot(t.cx - c % n, t.cy - Math.floor(c / n)) < t.R + 10)) i = c; }
    if (i >= 0) { packs.push({ kind: 'bear', x: i % n, y: Math.floor(i / n), px: i % n, py: Math.floor(i / n), face: 1, size: 1, wx: -1, wy: -1, rest: 0, t0: world.tick, hunger: 0, next: world.tick }); stat('ev', 'bears'); log('Hunters report a bear in the deep timber. Nobody goes that way for a while.', 'weather'); }
  }
  for (const p of packs) {
    if (p.size <= 0) continue;
    p.px = p.x; p.py = p.y; p.t0 = world.tick;
    const here = p.y * n + p.x;
    if (world.burnLeft[here] > 0) { p.size--; stat('ev', 'animalsBurned'); if (p.size <= 0) continue; p.wx = -1; }
    let fx = 0, fy = 0, scared = false;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; if (world.burnLeft[y * n + x] > 0) { fx += dx; fy += dy; scared = true; } }
    if (scared) { const tx = Math.max(0, Math.min(n - 1, p.x - Math.sign(fx) * 8)), ty = Math.max(0, Math.min(n - 1, p.y - Math.sign(fy) * 8)); p.wx = tx; p.wy = ty; p.rest = 0; }
    else {
      p.hunger++;
      const hungry = p.hunger > (p.kind === 'bear' ? 60 : 40);
      // Prey: the nearest herd, or in a hard winter a pasture, or whoever is alone in the woods.
      let target = -1;
      if (hungry && world.tick >= p.next) {
        let best = null, bd = 14; for (const h of world.herds || []) { if (h.size <= 0) continue; const d = Math.hypot(h.x - p.x, h.y - p.y); if (d < bd) { bd = d; best = h; } }
        if (best) { if (bd <= 1.5) { best.size--; best.wx = -1; best.rest = 0; p.hunger = 0; p.next = world.tick + 150; stat('ev', 'wolfKills'); } else target = best.y * n + best.x; }
        else {
          let town = null, td = p.kind === 'bear' ? 16 : (cold ? 40 : 22); for (const t of world.towns) { if (!isAlive(t)) continue; const d = Math.hypot(t.cx - p.x, t.cy - p.y); if (d < td) { td = d; town = t; } }
          if (town) {
            // A lone worker outside the walls is easy meat.
            const lone = (town.workers || []).find(w => (w.job === 'forage' || w.job === 'hunt' || w.job === 'log' || w.job === 'fugitive') && Math.hypot(w.x - p.x, w.y - p.y) <= 1.5);
            if (lone && Math.random() < (p.kind === 'bear' ? 0.5 : 0.25)) {
              town.workers = (town.workers || []).filter(w => w !== lone); applyLosses(town, 1, p.kind === 'bear' ? 'bear' : 'wolves'); p.hunger = 0; p.next = world.tick + 300; stat('ev', p.kind === 'bear' ? 'bearKills' : 'wolfKills');
              log(`${p.kind === 'bear' ? 'The bear' : 'Wolves'} take${p.kind === 'bear' ? 's' : ''} ${lone.job === 'forage' ? 'a forager' : lone.job === 'hunt' ? 'a hunter' : lone.job === 'log' ? 'a logger' : 'someone'} from ${town.name} in the woods ${daypart()}`, 'loss');
            } else if (p.kind === 'wolves' && cold && Math.hypot(town.cx - p.x, town.cy - p.y) <= town.R + 3) {
              const k = ['sheep', 'chickens', 'pigs'].find(k => (town.livestock || {})[k] > 0);
              if (k) { const took = Math.min(town.livestock[k], 1 + Math.floor(Math.random() * 2)); town.livestock[k] -= took; p.hunger = 0; p.next = world.tick + 200; stat('ev', 'wolfKills', took); log(`Wolves take ${took} ${k} from ${town.name}'s pasture in the night`, 'loss'); }
              else { p.next = world.tick + 100; }
              // The town answers: hunters and militia go out, and the pack pays.
              if (town.militia >= 4 || (town.workers || []).some(w => w.job === 'hunt')) { const dead = Math.min(p.size, 1 + Math.floor(Math.random() * 2)); p.size -= dead; stat('ev', 'wolvesKilled', dead); p.wx = Math.max(0, Math.min(n - 1, p.x + (p.x - town.cx > 0 ? 10 : -10))); p.wy = p.y; log(`${town.name}'s ${(town.workers || []).some(w => w.job === 'hunt') ? 'hunters' : 'militia'} go out after the wolves and kill ${dead}. The rest run for the trees.`, 'win'); if (p.size <= 0) continue; }
              target = -1;
            } else if (p.kind === 'wolves' && cold) target = town.cy * n + town.cx;
          }
        }
      }
      if (target >= 0) { p.wx = target % n; p.wy = Math.floor(target / n); p.rest = 0; }
      else if (p.wx < 0 || (p.wx === p.x && p.wy === p.y)) {
        if (p.rest > 0) { p.rest--; keep.push(p); continue; }
        const nearEdge = Math.min(p.x, p.y, n - 1 - p.x, n - 1 - p.y) <= 6;
        if (nearEdge && !cold && Math.random() < 0.1) { if (Math.random() < 0.5) log(`${p.kind === 'bear' ? 'The bear' : 'The wolves'} move on over the ${p.x <= 6 ? 'west' : n - 1 - p.x <= 6 ? 'east' : p.y <= 6 ? 'north' : 'south'} edge`, 'weather'); continue; }
        for (let k = 0; k < 10; k++) { const x = p.x + Math.floor(Math.random() * 17) - 8, y = p.y + Math.floor(Math.random() * 17) - 8; if (x < 0 || y < 0 || x >= n || y >= n || !herdCell(y * n + x) || !clearLine(p.x, p.y, x, y)) continue; p.wx = x; p.wy = y; break; }
        p.rest = p.kind === 'bear' ? 10 + Math.floor(Math.random() * 20) : 3 + Math.floor(Math.random() * 8);
      }
    }
    // Hunters with a bow and a reason bring a bear down.
    if (p.kind === 'bear') { const t = world.towns.find(t => isAlive(t) && Math.hypot(t.cx - p.x, t.cy - p.y) <= t.R + 12 && (t.workers || []).some(w => w.job === 'hunt' && Math.hypot(w.x - p.x, w.y - p.y) <= 3)); if (t && Math.random() < 0.3) { addRes(t, 'game', 6); const h = person(t, 'hunter'); if (h) deed(h, 'brought down the bear in the deep timber'); stat('ev', 'bearsKilled'); log(`${t.name}'s hunters bring down the bear${h ? `; ${h.name} took the shot` : ''}. There is meat for a month.`, 'win'); continue; } }
    if (p.wx >= 0) {
      const steps = scared ? 2 : 1;
      for (let st = 0; st < steps; st++) { const dx = Math.sign(p.wx - p.x), dy = Math.sign(p.wy - p.y); if (!dx && !dy) break; let moved = false; for (const [mx, my] of [[dx, dy], [dx, 0], [0, dy], [-dx, dy], [dx, -dy]]) { const nx = p.x + mx, ny = p.y + my; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue; const j = ny * n + nx; if (!passable(world.type[j]) || isBuilding(world.type[j]) || world.burnLeft[j] > 0) continue; p.x = nx; p.y = ny; moved = true; if (mx) p.face = mx; break; } if (!moved) { p.wx = -1; break; } }
    }
    keep.push(p);
  }
  world.packs = keep;
}
