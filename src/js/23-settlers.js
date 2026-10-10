/* ───────────────────────── Settlers ───────────────────────── */

function updateSettlers(force) {
  const n = world.n;
  const s = world.settlers;
  if (!s) {
    const dead = world.towns.filter(t => t.housesLeft === 0 || t.popLeft <= 0);
    const living = world.towns.filter(t => !(t.housesLeft === 0 || t.popLeft <= 0));
    const maxAlive = params.maxTowns + (n >= 160 ? 1 : 0) + (n >= 240 ? 1 : 0) + (n >= 320 ? 3 : 0) + (n >= 420 ? 4 : 0); // room for more on a big map
    // Wagons come often while there is room for a town, less once the valley is full.
    const rate = living.length < maxAlive ? 0.004 : (dead.length ? 0.002 : 0.0006);
    if (!force && (world.tick < 60 || Math.random() > rate)) return;
    let plan = null;
    if (dead.length && Math.random() < 0.6) {
      const t = dead[Math.floor(Math.random() * dead.length)];
      plan = { mode: 'resettle', town: t, tx: t.cx, ty: t.cy };
    } else if (living.length < maxAlive) {
      const R = 2 + Math.floor(Math.random() * 2);
      const site = findTownSite(R, Math.random);
      if (site) plan = { mode: 'found', R, tx: site[0], ty: site[1] };
    }
    if (!plan && dead.length) { const t = dead[0]; plan = { mode: 'resettle', town: t, tx: t.cx, ty: t.cy }; }
    if (!plan && living.length) {
      // Valley is full: newcomers join the smallest town.
      const t = living.slice().sort((a, b) => a.popLeft - b.popLeft)[0];
      plan = { mode: 'join', town: t, tx: t.cx, ty: t.cy };
    }
    if (!plan) return;
    // Enter from the nearest map edge.
    const edges = [[plan.tx, 0], [plan.tx, n - 1], [0, plan.ty], [n - 1, plan.ty]];
    edges.sort((a, b) => Math.hypot(a[0] - plan.tx, a[1] - plan.ty) - Math.hypot(b[0] - plan.tx, b[1] - plan.ty));
    let [ex, ey] = edges[Math.random() < 0.7 ? 0 : 1];
    // Slide along the edge to a passable cell.
    for (let k = 0; k < n && !passable(world.type[ey * n + ex]); k++) { if (ey === 0 || ey === n - 1) ex = (ex + 1) % n; else ey = (ey + 1) % n; }
    const path = findPath(ex, ey, plan.tx, plan.ty);
    if (!path) return; // no way in from that edge this time
    const size = Math.random() < 0.15 ? 30 + Math.floor(Math.random() * 40) : 8 + Math.floor(Math.random() * 20); // mostly small parties, sometimes a whole caravan
    world.settlers = { ...plan, x: ex, y: ey, px: ex, py: ey, face: 1, wait: 0, path, pi: 0, size };
    say(plan.town || null, 'settlersAppear', { edge: ey === 0 ? 'north' : ey === n - 1 ? 'south' : ex === 0 ? 'west' : 'east', n: size, bound: plan.town ? plan.town.name : null }, 'build');
    return;
  }
  s.px = s.x; s.py = s.y;
  const here = s.y * n + s.x;
  if (world.burnLeft[here] > 0) {
    world.settlers = null;
    say(s.town || null, 'settlersLost', { n: s.size, bound: s.town ? s.town.name : null }, 'loss');
    world.deaths += s.size; stat('deaths', 'fire', s.size); stat('deathsTown', 'settlers on the road', s.size);
    const [px, py] = cellCenter(here);
    popups.push({ x: px, y: py, text: '+', color: '#ff8a73', t0: performance.now(), dur: 1400 });
    return;
  }
  // Follow the path. Fire on the next cell: wait a bit, then look for a way around, then give up.
  let arrived = s.pi >= s.path.length;
  if (!arrived) {
    const next = s.path[s.pi];
    if (world.burnLeft[next] > 0 || !passable(world.type[next])) {
      if (++s.wait > 12) {
        const alt = findPath(s.x, s.y, s.tx, s.ty);
        if (alt) { s.path = alt; s.pi = 0; s.wait = 0; }
        else if (s.wait > 60) { world.settlers = null; say(null, 'settlersTurnBack', {}, 'weather'); return; }
      }
      return;
    }
    s.wait = 0;
    const nx = next % n, ny = (next - nx) / n;
    if (nx !== s.x) s.face = Math.sign(nx - s.x);
    s.x = nx; s.y = ny; s.pi++;
    arrived = s.pi >= s.path.length;
  }
  if (!arrived) return;

  if (s.mode === 'found') {
    const town = foundTown(s.tx, s.ty, s.R, { houseScale: 0.6, stationChance: 0.05, live: true });
    if (town) {
      // The wagon is the whole population. Houses they raised beyond that stand empty until they grow into them.
      const delta = s.size - town.popLeft;
      town.popLeft += delta; town.popTotal += delta; world.popLeft += delta; world.popTotal += delta;
      town.res.wood = 10 + Math.min(20, s.size); town.res.grain = Math.min(40, 6 + Math.min(12, Math.floor(s.size / 2))); // what the wagon carried
      const el = person(town, 'elder'); if (el) { el.story = 'led the wagons that founded the town'; deed(el, `founded ${town.name}`); }
      say(town, 'settlersFound', { n: s.size, homes: town.housesLeft, leader: el ? el.name : null }, 'build');
      const [px, py] = cellCenter(s.ty * n + s.tx);
      popups.push({ x: px, y: py - town.R * cellPx, text: town.name.toUpperCase(), color: '#d9c48a', t0: performance.now(), dur: 2500 });
    } else say(null, 'settlersNoGround', {}, 'weather');
  } else if (s.mode === 'join') {
    const t = s.town;
    t.popLeft += s.size; t.popTotal += s.size; world.popLeft += s.size; world.popTotal += s.size;
    t.growTimer = 1;
    if (s.refugees) say(t, 'refugeesIn', { n: s.size, from: s.refugees }, 'build'); else say(t, 'newcomers', { n: s.size, pop: t.popLeft }, 'build');
  } else {
    const t = s.town;
    t.popLeft += s.size; t.popTotal += s.size; world.popLeft += s.size; world.popTotal += s.size;
    t.lastThreat = -1000; t.growTimer = 1;
    t.res.wood = Math.min(resCap(t, 'wood'), (t.res.wood || 0) + 8 + Math.min(16, s.size)); t.res.grain = Math.min(resCap(t, 'grain'), (t.res.grain || 0) + 6 + Math.floor(s.size / 2));
    let built = 0;
    for (let k = 0; k < 2; k++) if (buildHouse(t, true)) built++;
    say(t, 'resettle', { n: s.size, pop: t.popLeft, built }, 'build');
  }
  world.settlers = null;
}

