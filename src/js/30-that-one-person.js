/* ───────────────────────── That one person ───────────────────────── */

const ACCIDENTS = [
  'A campfire got away from someone outside %s',
  'A brush pile burn near %s jumped its ring',
  'Sparks from a chainsaw started a fire outside %s',
  'Fireworks in %s landed in the dry grass',
  'A downed power line outside %s is arcing',
  'Someone in %s dumped a barbecue in the weeds',
];

// Rare on purpose. Long stretches of calm are part of the show.
function maybeArson(town) {
  if (town.mobilized || town.popLeft < 8) return;
  // Factory sparks: industry burns things down now and then.
  const factories = countType(town, T.FACTORY) + countType(town, T.FORGE) * 0.5;
  if (factories && Math.random() < 0.00006 * factories * (world.weather.kind === 'drought' ? 3 : 1)) {
    const f = town.buildings.find(i => world.type[i] === T.FACTORY || world.type[i] === T.FORGE);
    if (f !== undefined && world.burnLeft[f] <= 0) { ignite(f); log(`Fire breaks out at the ${world.type[f] === T.FACTORY ? 'factory' : 'forge'} in ${town.name}`, 'alarm'); return; }
  }
  const wk = world.weather.kind;
  const weatherMul = wk === 'drought' ? 2.5 : (wk === 'clear' ? 1 : 0.15);
  const r = Math.random();
  let cause = null;
  if (r < 0.00012 * (town.align.moral < 0 ? 3 : town.align.moral > 0 ? 0.5 : 1)) cause = 'arson';
  else if (r < 0.00012 + 0.00018 * weatherMul) cause = 'accident';
  if (!cause) return;
  const n = world.n;
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.random() * Math.PI * 2, d = town.R + 2 + Math.random() * 4;
    const x = Math.round(town.cx + Math.cos(a) * d), y = Math.round(town.cy + Math.sin(a) * d);
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x;
    if (!isFuel(world.type[i]) || isBuilding(world.type[i]) || world.burnLeft[i] > 0) continue;
    ignite(i);
    const [px, py] = cellCenter(i);
    if (cause === 'arson') {
      popups.push({ x: px, y: py, text: 'ARSON', color: '#ff6ad5', t0: performance.now(), dur: 2200 });
      const bug = person(town, 'firebug');
      if (!bug) log(`Someone from ${town.name} set a fire on the edge of town`, 'arson');
      else {
        bug.arsons = (bug.arsons || 0) + 1; deed(bug, 'set a fire on the edge of town');
        if (bug.arsons === 1) log(`Someone from ${town.name} set a fire on the edge of town. Nobody saw who.`, 'arson');
        else if (bug.arsons === 2) log(`Another fire set on the edge of ${town.name}. People are starting to talk about ${bug.name}.`, 'arson');
        else { bug.revealed = true; log(`${bug.name} set a fire on the edge of ${town.name} again. This time they were seen.`, 'arson'); if (Math.random() < 0.5) { bug.alive = false; bug.died = world.tick; bug.cause = 'run out of town'; log(`${town.name} runs ${bug.name} out of town for good`, 'win'); elect(town, 'firebug', true); } }
      }
    } else {
      popups.push({ x: px, y: py, text: 'OOPS', color: '#ffb627', t0: performance.now(), dur: 1800 });
      log(ACCIDENTS[Math.floor(Math.random() * ACCIDENTS.length)].replace('%s', town.name), 'alarm');
    }
    return;
  }
}

// A standing building to come out of: crews and townsfolk are based somewhere real.
function musterPoint(town) {
  const standing = town.buildings.filter(i => isBuilding(world.type[i]) && world.burnLeft[i] <= 0);
  if (!standing.length) return -1;
  return standing[Math.floor(Math.random() * standing.length)];
}
// Where the townsfolk gather for work: a standing building, else the ruins, else a campfire at the centre.
function campPoint(town) {
  const m = musterPoint(town); if (m >= 0) return m;
  const rubble = townRubble(town).filter(i => world.burnLeft[i] <= 0);
  if (rubble.length) return rubble[Math.floor(Math.random() * rubble.length)];
  const c = town.cy * world.n + town.cx;
  return passable(world.type[c]) && world.burnLeft[c] <= 0 ? c : -1;
}

