/* ───────────────────────── Townspeople ───────────────────────── */

function townRubble(town) {
  const out = [];
  for (const i of town.buildings) if (world.type[i] === T.RUBBLE) out.push(i);
  return out;
}

function updateWorkers(town) {
  const n = world.n, type = world.type, burnLeft = world.burnLeft;
  if (!town.workers) town.workers = [];
  if (town.mobilized || town.popLeft <= 0) {
    town.workers.length = 0; // everyone indoors or gone
    return;
  }
  const rubble = townRubble(town);
  const want = Math.min(5, 1 + Math.floor(town.popLeft / 40) + (rubble.length ? 1 : 0));
  const barracks = town.buildings.filter(i => world.type[i] === T.BARRACKS);
  const wantDrill = barracks.length && town.militia >= 8 ? Math.min(4, 1 + Math.floor(town.militia / 15)) : 0;
  const drilling = town.workers.filter(w => w.soldier).length;
  spawnGatherers(town);
  if (town.workers.filter(w => !w.soldier && !w.gather).length < want && world.tick % 6 === 0) {
    const home = campPoint(town);
    if (home >= 0) { const hx = home % n, hy = Math.floor(home / n); town.workers.push({ x: hx, y: hy, px: hx, py: hy, target: -1, linger: 0, face: 1, job: 'stroll' }); }
  }
  if (drilling < wantDrill && world.tick % 9 === 0) {
    const b = barracks[Math.floor(Math.random() * barracks.length)];
    town.workers.push({ x: b % n, y: Math.floor(b / n), px: b % n, py: Math.floor(b / n), target: -1, linger: 0, face: 1, job: 'drill', soldier: true, home: b });
  } else if (drilling > wantDrill) { const k = town.workers.findIndex(w => w.soldier); if (k >= 0) town.workers.splice(k, 1); }
  const keep = [];
  for (const w of town.workers) {
    w.px = w.x; w.py = w.y;
    if (burnLeft[w.y * n + w.x] > 0) continue; // ran inside
    if (w.gather) { if (updateGatherer(town, w)) keep.push(w); continue; }
    if (w.soldier) {
      // Drill in a loose square around the barracks.
      if (w.target < 0 || (w.x === w.target % n && w.y === Math.floor(w.target / n) && ++w.linger > 2 + Math.floor(Math.random() * 4))) {
        const hx = w.home % n, hy = Math.floor(w.home / n);
        const tx = hx + Math.floor(Math.random() * 5) - 2, ty = hy + Math.floor(Math.random() * 5) - 2;
        if (tx >= 0 && ty >= 0 && tx < n && ty < n && passable(type[ty * n + tx]) && !isBuilding(type[ty * n + tx])) { w.target = ty * n + tx; w.linger = 0; }
      }
      if (w.target >= 0) { stepToward(w, w.target % n, Math.floor(w.target / n), 1, false); if (w.stall > 3) { w.stall = 0; w.target = -1; } }
      keep.push(w); continue;
    }
    if (w.target < 0 || (w.job === 'rebuild' && type[w.target] !== T.RUBBLE)) {
      // Pick a job: rebuild rubble when there is any, otherwise wander the roads, or go back indoors.
      if (w.job === 'home' || (w.job !== 'rebuild' && !rubble.length && Math.random() < 0.3)) {
        if ((w.homeTries = (w.homeTries || 0) + 1) > 1) continue; // could not reach the door: they found another
        const h = campPoint(town); if (h < 0) continue; // nowhere to go: they are indoors
        w.target = h; w.job = 'home'; w.linger = 0; w.stall = 0;
      } else if ((w.bad ? rubble.filter(i => !w.bad.includes(i)) : rubble).length && Math.random() < 0.75) {
        const reachable = w.bad ? rubble.filter(i => !w.bad.includes(i)) : rubble;
        w.target = reachable[Math.floor(Math.random() * reachable.length)]; w.job = 'rebuild';
      } else {
        const farms = town.buildings.filter(i => type[i] === T.FARM);
        if (farms.length && Math.random() < 0.4) { w.target = farms[Math.floor(Math.random() * farms.length)]; w.job = 'farm'; }
        else { const roads = roadCells(town); if (roads.length) { w.target = roads[Math.floor(Math.random() * roads.length)]; w.job = 'stroll'; } }
      }
      w.linger = 0;
      if (w.target < 0) { keep.push(w); continue; }
    }
    const tx = w.target % n, ty = (w.target - tx) / n;
    if (w.job === 'home' && Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) continue; // in the door
    if (w.x === tx && w.y === ty) {
      w.linger++;
      if (w.job === 'rebuild') {
        if (Math.random() < 0.6) dust(w.target);
        if (w.linger >= 8 + Math.floor(Math.random() * 6)) {
          rebuildAt(town, w.target);
          w.target = -1;
        }
      } else if (w.linger >= 3 + Math.floor(Math.random() * 8)) w.target = -1;
    } else { stepToward(w, tx, ty, 1, false); if (w.stall > 3) { if (w.job === 'rebuild') w.bad = (w.bad || []).concat(w.target).slice(-6); w.stall = 0; w.target = -1; w.lastCell = -1; if (w.job !== 'rebuild') w.job = 'home'; } }
    keep.push(w);
  }
  town.workers = keep;
}

function rebuildAt(town, i) {
  if (world.type[i] !== T.RUBBLE) return;
  if (!canAfford(town, COST[T.HOUSE])) {
    // No timber: now and then they rebuild from what the ruins still hold. Slow, but nobody is ever stuck for good.
    if (Math.random() < 0.12) { if (!town.scavLogged || world.tick - town.scavLogged > 600) { town.scavLogged = world.tick; log(`${town.name} rebuilds with timber scavenged from the ruins`, 'build'); } }
    else { town.short = 'wood'; if (!town.shortLogged || world.tick - town.shortLogged > 300) { town.shortLogged = world.tick; log(`${town.name} wants to rebuild but has no timber`, 'loss'); } return; }
  } else pay(town, COST[T.HOUSE]); // paced by the woodpile
  town.short = null;
  world.type[i] = T.HOUSE;
  world.variant[i] = Math.random() < 0.6 ? 0 : 1;
  world.townOf[i] = town.id;
  town.housesTotal++; town.housesLeft++;
  world.buildingsTotal++; world.buildingsLeft++;
  town.built++;
  toSite(town, i, T.HOUSE);
  if (town.destroyed) { town.destroyed = false; log(`${town.name} rebuilds from the ashes`, 'build'); }
  else if (Math.random() < 0.1) log(`${town.name} is rebuilding (${town.housesLeft} homes)`, 'build');
  dirty.add(i);
}

