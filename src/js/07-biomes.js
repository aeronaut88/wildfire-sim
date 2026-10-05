/* ───────────────────────── Biomes ─────────────────────────
   The valley is not one forest. High ground is pine highland, wet low ground is broadleaf
   lowland or marsh, the dry side is scrubland, and the rest is the mixed forest. Each has its
   own trees, its own regrowth, its own fire, its own harvest and its own beasts. */
const BIOME_NAMES = ['Mixed forest', 'Pine highland', 'Broadleaf lowland', 'Dry scrubland', 'Marsh', 'Desert', 'Jungle'];
const BIOME_FIRE = [1, 1.1, 0.8, 1.35, 0.55, 1.5, 0.65];
const BIOME_YIELD = [1, 0.8, 1.25, 0.7, 0.9, 0.5, 1.1];
const BIOME_TINT = [null, 'rgba(190,205,235,0.09)', 'rgba(110,200,90,0.07)', 'rgba(225,190,90,0.13)', 'rgba(30,90,85,0.15)', 'rgba(240,205,110,0.12)', 'rgba(10,110,40,0.16)'];
const BIOME_HERDS = [null, ['sheep', 'boar', 'deer'], ['deer', 'boar', 'fowl'], ['deer', 'aurochs', 'fowl'], ['fowl', 'boar', 'deer'], ['sheep', 'fowl', 'aurochs'], ['boar', 'fowl', 'deer']];
// Climates: most valleys are varied; some are one country end to end.
const CLIMATES = [['temperate', 0, 0, 0.28], ['dry', -0.22, 0, 0.11], ['wet', 0.2, 0, 0.11], ['cold', 0, 0.18, 0.09], ['forest', 0.08, 0, 0.07], ['desert', -0.42, 0, 0.08], ['split', 0, 0, 0.11], ['ridge', 0, 0, 0.07], ['jungle', 0.32, -0.1, 0.08]];
// 'split' runs a moisture gradient across the map (desert one side, forest the other); 'ridge' runs a cold one (highland on one side).
function nearWater(i, r) {
  const n = world.n, x = i % n, y = (i - x) / n;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; if (world.type[yy * n + xx] === T.WATER) return true; }
  return false;
}
function plantable(i) { // a plot can be farmed unless it is desert with no water to irrigate it
  const t = world.type[i];
  if (!(t === T.GRASS || t === T.SCRUB || t === T.ASH || t === T.MUD || t === T.REEDS || t === T.SAND)) return false;
  if (world.biome && world.biome[i] === 5) return nearWater(i, 4);
  return t !== T.SAND;
}
function biomeAt(x, y) { const n = world.n; if (!world.biome || x < 0 || y < 0 || x >= n || y >= n) return 0; return world.biome[y * n + x]; }
function herdKindFor(B) {
  if (!B || Math.random() < 0.35) return herdKind();
  const nm = BIOME_HERDS[B][Math.floor(Math.random() * BIOME_HERDS[B].length)];
  return HERD_KINDS.find(k => k[0] === nm) || HERD_KINDS[0];
}

