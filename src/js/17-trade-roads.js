/* ───────────────────────── Trade roads ───────────────────────── */

// Least-cost road between two points: roads are cheap, open ground fair, trees dear, water dear (bridges), rock impossible.
function roadPath(src, dst) {
  const n = world.n, N = n * n, type = world.type;
  const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  const heap = [];
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  dist[src] = 0; push(0, src);
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    if (i === dst) break;
    if (d > 4000) break;
    const x = i % n, y = (i - x) / n;
    for (let k = 0; k < 4; k++) {
      const nx = x + OFFS4[k][0], ny = y + OFFS4[k][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = ny * n + nx, t = type[j];
      let c;
      if (world.road[j] || t === T.BRIDGE) c = 0.3;
      else if (t === T.ROCK || t === T.WALL || t === T.DAM || t === T.PAD || t === T.HANGAR || isBuilding(t)) continue;
      else if (t === T.WATER) c = 7;
      else if (isTree(t)) c = 4;
      else if (t === T.FARM) c = 3;
      else c = 1;
      c += Math.abs(world.elev[j] - world.elev[i]) * 30;
      const nd = d + c;
      if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(nd, j); }
    }
  }
  if (dist[dst] === Infinity) return null;
  const path = []; for (let k = dst; k !== -1; k = prev[k]) path.push(k);
  return path.reverse();
}

function maybeTradeRoad() {
  if (world.tick % 60 !== 0) return;
  const towns = world.towns.filter(isAlive);
  for (let i = 0; i < towns.length; i++) for (let j = i + 1; j < towns.length; j++) {
    const a = towns[i], b = towns[j];
    const key = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id;
    world.tradeRoads = world.tradeRoads || {};
    if (world.tradeRoads[key]) continue;
    if (has(a, 'hermit') || has(b, 'hermit')) continue; // wants nothing from the neighbours
    if (rel(a, b) < (has(a, 'merchant') || has(b, 'merchant') ? 30 : 50) || atWar(a, b) || Math.hypot(a.cx - b.cx, a.cy - b.cy) > 55 || Math.random() > 0.25) continue;
    const n = world.n;
    const path = roadPath(a.cy * n + a.cx, b.cy * n + b.cx);
    if (!path) continue;
    let water = 0; for (const c of path) if (world.type[c] === T.WATER) water++;
    if (water > 6) continue; // too much river to bridge
    if (a.res.stone + b.res.stone < 6) continue; // nobody has the stone to start
    world.tradeRoads[key] = { a: a.id, b: b.id, path, wagonT: 0, building: true };
    world.roadProjects = world.roadProjects || [];
    world.roadProjects.push({ key, a: a.id, b: b.id, path, k: 0, x: a.cx, y: a.cy, px: a.cx, py: a.cy, face: 1, wait: 0, water, halted: false });
    log(`${a.name} and ${b.name} start a road between them${water ? ', with a bridge over the river' : ''}. A crew sets out from ${a.name}.`, 'build');
    return;
  }
}
// Lay one cell of a road project per step: the crew walks the route and the road grows behind it.
// A work road: from the town out to a quarry, mine, derrick or shaft that is a long walk away.
function startWorkRoad(town, site) {
  const n = world.n, key = 'work-' + site;
  if ((world.roadProjects || []).some(pr => pr.key === key)) return false;
  const path = roadPath(town.cy * n + town.cx, site);
  if (!path || path.length < 8 || path.filter(c => world.type[c] === T.WATER).length > 6) return false;
  if (town.res.stone < 4) return false;
  world.roadProjects = world.roadProjects || [];
  const what = BUILDING_NAMES[town.sites && town.sites[site] ? town.sites[site].type : world.type[site]] || 'work site';
  world.roadProjects.push({ key, a: town.id, b: town.id, path, k: 0, x: town.cx, y: town.cy, px: town.cx, py: town.cy, face: 1, wait: 0, water: 0, halted: false, work: true, site, what });
  log(`${town.name} sends a crew to lay a road out to its ${what.toLowerCase()}`, 'build');
  return true;
}
function updateRoadProjects() {
  const projects = world.roadProjects || [];
  if (!projects.length) return;
  const n = world.n, keep = [];
  for (const pr of projects) {
    pr.px = pr.x; pr.py = pr.y;
    const a = world.towns[pr.a], b = world.towns[pr.b], road = pr.work ? null : world.tradeRoads[pr.key];
    if (pr.work) {
      if (!isAlive(a) || !(isBuilding(world.type[pr.site]) || world.type[pr.site] === T.SITE)) { if (isAlive(a)) log(`${a.name}'s road crew comes home; the ${pr.what.toLowerCase()} is gone`, 'loss'); continue; }
      if (pr.k >= pr.path.length) { log(`${a.name} finishes the road to its ${pr.what.toLowerCase()}`, 'build'); stat('ev', 'workRoads'); continue; }
    } else {
      if (!road || !isAlive(a) || !isAlive(b) || atWar(a, b)) { delete world.tradeRoads[pr.key]; log(`The road between ${a.name} and ${b.name} is abandoned half built`, 'loss'); continue; }
      if (pr.k >= pr.path.length) { road.building = false; log(`The road between ${a.name} and ${b.name} is finished${pr.water ? '; wagons can cross the bridge' : ''}`, 'build'); continue; }
    }
    const c = pr.path[pr.k];
    if (world.burnLeft[c] > 0 || world.burnLeft[pr.y * n + pr.x] > 0) { keep.push(pr); continue; } // wait for the fire to pass
    if (world.tick % 2 === 0) { keep.push(pr); continue; } // one cell every other tick
    const t = world.type[c];
    const needs = t === T.WATER ? { wood: 2 } : (pr.k % 3 === 0 ? { stone: 1 } : null);
    if (needs) {
      const payer = canAfford(a, needs) && (a.res.stone >= b.res.stone || !canAfford(b, needs)) ? a : canAfford(b, needs) ? b : null;
      if (!payer) { if (!pr.halted) { pr.halted = true; log(pr.work ? `${a.name}'s road work halts for want of ${Object.keys(needs)[0]}` : `Road work between ${a.name} and ${b.name} halts for want of ${Object.keys(needs)[0]}`, 'loss'); } keep.push(pr); continue; }
      pay(payer, needs); pr.halted = false;
    }
    if (!(world.road[c] || isBuilding(t) || t === T.ROCK || t === T.WALL || t === T.DAM || t === T.BRIDGE)) {
      if (t === T.WATER) { world.type[c] = T.BRIDGE; world.road[c] = 1; }
      else { if (isTree(t)) world.treeCount--; if (t === T.FARM) { const tw = world.towns[world.townOf[c]]; if (tw) tw.farms = Math.max(0, (tw.farms || 1) - 1); } world.type[c] = T.DIRT; world.road[c] = 1; }
      dirty.add(c);
    }
    const cx = c % n, cy = (c - cx) / n; if (cx !== pr.x) pr.face = Math.sign(cx - pr.x);
    pr.x = cx; pr.y = cy; pr.k++;
    keep.push(pr);
  }
  world.roadProjects = keep;
}

