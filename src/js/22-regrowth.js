/* ───────────────────────── Regrowth ───────────────────────── */

// Mean ticks for each succession step at regrowth rate 1 in clear weather.
const GROW = { ashToGrass: 45, stumpToAsh: 70, breakToGrass: 100, grassToPine: 170, grassToPineLonely: 1400, grassToOak: 520, pineToBig: 380 };
// Nothing regrows until this many ticks after the cell last changed (burn, greening, seeding). Varies per cell.
const REGROW_DELAY = [50, 110];
const SWEEP_DIV = 16;

// Per-cell dormancy: hashed on (x, y) so neighbours wake at unrelated times and no rows or columns line up.
function regrowWait(i) {
  const n = world.n, x = i % n, y = (i - x) / n;
  const u = hash2(x, y, world.seed ^ 0x5bd1e995);
  return (REGROW_DELAY[0] + u * (REGROW_DELAY[1] - REGROW_DELAY[0])) / Math.max(0.25, params.regrow);
}

function inAnyTown(x, y) {
  for (const tw of world.towns) if (inFootprint(tw, x, y, 0.5)) return true;
  return false;
}

function regrowSweep() {
  if (params.regrow <= 0) return;
  const n = world.n, N = n * n, type = world.type;
  const mul = params.regrow * WEATHER[world.weather.kind].regrow * SWEEP_DIV * (season() === 0 ? 1.5 : season() === 3 ? 0.15 : 1);
  const count = Math.ceil(N / SWEEP_DIV);
  const step = world.sweepStep;
  let k0 = world.sweepPos;
  for (let k = 0; k < count; k++) {
    if (k0 >= N) { k0 = 0; world.sweepOffset = Math.floor(Math.random() * N); }
    const i = (k0++ * step + (world.sweepOffset || 0)) % N; // exact: well below 2^53 for any map size here
    const t = type[i];
    if (t !== T.ASH && t !== T.STUMP && t !== T.FELLED && t !== T.DIRT && t !== T.GRASS && t !== T.PINE && t !== T.BIGPINE && t !== T.OAK && t !== T.MUD && t !== T.JUNGLE) continue;
    const B = world.biome[i];
    if (B === 6 && Math.random() < 0.4) continue; // handled below at a faster clip: two visits' worth of chance per visit
    if (world.burnLeft[i] > 0 || world.glow[i] > 0) continue;
    if (world.fallout[i] > 40) continue; // poisoned ground
    if (world.snow[i] > 20) continue; // nothing grows under snow
    if (world.tick - world.since[i] < regrowWait(i)) continue;
    const r = Math.random();
    if (t === T.ASH || t === T.MUD) { if (r < mul / GROW.ashToGrass) { type[i] = B === 5 && !nearWater(i, 3) ? T.SAND : B === 4 && Math.random() < 0.6 ? T.REEDS : T.GRASS; world.variant[i] = Math.random() < 0.5 ? 0 : 1; world.since[i] = world.tick; dirty.add(i); } }
    else if (t === T.STUMP) { if (r < mul / GROW.stumpToAsh) { type[i] = T.ASH; world.since[i] = world.tick; dirty.add(i); } }
    else if (t === T.FELLED) { if (r < mul / GROW.stumpToAsh) { type[i] = T.GRASS; world.variant[i] = Math.random() < 0.5 ? 0 : 1; world.since[i] = world.tick; dirty.add(i); } } // a cut stump rots into grass
    else if (t === T.DIRT) { if (!world.road[i] && r < mul / GROW.breakToGrass) { type[i] = T.GRASS; world.since[i] = world.tick; dirty.add(i); } }
    else if (t === T.GRASS) {
      if (r > mul / 100) continue; // cheap early-out: nothing below has a chance better than this
      const x = i % n, y = (i - x) / n;
      let trees = 0, oaks = 0;
      if (x > 0) { const tt = type[i - 1]; if (isTree(tt)) trees++; if (tt === T.OAK) oaks++; }
      if (x < n - 1) { const tt = type[i + 1]; if (isTree(tt)) trees++; if (tt === T.OAK) oaks++; }
      if (y > 0) { const tt = type[i - n]; if (isTree(tt)) trees++; if (tt === T.OAK) oaks++; }
      if (y < n - 1) { const tt = type[i + n]; if (isTree(tt)) trees++; if (tt === T.OAK) oaks++; }
      const fert = world.fert[i];
      if (fert === 0 || inAnyTown(x, y)) continue; // meadows stay meadows
      const fm = fert === 2 ? 1 : 0.3;
      if (fert === 1 && r < 0.6 * mul / GROW.ashToGrass) { type[i] = T.SCRUB; world.since[i] = world.tick; dirty.add(i); continue; }
      // Birch likes wet feet: grass beside water comes back as birch.
      if (((x > 0 && type[i - 1] === T.WATER) || (x < n - 1 && type[i + 1] === T.WATER) || (y > 0 && type[i - n] === T.WATER) || (y < n - 1 && type[i + n] === T.WATER)) && r < mul / GROW.grassToPine) { type[i] = T.BIRCH; world.treeCount++; world.since[i] = world.tick; dirty.add(i); continue; }
      if (oaks && B !== 1 && r < fm * mul * (B === 2 ? 2 : B === 3 ? 0.5 : 1) / GROW.grassToOak) { type[i] = T.OAK; world.treeCount++; world.since[i] = world.tick; dirty.add(i); }
      else if (B === 4 && r < fm * mul / GROW.grassToPine) { type[i] = T.BIRCH; world.treeCount++; world.since[i] = world.tick; dirty.add(i); } // marsh comes back as birch
      else if (B === 6 && r < 2.2 * mul / GROW.grassToPine) { type[i] = Math.random() < 0.7 ? T.JUNGLE : T.OAK; world.treeCount++; world.since[i] = world.tick; dirty.add(i); } // the jungle closes over fast
      else if (r < fm * mul * (B === 1 ? 1.5 : B === 3 ? 0.5 : B === 4 ? 0.3 : 1) / (trees ? GROW.grassToPine / Math.min(trees, 3) : GROW.grassToPineLonely)) { type[i] = T.PINE; world.treeCount++; world.since[i] = world.tick; dirty.add(i); }
    }
    else if (t === T.PINE) { if (r < mul / GROW.pineToBig) { type[i] = T.BIGPINE; world.since[i] = world.tick; dirty.add(i); } }
    else if (t === T.BIGPINE || t === T.OAK || t === T.JUNGLE) { if (r < mul / 70000) { type[i] = T.SNAG; dirty.add(i); } } // old giants die standing, rarely
  }
  world.sweepPos = k0;
}