function throwEmber(x, y, hasWind, crown) {
  const n = world.n;
  let dx, dy;
  const far = crown ? 2.2 : 1;
  if (hasWind) {
    const dist = 2 + Math.random() * (3 + 4 * params.windStrength) * far;
    const base = Math.atan2(params.windY, params.windX) + (Math.random() - 0.5) * 0.9;
    dx = Math.round(Math.cos(base) * dist); dy = Math.round(Math.sin(base) * dist);
  } else {
    const a = Math.random() * Math.PI * 2, dist = 2 + Math.random() * 2.5 * far;
    dx = Math.round(Math.cos(a) * dist); dy = Math.round(Math.sin(a) * dist);
  }
  const tx = x + dx, ty = y + dy;
  if (tx < 0 || ty < 0 || tx >= n || ty >= n) return;
  const j = ty * n + tx;
  if (!isFuel(world.type[j]) || world.burnLeft[j] > 0) return;
  let p = FUEL[world.type[j]].ignite * (crown ? 0.9 : 0.8) * (world.mat[j] ? 0.15 : 1);
  if (world.wet[j] > 0) p *= 0.1;
  if (Math.random() < p) {
    ignite(j);
    const [ax, ay] = cellCenter(y * n + x), [bx, by] = cellCenter(j);
    particles.push({ x: ax, y: ay, vx: (bx - ax) * 2.2, vy: (by - ay) * 2.2 - 25, life: 0, max: 450, color: crown ? '#fff0b0' : '#ffb627', size: Math.max(1.5, cellPx * (crown ? 0.4 : 0.3)), grav: 110 });
  }
}

