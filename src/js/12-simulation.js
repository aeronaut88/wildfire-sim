/* ───────────────────────── Simulation ───────────────────────── */

const OFFS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const OFFS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function ignite(i) {
  const t = world.type[i];
  if (!isFuel(t) || world.burnLeft[i] > 0) return false;
  const f = FUEL[t];
  world.burnLeft[i] = f.burn[0] + Math.floor(Math.random() * (f.burn[1] - f.burn[0] + 1));
  if (world.mat[i]) world.burnLeft[i] = Math.max(2, Math.round(world.burnLeft[i] * 0.6)); // less to burn inside stone walls
  if (t === T.FARM && world.cropKind && world.cropKind[i] === 3) world.burnLeft[i] = 6 + Math.floor(Math.random() * 5); // an orchard burns like the trees it is
  world.burning.push(i);
  world.intensity[i] = 0;
  if (isBuilding(t)) onBuildingIgnite(i);
  dirty.add(i);
  return true;
}

// Crown fire: a burning tree with burning timber around it can flare into the canopy, especially in wind or drought.
function maybeCrown(i, x, y, hasWind, W) {
  const n = world.n, type = world.type, burnLeft = world.burnLeft;
  if (!isTree(type[i])) return;
  let hotNeighbors = 0, crownNeighbors = 0;
  for (let d = 0; d < 8; d++) {
    const nx = x + OFFS8[d][0], ny = y + OFFS8[d][1];
    if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
    const j = ny * n + nx;
    if (burnLeft[j] > 0 && isTree(type[j])) { hotNeighbors++; if (world.intensity[j]) crownNeighbors++; }
  }
  let p = 0;
  if (crownNeighbors) p = 0.22;          // runs along the canopy
  else if (hotNeighbors >= 3) p = 0.006; // enough heat to flare
  if (!p) return;
  p *= (1 + (hasWind ? 2 * params.windStrength : 0)) * (world.weather.kind === 'drought' ? 2 : (W.rainOut > 0 ? 0.2 : 1));
  if (Math.random() < p) {
    world.intensity[i] = 1;
    burnLeft[i] += 2;
    if (!crownNeighbors && world.tick - world.lastCrownLog > 150) {
      world.lastCrownLog = world.tick;
      let near = null, nd = Infinity;
      for (const t of world.towns) { const dd = Math.hypot(t.cx - x, t.cy - y); if (dd < nd) { nd = dd; near = t; } }
      log(near && nd < near.R + 20 ? `Fire is crowning in the timber near ${near.name}` : 'Fire is crowning in the timber', 'alarm');
    }
  }
}

function extinguish(i, wetTicks, kind) {
  if (world.burnLeft[i] > 0) world.burnLeft[i] = 0; // dropped from the burning list on the next step
  if (isFuel(world.type[i]) && wetTicks > 0) {
    if (world.wet[i] <= 0) world.wetList.push(i);
    world.wet[i] = Math.max(world.wet[i], wetTicks);
    world.wetKind[i] = kind;
  }
  dirty.add(i);
}

function windFactor(dx, dy) {
  if (params.windStrength === 0 || (params.windX === 0 && params.windY === 0)) return 1;
  const len = Math.hypot(dx, dy);
  const wl = Math.hypot(params.windX, params.windY);
  const dot = (dx * params.windX + dy * params.windY) / (len * wl);
  return dot >= 0 ? 1 + dot * 1.2 * params.windStrength : 1 + dot * 0.9 * params.windStrength;
}