function generate(n, seed) {
  world.n = n;
  const N = n * n;
  world.type = new Uint8Array(N);
  world.variant = new Uint8Array(N);
  world.burnLeft = new Int16Array(N);
  world.glow = new Uint8Array(N);
  world.wet = new Int16Array(N);
  world.wetKind = new Uint8Array(N);
  world.residents = new Uint8Array(N);
  world.townOf = new Int8Array(N).fill(-1);
  world.road = new Uint8Array(N);
  world.fert = new Uint8Array(N); // 0 = meadow (trees never seed here), 1 = light, 2 = good forest ground
  world.since = new Int32Array(N).fill(-100000); // tick a cell last changed; regrowth waits REGROW_DELAY after that
  world.intensity = new Uint8Array(N); // 1 = crown fire
  world.fallout = new Uint8Array(N); world.falloutList = []; // radiation, decays slowly
  world.elev = new Float32Array(N); world.flow = new Int32Array(N).fill(-1); world.river = []; world.beavers = null; world.flooded = []; world.floodOrig = new Map(); world.floodUntil = 0;
  world.snow = new Uint8Array(N); world.snowLv = new Uint8Array(N); world.snowCells = 0; world.snowCover = 0; // snow depth per cell and the drawn level
  world.look = new Uint8Array(N); world.lookSeason = 0; world.lookLeft = 0; world.lookPos = 0; // which season each tile currently wears
  world.oreKind = new Uint8Array(N); world.ore = new Uint16Array(N); // seams in the rock: kind and units left
  world.biome = new Uint8Array(N); // 0 mixed forest, 1 pine highland, 2 broadleaf lowland, 3 dry scrubland, 4 marsh
  world.crop = new Uint8Array(N); // how far along each field's crop is, 0 to 100
  world.deep = new Uint8Array(N); world.deepAmt = new Uint16Array(N); world.surveyed = new Uint8Array(N); // what lies under the ground, found only by geologists
  world.trader = null; world.nextTrader = 0; world.traderWary = 0; world.roadProjects = [];
  world.stats = newStats();
  world.herds = [];
  world.history = { ticks: [], towns: {} };
  // Regrowth visits cells in a scattered order (multiplication by a stride coprime to N) so it never looks like a band sweeping down.
  world.sweepStep = Math.floor(N * 0.6180339) | 1;
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  while (gcd(world.sweepStep, N) !== 1) world.sweepStep += 2;
  world.lastCrownLog = -1000;
  world.burning = []; world.glowing = []; world.water = []; world.wetList = [];
  world.tick = 0; world.burnedCount = 0;
  world.towns = []; world.air = null;
  world.buildingsTotal = world.buildingsLeft = world.popTotal = world.popLeft = 0;
  world.buildingsLost = 0; world.deaths = 0; world.sweepPos = 0; world.settlers = null; world.dragon = null; world.warbands = []; world.battles = []; world.bombers = []; world.boats = []; world.diploTimer = 60; world.tradeRoads = {}; world.wagons = []; world.lastSeason = undefined;
  world.weather = { kind: 'clear', left: 100 + Math.floor(Math.random() * 120) };
  const a0 = Math.random() * Math.PI * 2;
  world.wind = { angle: a0, strength: 0.2 + Math.random() * 0.3, targetAngle: a0, targetStrength: 0.3, retarget: 0 };
  logEntries.length = 0; renderLog();

  seed = (seed === undefined || seed === null || Number.isNaN(seed)) ? ((Math.random() * 0xffffffff) >>> 0) : (seed >>> 0);
  world.seed = seed;
  seedRng(seed);
  const sE = seed ^ 0x9e3779b9, sM = seed ^ 0x85ebca6b, sB = seed ^ 0xc2b2ae35;
  const scale = 7 / n;
  { let r = rand(); world.climate = { name: 'temperate', moist: 0, cold: 0 }; for (const [name, moist, cold, pr] of CLIMATES) { r -= pr; if (r <= 0) { world.climate = { name, moist, cold }; break; } } }
  const CL = world.climate;
  CL.axis = rand() < 0.5 ? 'x' : 'y'; CL.dir = rand() < 0.5 ? 1 : -1; // which way a gradient runs
  const grad = (x, y) => ((CL.axis === 'x' ? x : y) / n - 0.5) * CL.dir;

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const e = fbm(x * scale, y * scale, sE, 4);
      world.elev[i] = e;
      const m = fbm(x * scale * 1.7 + 50, y * scale * 1.7 + 50, sM, 3);
      const big = fbm(x * scale * 3 + 200, y * scale * 3 + 200, sB, 2);
      world.variant[i] = (hash2(x, y, seed) < 0.5) ? 0 : 1;
      // Biome from height, moisture and a slow-varying noise so regions are broad and blobby.
      const bio = fbm(x * scale * 0.35 + 900, y * scale * 0.35 + 900, seed ^ 0x51a7, 3), moist = fbm(x * scale * 0.7 + 300, y * scale * 0.7 + 300, seed ^ 0x2f3d, 3) + CL.moist + (CL.name === 'split' ? grad(x, y) * 0.7 : 0);
      let B = 0;
      const dryness = moist + (bio - 0.5) * 0.5, cold = CL.cold + (CL.name === 'ridge' ? Math.max(0, grad(x, y)) * 0.5 : 0);
      if (e > 0.62 + (bio - 0.5) * 0.1 - cold) B = 1;
      else if (CL.name !== 'forest') { if (dryness < 0.17) B = 5; else if (e < 0.34 && moist > 0.48) B = 4; else if (dryness < 0.36) B = 3; else if (moist > (CL.name === 'jungle' ? 0.55 : 0.74) && e < 0.56) B = 6; else if (moist > 0.56 && e < 0.52) B = 2; }
      world.biome[i] = B;
      let t;
      if (e < 0.27) t = T.WATER;
      else if (e > (B === 1 ? 0.74 : 0.78)) t = T.ROCK;
      else {
        const forest = Math.min(1, Math.max(0, (m - 0.28) * 2.6));
        const shore = e < 0.31 ? 0.35 : 1;
        world.fert[i] = B === 4 ? 1 : B === 5 ? (e < 0.33 ? 1 : 0) : forest < 0.12 ? 0 : (forest < 0.45 ? 1 : 2);
        const treeP = Math.min(0.97, params.density * (0.08 + 1.35 * forest) * shore * [1, 0.9, 1.1, 0.35, 0.5, 0.06, 1.5][B]);
        if (B === 4 && e < 0.305 && rand() < 0.5) t = T.WATER; // pools in the marsh
        else if (B === 5 && e >= 0.33 && rand() < 0.995) { const r = rand(); t = r < 0.76 ? T.SAND : r < 0.9 ? T.CACTUS : r < 0.95 ? T.SCRUB : T.GRASS; } // open desert: sand and cactus, which do not burn, a little scrub
        else if (rand() < treeP) {
          const r = rand();
          if (B === 6) t = r < 0.62 ? T.JUNGLE : r < 0.8 ? T.OAK : r < 0.92 ? T.BIRCH : T.BIGPINE;
          else if (B === 5) t = r < 0.6 ? T.OAK : T.PINE; // the odd tree where there is a little water
          else if (B === 1) t = r < 0.7 ? T.PINE : T.BIGPINE;
          else if (B === 2) t = r < 0.45 ? T.OAK : r < 0.7 ? T.BIRCH : r < 0.9 ? T.PINE : T.BIGPINE;
          else if (B === 3) t = r < 0.6 ? T.PINE : T.OAK;
          else if (B === 4) t = r < 0.8 ? T.BIRCH : T.OAK;
          else if (e < 0.37 && rand() < 0.7) t = T.BIRCH; // damp ground by the water
          else if (big > 0.5) t = r < 0.5 ? T.OAK : (r < 0.8 ? T.BIGPINE : T.PINE);
          else t = rand() < 0.12 ? T.BIGPINE : T.PINE;
        }
        else if (B === 4) t = rand() < 0.5 ? T.REEDS : T.GRASS;
        else if (B === 6) t = rand() < 0.25 ? T.REEDS : T.GRASS; // ferns and wet ground under the canopy
        else if (B === 5) t = rand() < 0.6 ? T.GRASS : T.SCRUB; // a wet hollow in the desert
        else if (B === 3) t = rand() < 0.5 ? T.SCRUB : T.GRASS;
        else t = (forest < 0.2 && m < 0.35 && rand() < 0.35) ? T.SCRUB : T.GRASS; // dry scrub on thin ground
      }
      world.type[i] = t;
    }
  }

  carveRiver(n, seed);
  seedOres(n);
  seedDeep(n);
  seedHerds(n);
  placeTowns(n);

  world.totalFuel = 0; world.treeCount = 0;
  for (let i = 0; i < N; i++) {
    const t = world.type[i];
    if (isFuel(t)) world.totalFuel++;
    if (isTree(t)) world.treeCount++;
    if (t === T.WATER) world.water.push(i);
  }
}