// Greedy walking with two safeguards: never step straight back into the cell just left (that is
// what made people shuffle between two cells), and count steps that bring the target no closer
// in a.stall so callers can give up on an unreachable target.
// How far a walker gets per tick on a given cell: a road is the fast way, forest and marsh are slow going.
function terrainSpeed(i) {
  if (world.road[i]) return 1.6;
  const t = world.type[i];
  let v = (t === T.BRIDGE) ? 1.6 : (t === T.SCRUB || t === T.REEDS || t === T.CACTUS) ? 0.75 : (t === T.MUD) ? 0.5 : (t === T.JUNGLE) ? 0.4 : isTree(t) ? 0.55 : 1;
  if (world.biome && world.biome[i] === 4 && !isBuilding(t)) v *= 0.8; // marsh ground
  if (world.snowLv && world.snowLv[i] >= 3) v *= 0.6; // wading through snow
  return v;
}
function stepToward(a, tx, ty, speed, allowBurning) {
  const n = world.n, type = world.type;
  // Movement is a budget: fast ground earns more than a step a tick, slow ground less.
  a.move = Math.min(3, (a.move || 0) + speed * terrainSpeed(a.y * n + a.x));
  if (a.move < 1) return a.x === tx && a.y === ty;
  speed = Math.floor(a.move); a.move -= speed;
  for (let s = 0; s < speed; s++) {
    if (a.x === tx && a.y === ty) { a.stall = 0; return true; }
    const before = Math.max(Math.abs(tx - a.x), Math.abs(ty - a.y));
    const dx = Math.sign(tx - a.x), dy = Math.sign(ty - a.y);
    const cands = Math.abs(tx - a.x) >= Math.abs(ty - a.y)
      ? [[dx, 0], [dx, dy], [0, dy], [dx, -dy], [-dx, dy]]
      : [[0, dy], [dx, dy], [dx, 0], [-dx, dy], [dx, -dy]];
    let moved = false, back = false;
    const from = a.y * n + a.x;
    for (let pass = 0; pass < 2 && !moved; pass++) {
      for (const [mx, my] of cands) {
        if (mx === 0 && my === 0) continue;
        const nx = a.x + mx, ny = a.y + my;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const j = ny * n + nx;
        if (pass === 0 && j === a.lastCell) continue; // no doubling back unless there is no other way
        if (!passable(type[j])) continue;
        if (!allowBurning && world.burnLeft[j] > 0) continue;
        a.x = nx; a.y = ny; moved = true; back = j === a.lastCell;
        if (mx !== 0) a.face = mx;
        break;
      }
    }
    if (!moved) { a.stall = (a.stall || 0) + 1; return false; }
    a.lastCell = from;
    const after = Math.max(Math.abs(tx - a.x), Math.abs(ty - a.y));
    // Progress only counts if it did not come straight after a forced step back: a two-cell
    // shuffle looks like progress every other step, and this is what finally catches it.
    a.stall = after < before && !back && !a.wasBack ? 0 : (a.stall || 0) + 1;
    a.wasBack = back;
  }
  return a.x === tx && a.y === ty;
}