function step() {
  const n = world.n;
  const offs = params.neighbors === 8 ? OFFS8 : OFFS4;
  const dirMult = offs.map(([dx, dy]) => (dx !== 0 && dy !== 0 ? 0.65 : 1) * windFactor(dx, dy));
  const current = world.burning;
  const count = current.length;
  const next = [];
  const type = world.type, burnLeft = world.burnLeft, wet = world.wet, snow = world.snow, biome = world.biome, mat = world.mat;
  const hasWind = params.windStrength > 0 && (params.windX !== 0 || params.windY !== 0);
  const W = WEATHER[world.weather.kind];
  const spreadMul = params.spread * W.spread;
  const spotP = params.spotting ? 0.0025 * W.spot * (1 + (hasWind ? 3 * params.windStrength : 0)) : 0;

  for (let k = 0; k < count; k++) {
    const i = current[k];
    if (burnLeft[i] <= 0) continue; // put out by someone
    if (!isFuel(type[i])) { burnLeft[i] = 0; world.intensity[i] = 0; dirty.add(i); continue; } // became rubble, road or water mid-burn
    if (W.rainOut > 0 && Math.random() < W.rainOut) { burnLeft[i] = 0; dirty.add(i); continue; } // doused by rain
    const x = i % n, y = (i - x) / n;
    if (!world.intensity[i]) maybeCrown(i, x, y, hasWind, W);
    const crown = world.intensity[i] === 1;
    const heat = (crown ? 1.5 : 1) * (mat[i] ? 0.5 : 1); // a fire inside stone walls warms the street less
    for (let d = 0; d < offs.length; d++) {
      const nx = x + offs[d][0], ny = y + offs[d][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = ny * n + nx;
      const tj = type[j];
      if (!isFuel(tj) || burnLeft[j] > 0) continue;
      if (offs[d][0] !== 0 && offs[d][1] !== 0) { const a = y * n + nx, b = ny * n + x; if ((type[a] === T.WALL || (mat[a] && isBuilding(type[a]))) && (type[b] === T.WALL || (mat[b] && isBuilding(type[b])))) continue; } // stone corners touch: flame does not squeeze through the diagonal
      let p = spreadMul * FUEL[tj].ignite * dirMult[d] * heat * BIOME_FIRE[biome[j]];
      if (mat[j]) p *= STONE_IGNITE;
      if (wet[j] > 0) p *= crown ? 0.3 : 0.1;
      if (snow[j] > 10) p *= crown ? 0.2 : 0.06; // fuel under snow barely takes
      if (Math.random() < p) ignite(j);
    }
    if (crown) {
      // A crown fire showers embers far ahead of the front, even without wind.
      for (let k = 0; k < 2; k++) if (Math.random() < (params.spotting ? 0.04 : 0.015) * (W.spot || 0.5)) throwEmber(x, y, hasWind, true);
    } else if (spotP > 0 && FUEL[type[i]].spots && !mat[i] && Math.random() < spotP) throwEmber(x, y, hasWind, false); // slate roofs throw no embers
    burnLeft[i]--;
    if (burnLeft[i] > 0) next.push(i);
    else burnout(i);
  }
  for (let k = count; k < world.burning.length; k++) next.push(world.burning[k]);
  world.burning = next;

  if (world.glowing.length) {
    const keep = [];
    for (const i of world.glowing) {
      if (world.glow[i] > 1) { world.glow[i]--; keep.push(i); }
      else { world.glow[i] = 0; dirty.add(i); }
    }
    world.glowing = keep;
  }
  if (world.wetList.length) {
    const keep = [];
    for (const i of world.wetList) {
      if (--world.wet[i] > 0) keep.push(i);
      else { world.wetKind[i] = 0; dirty.add(i); }
    }
    world.wetList = keep;
  }

  world.tick++;
  updateSeason();
  updateWeather();
  updateSnow();
  updateLook();
  updateWind();
  maybeMeteor();
  maybeActOfGod();
  updateHydrology();
  regrowSweep();
  updateTowns();
  updateSettlers();
  updateAir();
  checkAchievementStats();
  updateDiplomacy();
  updateCouncil();
  updateFactions();
  updateThroughTrade();
  updateWarbands();
  updateFallout();
  updateBoats();
  if (world.tick % 50 === 0) salmonRun();
  updateHerds();
  updatePacks();
  maybeTradeRoad();
  if (world.tick % 50 === 0) sampleHistory();
  updateRoadProjects();
  updateWagons();
  updateTrader();
  updateFirebugs();
  updateTravellers();
  maybeDragon();
}