// The river finds the valley: a least-cost path from a high point on one edge to a low point on the
// opposite edge, with elevation as the cost. Each river cell knows its downstream neighbour.
function carveRiver(n, seed) {
  const N = n * n, elev = world.elev, type = world.type;
  const vertical = rand() < 0.5;
  const edgeCells = (side) => { const out = []; for (let k = 0; k < n; k++) out.push(side === 0 ? k : side === 1 ? (n - 1) * n + k : side === 2 ? k * n : k * n + n - 1); return out; };
  const [srcSide, dstSide] = vertical ? [0, 1] : [2, 3];
  const src = edgeCells(srcSide).reduce((a, b) => elev[a] >= elev[b] ? a : b);
  const dst = edgeCells(dstSide).reduce((a, b) => elev[a] <= elev[b] ? a : b);
  const path = valleyPath(src, dst, null);
  if (!path) return;
  const width = n >= 120 ? 1 : 0;
  layRiver(path, width);
  // A tributary from a third edge into the main stem, sometimes.
  if (rand() < 0.5) {
    const side = vertical ? (rand() < 0.5 ? 2 : 3) : (rand() < 0.5 ? 0 : 1);
    const tsrc = edgeCells(side).reduce((a, b) => elev[a] >= elev[b] ? a : b);
    const riverSet = new Set(world.river);
    const tpath = valleyPath(tsrc, -1, riverSet);
    if (tpath) layRiver(tpath, 0);
  }
  // Thin out trees along the banks.
  for (const i of world.river) {
    const x = i % n, y = (i - x) / n;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
      const j = yy * n + xx; if (isTree(type[j]) && rand() < 0.5) type[j] = T.GRASS;
    }
  }
}