function updateWagons() {
  world.wagons = world.wagons || [];
  const roads = {}; for (const k in (world.tradeRoads || {})) if (!world.tradeRoads[k].building) roads[k] = world.tradeRoads[k];
  for (const key in roads) {
    const r = roads[key];
    const a = world.towns[r.a], b = world.towns[r.b];
    if (!isAlive(a) || !isAlive(b)) continue;
    if (atWar(a, b)) continue;
    if (++r.wagonT >= 160 && !world.wagons.some(w => w.key === key)) {
      r.wagonT = 0;
      const fwd = Math.random() < 0.5;
      world.wagons.push({ key, path: fwd ? r.path : r.path.slice().reverse(), pi: 0, x: (fwd ? a : b).cx, y: (fwd ? a : b).cy, px: 0, py: 0, face: 1, from: fwd ? a.id : b.id, to: fwd ? b.id : a.id });
    }
  }
  const n = world.n, keep = [];
  for (const w of world.wagons) {
    w.px = w.x; w.py = w.y;
    if (w.pi < w.path.length) {
      const next = w.path[w.pi];
      if (world.burnLeft[next] > 0) { // burned on the road
        if (Math.random() < 0.3) { log(`A trade wagon from ${world.towns[w.from].name} is lost to the fire`, 'loss'); continue; }
        keep.push(w); continue;
      }
      if (!passable(world.type[next])) { continue; } // bridge gone
      const nx = next % n, ny = (next - nx) / n; if (nx !== w.x) w.face = Math.sign(nx - w.x);
      w.x = nx; w.y = ny; w.pi++;
      keep.push(w);
    } else {
      // Arrived: trade feeds both and shares a little learning.
      const to = world.towns[w.to], from = world.towns[w.from];
      if (to) { to.tradeFood = world.tick + 400; to.research += 40; }
      if (from) { from.tradeFood = world.tick + 400; }
      if (to && from && to.res && from.res) { // and whatever the other side is short of, if there is spare
        let best = null, bestAmt = 0;
        for (const k of RES_KINDS) { if (k === 'water' || k === 'coin') continue; const need = resCap(to, k) - (to.res[k] || 0), spare = (from.res[k] || 0) - resCap(from, k) * 0.4; const amt = Math.min(need, spare); if (need > 4 && spare > 4 && amt > bestAmt) { bestAmt = amt; best = k; } }
        if (best) { const amt = Math.min(10, Math.floor(bestAmt)), price = (PRICE[best] || 1) * amt, paid = Math.min(price, Math.max(0, Math.floor(to.res.coin || 0))); from.res[best] -= amt; addRes(to, best, amt); to.res.coin -= paid; from.res.coin += paid; stat('ev', 'tradeCoin', paid); if (Math.random() < 0.5) log(`Wagons from ${from.name} bring ${amt} ${best} to ${to.name}${paid ? ` for ${paid} coin` : ', on credit'}`, 'build'); }
      }
      if (Math.random() < 0.25 && to && from) log(`A wagon from ${from.name} unloads at ${to.name}'s market`, 'build');
      // Plague rides along.
      if (from && to && from.plagueUntil && from.plagueUntil > world.tick && Math.random() < 0.5 && !to.plagueUntil) { to.plagueUntil = world.tick + 300; const dead = Math.round(to.popLeft * (0.04 + Math.random() * 0.08)); applyLosses(to, dead); log(`Plague comes to ${to.name} on the ${from.name} road: ${dead} dead`, 'loss'); }
    }
  }
  world.wagons = keep;
}