function onHangarDestroyed(why) {
  const air = world.air;
  if (!air) return;
  const n = world.n;
  for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) {
    const i = (air.y + dy) * n + air.x + dx;
    if (world.type[i] === T.PAD) { world.type[i] = T.RUBBLE; dirty.add(i); }
  }
  say(null, 'airstripLost', { owner: air.owner, why }, 'loss');
  world.air = null;
}

function burnout(i) {
  const t = world.type[i];
  if (t === T.BRIDGE || t === T.DAM) {
    // Back to river.
    world.type[i] = T.WATER; world.road[i] = 0; world.burnLeft[i] = 0; world.water.push(i); dirty.add(i); world.burnedCount++;
    if (t === T.BRIDGE) { const [nt, nd] = nearestTown(i % world.n, Math.floor(i / world.n)); say(nt && nd < 40 ? nt : null, 'bridgeBurns', {}, 'loss', i); }
    return;
  }
  if (t === T.FARM) { const tw = world.towns[world.townOf[i]]; if (tw) tw.farmsLost = (tw.farmsLost || 0) + 1; if (world.cropKind) world.cropKind[i] = 0; }
  if (t === T.SITE) { const tw = world.towns[world.townOf[i]]; if (tw && tw.sites) delete tw.sites[i]; }
  if (isTree(t)) { world.treeCount--; stat('ev', 'treesBurned'); }
  if (isBuilding(t)) onBuildingDestroyed(i, 'fire');
  if (t === T.HANGAR) onHangarDestroyed('burns to the ground');
  const after = FUEL[t] ? FUEL[t].after : T.ASH;
  if (world.mat[i] && isBuilding(t) && after === T.RUBBLE) { world.type[i] = T.SHELL; stat('ev', 'shells'); } // the roof is gone; the walls stand
  else { world.type[i] = after; world.mat[i] = 0; }
  world.burnLeft[i] = 0;
  world.glow[i] = 4 + Math.floor(Math.random() * 5);
  world.glowing.push(i);
  world.burnedCount++;
  world.since[i] = world.tick;
  dirty.add(i);
}

function strikeCell(cx, cy, radius) {
  const n = world.n;
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2 + 0.5) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const i = y * n + x;
      const t = world.type[i];
      const d2 = dx * dx + dy * dy;
      const inner = radius <= 1 ? d2 === 0 : d2 <= Math.max(1, radius - 1) ** 2;
      if (t === T.WATER || t === T.ROCK || t === T.RUBBLE) continue;
      if (inner) {
        // Crater: roads, firebreaks and pads are torn up; buildings and the hangar come down; fuel is scorched.
        if (t === T.DIRT) { world.road[i] = 0; world.type[i] = T.ASH; }
        else if (t === T.PAD || t === T.WALL) { world.type[i] = T.RUBBLE; }
        else if (t === T.HANGAR) { onHangarDestroyed('is flattened by the blast'); world.type[i] = T.RUBBLE; }
        else if (isFuel(t)) {
          if (isTree(t)) world.treeCount--;
          if (isBuilding(t)) onBuildingDestroyed(i, 'blast');
          if (world.burnLeft[i] > 0) world.burnLeft[i] = 0;
          world.type[i] = FUEL[t].after === T.RUBBLE ? T.RUBBLE : T.ASH; world.mat[i] = 0; // a blast flattens stone too
          world.burnedCount++;
        } else continue;
        world.since[i] = world.tick;
        world.glow[i] = 6; world.glowing.push(i);
      } else if (isFuel(t)) {
        // Outer ring: buildings may collapse from the shock, everything else catches.
        if (isBuilding(t) && Math.random() < 0.5) {
          onBuildingDestroyed(i, 'blast');
          if (world.burnLeft[i] > 0) world.burnLeft[i] = 0;
          world.type[i] = T.RUBBLE; world.burnedCount++;
          world.since[i] = world.tick; world.glow[i] = 6; world.glowing.push(i);
        } else ignite(i);
      } else continue;
      dirty.add(i);
    }
  }
  for (const town of world.towns) {
    town.crews = town.crews.filter(c => {
      if (Math.hypot(c.x - cx, c.y - cy) <= radius) { loseCrew(town, c, 'caught in the blast'); return false; }
      return true;
    });
    for (const tr of town.trucks) if (tr.alive && Math.hypot(tr.x - cx, tr.y - cy) <= radius) loseTruck(town, tr, 'destroyed in the blast');
  }
}