// Dijkstra over the grid with cost rising steeply with elevation. goal = -1 means "any cell in goalSet".
function valleyPath(src, goal, goalSet) {
  const n = world.n, N = n * n, elev = world.elev;
  const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  const heap = []; // simple binary heap of [d, i]
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  dist[src] = 0; push(0, src);
  let found = -1;
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    if (i === goal || (goalSet && goalSet.has(i))) { found = i; break; }
    const x = i % n, y = (i - x) / n;
    for (let k = 0; k < 4; k++) {
      const nx = x + OFFS4[k][0], ny = y + OFFS4[k][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = ny * n + nx;
      const e = elev[j];
      const c = 0.2 + 60 * e * e + (world.type[j] === T.WATER ? -0.15 : 0) + Math.max(0, e - elev[i]) * 80; // hate climbing
      const nd = d + Math.max(0.05, c);
      if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(nd, j); }
    }
  }
  if (found < 0) return null;
  const path = []; for (let k = found; k !== -1; k = prev[k]) path.push(k);
  return path.reverse();
}

function layRiver(path, width) {
  const n = world.n, type = world.type;
  for (let k = 0; k < path.length; k++) {
    const i = path[k], x = i % n, y = (i - x) / n;
    const next = k + 1 < path.length ? path[k + 1] : -1;
    for (let dy = -width; dy <= width; dy++) for (let dx = -width; dx <= width; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
      const j = yy * n + xx;
      if (type[j] !== T.WATER) { type[j] = T.WATER; }
      if (world.flow[j] === -1) { world.flow[j] = next >= 0 ? next : j; world.river.push(j); }
    }
  }
}

// Upstream cells of a river cell: everything whose flow eventually reaches it (bounded search).
function upstreamOf(target, limit) {
  const n = world.n, out = [], seen = new Set([target]);
  const queue = [target];
  while (queue.length && out.length < limit) {
    const i = queue.shift();
    const x = i % n, y = (i - x) / n;
    for (let k = 0; k < 8; k++) {
      const nx = x + OFFS8[k][0], ny = y + OFFS8[k][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = ny * n + nx;
      if (seen.has(j) || world.flow[j] !== i) continue;
      seen.add(j); out.push(j); queue.push(j);
    }
  }
  return out;
}

