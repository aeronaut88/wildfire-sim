/* ───────────────────────── Hydrology: dams, floods ───────────────────────── */

// Flood every cell near the given river cells whose ground is below the water line. Returns how many.
function floodArea(sourceCells, rise, radius, permanent, cause) {
  if (!permanent) stat('ev', 'floods');
  const n = world.n, type = world.type, elev = world.elev;
  const hit = new Set();
  for (const r of sourceCells) {
    const rx = r % n, ry = (r - rx) / n, level = elev[r] + rise;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const x = rx + dx, y = ry + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const i = y * n + x;
      if (elev[i] <= level && Math.hypot(dx, dy) <= radius) hit.add(i);
    }
  }
  let count = 0, drowned = 0, homes = 0, hitTown = null;
  for (const i of hit) {
    const t = type[i];
    if (t === T.WATER || t === T.ROCK || t === T.DAM || t === T.BRIDGE || t === T.WALL || t === T.PAD || t === T.HANGAR) continue;
    if (!world.floodOrig.has(i)) world.floodOrig.set(i, t);
    if (isBuilding(t)) {
      const town = world.towns[world.townOf[i]];
      if (town) { hitTown = hitTown || town; if (isHome(t)) { town.housesLeft--; town.homesLost++; } const dead = Math.min(town.popLeft, Math.round(occupants(town) * 0.15)); applyLosses(town, dead, 'blast'); drowned += dead; homes++; world.buildingsLeft--; world.buildingsLost++; }
      world.floodOrig.set(i, T.RUBBLE);
    } else if (isTree(t)) world.treeCount--;
    if (world.burnLeft[i] > 0) world.burnLeft[i] = 0;
    world.road[i] = 0;
    type[i] = T.WATER; world.flooded.push(i); dirty.add(i); count++;
  }
  if (homes) say(hitTown, 'flooded', { cause, homes, drowned }, 'loss');
  if (!permanent) world.floodUntil = Math.max(world.floodUntil, world.tick + 120 + Math.floor(Math.random() * 120));
  return count;
}

function drainFloods() {
  const type = world.type;
  for (const i of world.flooded) {
    if (type[i] !== T.WATER) continue;
    const orig = world.floodOrig.get(i);
    type[i] = orig === T.RUBBLE ? T.RUBBLE : T.MUD; // mud dries to grass later
    world.since[i] = world.tick; dirty.add(i);
  }
  world.flooded = []; world.floodOrig = new Map(); world.floodUntil = 0;
}

// Rain over a burn scar: no roots, no soak, the river rises.
function maybeBurnScarFlood() {
  if (world.tick % 25 !== 0 || !world.river.length) return;
  const W = world.weather.kind;
  if (W !== 'rain' && W !== 'storm') return;
  if (world.flooded.length && world.floodUntil) return; // already in flood
  const n = world.n, type = world.type;
  let ash = 0, total = 0;
  for (let k = 0; k < 150; k++) {
    const r = world.river[Math.floor(Math.random() * world.river.length)];
    const rx = r % n, ry = (r - rx) / n;
    for (let d = 0; d < 6; d++) { const a = Math.random() * 6.283, dd = 2 + Math.random() * 5; const x = Math.round(rx + Math.cos(a) * dd), y = Math.round(ry + Math.sin(a) * dd); if (x < 0 || y < 0 || x >= n || y >= n) continue; total++; const t = type[y * n + x]; if (t === T.ASH || t === T.STUMP || t === T.RUBBLE) ash++; }
  }
  if (total && ash / total > 0.3 && Math.random() < 0.25) {
    const count = floodArea(world.river, 0.018, 3, false, 'The river bursts its banks below the burn scar');
    if (count) say(null, 'burstBanks', { n: count }, 'weather');
  }
}

function updateHydrology() {
  maybeBurnScarFlood();
  if (world.floodUntil && world.tick >= world.floodUntil && !(world.beavers && world.beavers.stage === 'built')) drainFloods();
  else if (world.floodUntil && world.tick >= world.floodUntil && world.beavers && world.beavers.stage === 'built') { // rain flood on top of a pond: drain only the rain part
    const keep = [], type = world.type;
    for (const i of world.flooded) { if (world.beavers.pond.has(i)) { keep.push(i); continue; } if (type[i] === T.WATER) { const orig = world.floodOrig.get(i); type[i] = orig === T.RUBBLE ? T.RUBBLE : T.MUD; world.since[i] = world.tick; dirty.add(i); } world.floodOrig.delete(i); }
    world.flooded = keep; world.floodUntil = 0;
  }
  updateBeavers();
}