// Breadth-first path over passable, non-burning cells. Returns cell indices from the step after start to the goal, or null.
function findPath(sx, sy, tx, ty, maxCells) {
  const n = world.n, N = n * n, type = world.type, burnLeft = world.burnLeft;
  const start = sy * n + sx, goal = ty * n + tx;
  if (start === goal) return [];
  const parent = new Int32Array(N).fill(-1);
  const queue = new Int32Array(N);
  let head = 0, tail = 0;
  queue[tail++] = start; parent[start] = start;
  const limit = maxCells || N;
  while (head < tail && head < limit) {
    const cur = queue[head++];
    const cx = cur % n, cy = (cur - cx) / n;
    for (let d = 0; d < 8; d++) {
      const nx = cx + OFFS8[d][0], ny = cy + OFFS8[d][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = ny * n + nx;
      if (parent[j] !== -1) continue;
      if (!passable(type[j]) || burnLeft[j] > 0) continue;
      parent[j] = cur;
      if (j === goal) {
        const path = [];
        for (let k = j; k !== start; k = parent[k]) path.push(k);
        return path.reverse();
      }
      queue[tail++] = j;
    }
  }
  return null;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function updateCrews(town) {
  const n = world.n, type = world.type, burnLeft = world.burnLeft;
  const fireInside = town.fireDist < town.R + 2.5;
  const keep = [];
  for (const c of town.crews) {
    c.px = c.x; c.py = c.y;
    const here = c.y * n + c.x;

    if (burnLeft[here] > 0) {
      if (Math.random() < 0.3) { loseCrew(town, c, 'overrun by the fire'); continue; }
      town.claimed.delete(c.target); c.target = -1; c.progress = 0;
      stepToward(c, town.cx, town.cy, 2, false);
      keep.push(c);
      continue;
    }

    if (!town.mobilized) {
      if (stepToward(c, town.cx, town.cy, 1, false) || Math.hypot(c.x - town.cx, c.y - town.cy) < 1.5 || c.stall > 8) continue;
      keep.push(c);
      continue;
    }
    if (c.stall > 10) { c.stall = 0; if (c.target >= 0) town.claimed.delete(c.target); c.target = -1; c.progress = 0; c.lastCell = -1; }

    if (c.retreat > 0 && fireInside) { c.retreat--; stepToward(c, town.cx, town.cy, 1, false); keep.push(c); continue; }
    if (fireInside) {
      c.mode = 'douse';
      if (c.target >= 0) { town.claimed.delete(c.target); c.target = -1; c.progress = 0; }
      let best = -1, bestD = Infinity;
      if (c.stall > 4) { c.avoid = c.avoidCell; c.avoidUntil = world.tick + 40; c.stall = 0; c.lastCell = -1; } // across the water: leave that one to the engines
      for (const i of world.burning) {
        if (burnLeft[i] <= 0) continue;
        if (i === c.avoid && world.tick < c.avoidUntil) continue;
        const x = i % n, y = (i - x) / n;
        if (Math.hypot(x - town.cx, y - town.cy) > town.R + 3) continue;
        const d = Math.hypot(x - c.x, y - c.y);
        if (d < bestD) { bestD = d; best = i; }
      }
      c.avoidCell = best;
      if (best >= 0) {
        const bx = best % n, by = (best - bx) / n;
        if (Math.max(Math.abs(bx - c.x), Math.abs(by - c.y)) <= 1) {
          const t = type[best];
          const pDouse = t === T.GRASS ? 0.6 : (isTree(t) ? 0.3 : 0.2);
          if (Math.random() < pDouse) { extinguish(best, 12, 1); dust(best); }
          else if (Math.random() < 0.08) { c.retreat = 2 + Math.floor(Math.random() * 3); c.lastCell = -1; stepToward(c, town.cx, town.cy, 1, false); }
        } else stepToward(c, bx, by, 1, false);
      }
      keep.push(c);
      continue;
    }

    if (c.retreat > 0) { c.retreat--; stepToward(c, town.cx, town.cy, 1, false); keep.push(c); continue; }
    c.mode = 'dig';
    if (c.target >= 0 && !isFuel(type[c.target])) { town.claimed.delete(c.target); c.target = -1; c.progress = 0; }
    if (c.target < 0) {
      let best = -1, bestD = Infinity;
      for (const i of town.ring) {
        if (!isFuel(type[i]) || town.claimed.has(i) || burnLeft[i] > 0) continue;
        const x = i % n, y = (i - x) / n;
        const bearing = Math.atan2(y - town.cy, x - town.cx);
        const off = angleDiff(bearing, town.fireDir);
        if (off > 1.25) continue;
        const d = Math.hypot(x - c.x, y - c.y) + off * 6;
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0) { c.target = best; town.claimed.add(best); c.progress = 0; c.bestD = undefined; c.dstall = 0; c.stall = 0; c.lastCell = -1; }
    }
    if (c.target >= 0) {
      const tx = c.target % n, ty = (c.target - tx) / n;
      const dNow = Math.hypot(tx - c.x, ty - c.y);
      if (c.bestD === undefined || dNow < c.bestD - 0.01) { c.bestD = dNow; c.dstall = 0; }
      else if (c.x !== tx || c.y !== ty) c.dstall = (c.dstall || 0) + 1;
      if (c.dstall > 6 || c.stall > 4) { // can't get there (water, rock, fire): leave it claimed so nobody else tries, pick another
        c.target = -1; c.progress = 0; c.bestD = undefined; c.dstall = 0; c.stall = 0; c.lastCell = -1;
        keep.push(c);
        continue;
      }
      if (c.x === tx && c.y === ty) {
        c.bestD = undefined;
        let hot = false;
        for (const [ox, oy] of OFFS8) {
          const nx = tx + ox, ny = ty + oy;
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
          if (burnLeft[ny * n + nx] > 0) { hot = true; break; }
        }
        let crownNear = false;
        if (hot) for (const [ox, oy] of OFFS8) { const nx = tx + ox, ny = ty + oy; if (nx >= 0 && ny >= 0 && nx < n && ny < n && world.intensity[ny * n + nx] && burnLeft[ny * n + nx] > 0) { crownNear = true; break; } }
        if (hot && Math.random() < (crownNear ? 0.8 : 0.35)) {
          town.claimed.delete(c.target); c.target = -1; c.progress = 0; c.retreat = 3 + Math.floor(Math.random() * 4); c.lastCell = -1;
          stepToward(c, town.cx, town.cy, 1, false);
        } else {
          c.progress++;
          dust(c.target);
          const need = (isTree(type[c.target]) ? 3 : 2) - (town.civ >= 1 ? 1 : 0);
          if (c.progress >= need) {
            if (isTree(type[c.target])) world.treeCount--;
            type[c.target] = T.DIRT;
            world.since[c.target] = world.tick;
            dirty.add(c.target);
            town.claimed.delete(c.target);
            c.target = -1; c.progress = 0;
          }
        }
      } else stepToward(c, tx, ty, 1, false);
    } else {
      const hx = Math.round(town.cx + Math.cos(town.fireDir) * (town.R + 1));
      const hy = Math.round(town.cy + Math.sin(town.fireDir) * (town.R + 1));
      stepToward(c, Math.max(0, Math.min(n - 1, hx)), Math.max(0, Math.min(n - 1, hy)), 1, false);
    }
    keep.push(c);
  }
  town.crews = keep;
}

function updateTrucks(town) {
  const n = world.n, burnLeft = world.burnLeft;
  for (const tr of town.trucks) {
    if (!tr.alive) continue;
    tr.px = tr.x; tr.py = tr.y;
    const here = tr.y * n + tr.x;
    if (burnLeft[here] > 0) {
      if (Math.random() < 0.4) { loseTruck(town, tr, 'burned out on the line'); continue; }
      stepToward(tr, town.cx, town.cy, 2, false);
      continue;
    }
    const sx = town.stationIdx % n, sy = Math.floor(town.stationIdx / n);
    if (tr.state === 'idle') continue;
    if (tr.state === 'refill') {
      if (--tr.refill <= 0) { tr.water = tr.cap; tr.state = town.mobilized ? 'out' : 'idle'; }
      continue;
    }
    if (tr.state === 'return') {
      if (tr.stall > 14) { tr.stall = 0; tr.x = sx; tr.y = sy; tr.px = sx; tr.py = sy; } // took the long way round
      if (stepToward(tr, sx, sy, 2, false)) {
        if (!town.hasStation) { tr.state = 'idle'; continue; }
        tr.state = tr.water < tr.cap ? 'refill' : 'idle';
        tr.refill = town.civ >= 2 ? 3 : 6;
      }
      continue;
    }
    if (tr.water <= 0) { tr.state = town.hasStation ? 'return' : 'idle'; continue; }
    const defend = town.R + 14;
    let best = -1, bestD = Infinity;
    for (const i of world.burning) {
      if (burnLeft[i] <= 0) continue;
      const x = i % n, y = (i - x) / n;
      if (Math.hypot(x - town.cx, y - town.cy) > defend) continue;
      const d = Math.hypot(x - tr.x, y - tr.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) { if (!town.mobilized) tr.state = 'return'; continue; }
    const bx = best % n, by = (best - bx) / n;
    if (tr.bestD === undefined || bestD < tr.bestD - 0.01) { tr.bestD = bestD; tr.stall = 0; }
    else tr.stall = (tr.stall || 0) + 1;
    if (tr.stall > 14 && bestD > 1.5) { // boxed in; head home and try again later
      tr.state = town.hasStation ? 'return' : 'idle'; tr.bestD = undefined; tr.stall = 0;
      continue;
    }
    if (bestD <= 1.5) {
      tr.bestD = undefined;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = tr.x + dx, y = tr.y + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const j = y * n + x;
        if (burnLeft[j] > 0 && Math.random() < (world.intensity[j] ? 0.3 : 0.7) && tr.water > 0) { extinguish(j, 20, 1); tr.water--; spray(j); }
        else if (isFuel(world.type[j]) && world.wet[j] <= 0 && Math.random() < 0.3) extinguish(j, 15, 1);
      }
    } else stepToward(tr, bx, by, 2, false);
  }
}

function dust(i) {
  if (Math.random() > 0.5) return;
  const [x, y] = cellCenter(i);
  particles.push({ x: x + (Math.random() - 0.5) * cellPx, y, vx: (Math.random() - 0.5) * 20, vy: -15 - Math.random() * 15, life: 0, max: 400, color: '#a88a5c', size: Math.max(1.5, cellPx * 0.25), grav: 20 });
}
function spray(i) {
  const [x, y] = cellCenter(i);
  for (let k = 0; k < 3; k++) particles.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20, life: 0, max: 350, color: '#8fd3ff', size: Math.max(1.5, cellPx * 0.22), grav: 120 });
}

