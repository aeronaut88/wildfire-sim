/* ───────────────────────── Construction ─────────────────────────
   Nothing appears out of nowhere. A placement pays its cost and leaves a timber frame; builders
   walk out and raise it over ticks, more of them when the town is big. Only the finished building
   counts, shelters anyone, or works. A frame that burns is lost. */
const BUILD_TIME = { [T.HOUSE]: 14, [T.FARM]: 6, [T.PASTURE]: 6, [T.WELL]: 10, [T.LUMBERYARD]: 18, [T.QUARRY]: 14, [T.MINE]: 20, [T.WHEEL]: 20, [T.TOWER]: 20, [T.TOWNHALL]: 30, [T.BARRACKS]: 24, [T.FORGE]: 24, [T.TENEMENT]: 26, [T.STATION]: 22, [T.UNIVERSITY]: 40, [T.FACTORY]: 40, [T.PLANT]: 40, [T.SOLAR]: 20, [T.SILO]: 50, [T.HYDRO]: 60, [T.NUCLEAR]: 80, [T.DERRICK]: 30, [T.SHAFT]: 30, [T.GRANARY]: 20, [T.AIRBASE]: 45, [T.GAOL]: 24, [T.CISTERN]: 16, [T.TOWER_W]: 30 };
// Turn a just-placed building into a site, taking back the counts the placement added.
function toSite(town, i, finalType, counted) {
  const home = isHome(finalType);
  if (counted !== false) {
    if (home) { town.housesTotal--; town.housesLeft--; }
    if (finalType === T.FARM) town.farms = Math.max(0, (town.farms || 1) - 1);
    else { world.buildingsTotal--; world.buildingsLeft--; }
  }
  town.sites = town.sites || {};
  town.sites[i] = { type: finalType, need: BUILD_TIME[finalType] || 20, progress: 0, variant: world.variant[i] };
  world.type[i] = T.SITE; dirty.add(i); forgetCounts(town);
}
function finishSite(town, i) {
  const st = town.sites[i]; if (!st) return;
  delete town.sites[i];
  world.type[i] = st.type; world.variant[i] = st.variant || 0; dirty.add(i); forgetCounts(town);
  if (isHome(st.type)) { town.housesTotal++; town.housesLeft++; }
  if (st.type === T.FARM) { town.farms = (town.farms || 0) + 1; world.crop[i] = 0; }
  else { world.buildingsTotal++; world.buildingsLeft++; }
  if (st.type === T.STATION) {
    town.hasStation = true; town.stationIdx = i;
    const aliveNow = town.trucks.filter(t => t.alive).length, sx = i % world.n, sy = Math.floor(i / world.n);
    if (aliveNow < 3) town.trucks.push({ id: town.nextTruckId++, x: sx, y: sy, px: sx, py: sy, water: 20, cap: 20, state: 'idle', refill: 0, alive: true, face: 1 });
    log(aliveNow < 3 ? `${town.name} opens its fire station and buys an engine` : `${town.name} reopens its fire station`, 'build');
  }
  if (st.type === T.WELL && town.wells[i] === undefined) town.wells[i] = aquifer(town);
  if (BUILDING_NAMES[st.type] && st.type !== T.TENEMENT && Math.random() < 0.4) log(`${town.name} finishes its ${BUILDING_NAMES[st.type].toLowerCase()}`, 'build');
  stat('ev', 'built');
}
function updateBuilder(town, w) {
  const n = world.n, sites = town.sites || {};
  if (w.target < 0 || !sites[w.target] || world.type[w.target] !== T.SITE || world.burnLeft[w.target] > 0) {
    let best = -1, bd = Infinity;
    for (const k in sites) { const i = +k; if (world.type[i] !== T.SITE || world.burnLeft[i] > 0) { if (world.type[i] !== T.SITE) delete sites[k]; continue; } if (w.bad && w.bad.includes(i)) continue; const d = Math.hypot(i % n - w.x, Math.floor(i / n) - w.y); if (d < bd) { bd = d; best = i; } }
    if (best < 0) { w.idle = (w.idle || 0) + 1; return w.idle < 20; }
    w.target = best; w.stuck = 0; w.stall = 0; w.lastCell = -1;
  }
  const tx = w.target % n, ty = (w.target - tx) / n;
  if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) {
    const st = sites[w.target];
    if (Math.random() < 0.35) dust(w.target);
    st.progress += has(town, 'builder') ? 1.4 : 1;
    if (st.progress >= st.need) { finishSite(town, w.target); w.target = -1; }
    return true;
  }
  stepToward(w, tx, ty, 1, false);
  if (w.stall > 4 || ++w.stuck > 120) { w.bad = (w.bad || []).concat(w.target).slice(-6); w.target = -1; w.stuck = 0; w.stall = 0; w.lastCell = -1; }
  return true;
}
// Harvest: a ripe field is cut by a farmhand and the grain carried to the granary.
function updateHarvester(town, w) {
  const n = world.n;
  if (w.phase === 'out') {
    if (w.target < 0 || world.type[w.target] !== T.FARM || world.crop[w.target] < 100) {
      let best = -1, bd = Infinity;
      for (const i of town.buildings) if (world.type[i] === T.FARM && world.crop[i] >= 100 && world.burnLeft[i] <= 0 && !(w.bad && w.bad.includes(i)) && !town.workers.some(o => o !== w && o.target === i)) { const d = Math.hypot(i % n - w.x, Math.floor(i / n) - w.y); if (d < bd) { bd = d; best = i; } }
      if (best < 0) { w.idle = (w.idle || 0) + 1; return w.idle < 20; }
      w.target = best; w.stuck = 0; w.stall = 0;
    }
    const tx = w.target % n, ty = (w.target - tx) / n;
    if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) { w.phase = 'work'; w.work = 0; return true; }
    stepToward(w, tx, ty, 1, false); if (w.stall > 4 || ++w.stuck > 80) { w.bad = (w.bad || []).concat(w.target).slice(-6); w.target = -1; w.stuck = 0; w.stall = 0; w.lastCell = -1; }
    return true;
  }
  if (w.phase === 'work') {
    if (Math.random() < 0.4) dust(w.target);
    if (++w.work >= 5) { if (world.type[w.target] === T.FARM && world.crop[w.target] >= 100) { w.carry = Math.max(3, Math.round(9 * BIOME_YIELD[biomeAt(town.cx, town.cy)])); world.crop[w.target] = 0; dirty.add(w.target); stat('ev', 'harvests'); } w.phase = 'back'; }
    return true;
  }
  const hx = w.home % n, hy = (w.home - hx) / n;
  if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) { if (w.carry) addRes(town, 'grain', w.carry); w.carry = 0; w.phase = 'out'; w.target = -1; w.stuck = 0; }
  else { stepToward(w, hx, hy, 1, false); if (w.stall > 10 || ++w.stuck > 100) return false; }
  return true;
}
// Crops grow with the season and the weather; a field is ripe at 100.
function growCrops(town) {
  const sea = season(), wk = world.weather.kind;
  const rate = 16 * 0.5 * (sea === 0 ? 0.9 : sea === 1 ? 1 : sea === 2 ? 1.1 : 0) * (wk === 'rain' || wk === 'storm' ? 1.3 : wk === 'drought' || wk === 'drystorm' ? 0.3 : wk === 'snow' || wk === 'ashfall' ? 0 : 1) * (has(town, 'greenthumb') ? 1.5 : 1);
  if (rate <= 0) return;
  const stage = c => c < 35 ? 0 : c < 75 ? 1 : c < 100 ? 2 : 3;
  for (const i of town.buildings) {
    if (world.type[i] !== T.FARM || world.crop[i] >= 100) continue;
    const before = stage(world.crop[i]);
    world.crop[i] = Math.min(100, world.crop[i] + rate);
    if (stage(world.crop[i]) !== before) dirty.add(i);
  }
}
// What a town is short of, so it can do something about it: wood, stone, food, water.
function shortages(town) {
  const out = new Set();
  if (town.res.wood < resCap(town, 'wood') * 0.25 || town.short === 'wood') out.add('wood');
  if (town.res.stone < resCap(town, 'stone') * 0.2 && (town.wishLogged || town.popLeft >= 60)) out.add('stone');
  if (!town.fed || (town.res.grain + town.res.fish + town.res.game) < Math.ceil(town.popLeft / 30) * 4) out.add('food');
  if (town.res.water < resCap(town, 'water') * 0.3) out.add('water');
  for (const k of techWants(town)) out.add(k);
  return out;
}

