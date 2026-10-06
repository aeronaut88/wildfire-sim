/* ───────────────────────── Town growth ───────────────────────── */

function growTown(town) {
  maybeRaid(town);
  maybeBombard(town);
  if (--town.growTimer > 0) return;
  town.growTimer = 16;
  updateMilitia(town);
  updateTech(town);
  if (town.mobilized || world.tick - town.lastThreat < 40 || town.popLeft <= 0) return;
  const n = world.n, type = world.type;

  agePeople(town);
  updateUnrest(town);
  leaderActs(town);
  updateLaw(town);
  updateHealer(town);
  updateFestival(town);
  updateGraves(town);
  updateRounds(town);
  for (const k of RES_KINDS) if (!Number.isFinite(town.res[k])) town.res[k] = 0; // a broken number never gets to spread
  if (town.popLeft < 0) { world.popLeft -= town.popLeft; town.popLeft = 0; }
  for (const k of RES_KINDS) if (k !== 'coin' && town.res[k] > resCap(town, k)) town.res[k] = resCap(town, k); // nowhere to keep it
  updateWater(town);
  town.powerRatio = updatePower(town);
  // Coin comes from selling, not from thin air: caravans, paid deliveries, and gold minted at the hall.
  if (town.res.gold > 0 && hasType(town, T.TOWNHALL) && hasType(town, T.FORGE)) { town.res.gold--; town.res.coin += 10; town.minted = (town.minted || 0) + 10; stat('ev', 'minted', 10); if (town.minted === 10) log(`${town.name} mints its first coin from its own gold`, 'build'); }
  if (town.res.fish > 10 && Math.random() < 0.3) town.res.fish--; // fish spoils
  if (town.res.game > 10 && Math.random() < 0.3) town.res.game--;
  updateLivestock(town);
  if (town.civ >= 4 && hasType(town, T.UNIVERSITY) && Math.random() < 0.06) surveyFor(town);
  updateExtraction(town);
  if (town.civ >= 4 && town.res.oil > 0) for (const tr of town.trucks) if (tr.cap < 40) tr.cap = 40; // motor pumps
  if (!town.water && Math.random() < (world.weather.kind === 'drought' ? 0.25 : 0.1)) {
    applyLosses(town, Math.max(1, Math.round(town.popLeft * 0.02)), 'thirst'); town.thirsted = true; // a town remembers, and builds storage
    if (!town.dryLogged || world.tick - town.dryLogged > 400) { town.dryLogged = world.tick; log(`The cistern at ${town.name} is empty. People are dying of thirst.`, 'loss'); }
  }
  if (town.master >= 0) { // a conquered town sends tribute to its master
    const m = world.towns[town.master];
    if (!m || !isAlive(m)) town.master = -1;
    else if (world.tick % 200 < 16) { const sent = []; for (const k of RES_KINDS) { const amt = Math.floor(town.res[k] * 0.25); if (amt > 0) { town.res[k] -= amt; addRes(m, k, amt); sent.push(`${amt} ${k}`); } } if (sent.length && Math.random() < 0.5) log(`${town.name} sends tribute to ${m.name}: ${sent.join(', ')}`, 'war'); }
  }
  const capacity = Math.min(housingCapacity(town), foodSupply(town), town.water ? Infinity : 40);
  // Drought withers fields that have no water near them, fastest in the desert.
  if (world.weather.kind === 'drought' && Math.random() < 0.5) {
    let lost = 0;
    for (const i of town.buildings) if (world.type[i] === T.FARM && Math.random() < (world.biome[i] === 5 ? 0.06 : 0.02) && !nearWater(i, 3)) { world.type[i] = T.SCRUB; world.since[i] = world.tick; dirty.add(i); lost++; }
    if (lost) { town.farms = Math.max(0, (town.farms || 0) - lost); town.buildings = town.buildings.filter(i => world.type[i] !== T.SCRUB); stat('ev', 'fieldsWithered', lost); if (Math.random() < 0.5) log(`The drought withers ${lost} of ${town.name}'s fields`, 'loss'); }
  }
  // Crops grow, and the town eats from its stores: grain first, then fish and game; the herd gives a little every time.
  growCrops(town);
  const eat = Math.ceil(town.popLeft / 30);
  let got = Math.floor(livestockFood(town) / 6);
  for (const k of ['grain', 'fish', 'game']) { if (got >= eat) break; const take = Math.min(town.res[k] || 0, eat - got); town.res[k] -= take; got += take; }
  town.fed = got >= eat * 0.7;
  town.hunger = town.fed ? 0 : (town.hunger || 0) + 1;
  if (town.hunger >= 3) {
    if (!town.famine) { town.famine = world.tick; stat('ev', 'famines'); say(town, 'famine', { pop: town.popLeft }, 'loss'); remember(town, 'famine'); }
    if (Math.random() < 0.4) applyLosses(town, Math.max(1, Math.round(town.popLeft * 0.006)), 'famine');
  } else if (town.famine && town.hunger === 0) { town.famine = 0; say(town, 'famineEnds', {}, 'good'); }
  // Fields: enough for the mouths, more when the stores are thin, fewer in bad country. Each ripe field gives about six grain.
  const farmsNow = countType(town, T.FARM) + Object.values(town.sites || {}).filter(st => st.type === T.FARM).length;
  const wantFarms = Math.ceil(town.popLeft / (9 * BIOME_YIELD[biomeAt(town.cx, town.cy)]) * (town.temper ? town.temper.food : 1)) + (town.fed ? 0 : 3);
  if (farmsNow < wantFarms && Math.random() < (town.fed ? 0.5 : 0.9)) { buildFarm(town); if (!town.fed && Math.random() < 0.5) buildFarm(town); }
  if (town.popLeft < capacity && Math.random() < 0.65) {
    const add = Math.max(1, Math.round(town.popLeft * 0.01));
    town.popLeft += add; world.popLeft += add; town.popTotal += add; world.popTotal += add;
  }

  { // Granaries come before houses: the store should carry the mouths through a winter.
    const gr = countType(town, T.GRANARY) + Object.values(town.sites || {}).filter(st => st.type === T.GRANARY).length;
    const needCap = Math.ceil(town.popLeft / 30) * 44, cap = 60 + 120 * gr;
    if (town.popLeft >= 12 && (cap < needCap || town.res.grain >= cap * 0.75) && gr < 1 + Math.floor(town.popLeft / 40) && canAfford(town, COST[T.GRANARY]) && Math.random() < 0.7) {
      const i = placeCivic(town, T.GRANARY, false);
      if (i >= 0) { pay(town, COST[T.GRANARY]); log(`${town.name} ${gr ? 'raises another granary' : 'raises a granary'}`, 'build'); }
    }
  }
  const pressure = town.popLeft >= housingCapacity(town) * 0.8 || town.housesLeft < 3; // beds, not bread: a hungry town does not sprawl
  if (pressure && Math.random() < 0.5) buildHouse(town, false);
  bigCityTroubles(town);
  if (pressure && town.housesLeft >= 6 && Math.random() < 0.1 && canAfford(town, COST.road)) { pay(town, COST.road); expandRoads(town); }
  // Dense housing once masonry (civil tech 1) is known: replace a house with a tenement when hemmed in.
  if (pressure && town.civ >= 1 && town.housesLeft >= 8 && Math.random() < 0.12) buildTenement(town);
  buildCivic(town);
  buildSites(town);

  if (!town.hasStation && town.popLeft >= 35 && canAfford(town, COST[T.STATION]) && Math.random() < 0.2) {
    const spot = findTownSpot(town, t => t === T.GRASS || t === T.ASH || t === T.RUBBLE);
    if (spot >= 0) {
      pay(town, COST[T.STATION]);
      type[spot] = T.STATION; world.townOf[spot] = town.id;
      if (!town.buildings.includes(spot)) town.buildings.push(spot);
      world.buildingsTotal++; world.buildingsLeft++;
      toSite(town, spot, T.STATION);
      log(`${town.name} starts building a fire station`, 'build');
    }
  } else if (town.hasStation) {
    const alive = town.trucks.filter(t => t.alive).length;
    if (alive < 3 && town.popLeft >= 30 * (alive + 1) && canAfford(town, COST.engine) && Math.random() < 0.08) {
      pay(town, COST.engine);
      const sx = town.stationIdx % n, sy = Math.floor(town.stationIdx / n);
      town.trucks.push({ id: town.nextTruckId++, x: sx, y: sy, px: sx, py: sy, water: 20, cap: 20, state: 'idle', refill: 0, alive: true, face: 1 });
      log(`${town.name} buys engine ${town.nextTruckId - 1}`, 'build');
    }
  }

  // Airstrip: one per map, and it has to be earned.
  if (!world.air && world.tick > 300 && town.hasStation && canAfford(town, COST.airbase) && ((town.popLeft >= 70 && Math.random() < 0.04) || (town.civ >= 5 && town.popLeft >= 40 && Math.random() < 0.15))) { if (buildAirbase(town)) pay(town, COST.airbase); if (world.air && world.air.owner === town.name && town.civ >= 5) { world.air.max = 4; world.air.sorties = 2; } }
}

// The price of size: plague without waterworks, riots when crowded and chaotic, slums burn.
function bigCityTroubles(town) {
  const over = town.R - Math.max(params.townCap, town.R0);
  if (town.popLeft >= (biomeAt(town.cx, town.cy) === 6 ? 180 : 350) && town.civ < 2 && Math.random() < 0.0025 * (1 + Math.max(0, over)) * (biomeAt(town.cx, town.cy) === 6 ? 1.6 : 1)) {
    let dead = Math.round(town.popLeft * (0.05 + Math.random() * 0.1));
    const saved = heal(town, dead, 'plague'); dead -= saved;
    applyLosses(town, dead, 'plague');
    town.plagues = (town.plagues || 0) + 1; stat('ev', 'plagues'); town.plagueUntil = world.tick + 300;
    say(town, 'plague', { dead, saved }, 'loss'); remember(town, 'plague');
    const [x, y] = cellCenter(town.cy * world.n + town.cx); popups.push({ x, y: y - town.R * cellPx - 14, text: 'PLAGUE', color: '#9fe8d8', t0: performance.now(), dur: 2500 });
    return;
  }
  if (over > 0 && town.popLeft >= 500 && town.align.order < 0 && Math.random() < 0.004 * over) {
    const homes = town.buildings.filter(i => isHome(world.type[i]) && world.burnLeft[i] <= 0);
    if (homes.length) { ignite(homes[Math.floor(Math.random() * homes.length)]); log(`Riots in ${town.name}. Someone put a torch to the slums.`, 'arson'); }
    return;
  }
  if (over > 1 && Math.random() < 0.0015 * over) {
    // Sprawl outruns the fire watch: the far edge catches without anyone noticing for a while.
    const edge = town.buildings.filter(i => isHome(world.type[i]) && world.burnLeft[i] <= 0 && Math.hypot(i % world.n - town.cx, Math.floor(i / world.n) - town.cy) > town.R - 1.5);
    if (edge.length) { ignite(edge[Math.floor(Math.random() * edge.length)]); town.lastThreat = world.tick - 30; log(`A kitchen fire on the far edge of sprawling ${town.name} goes unnoticed`, 'alarm'); }
  }
}

// Food: farms feed twelve each, boats bring fish, foraging covers a few, and the weather sets the yield.
// How many people the stores and the herd can carry: nothing in the granary, no growth.
function livestockFood(town) { let f = 0; if (town.livestock) for (const k of LIVESTOCK) f += (town.livestock[k] || 0) * LIVESTOCK_FOOD[k]; return f; }
function foodSupply(town) {
  if (!town.res) return 25;
  const stores = (town.res.grain || 0) + (town.res.fish || 0) + (town.res.game || 0);
  let food = 20 + stores * 1.6 + livestockFood(town) * 2;
  if (town.tradeFood && town.tradeFood > world.tick) food += 20;
  return Math.round(food);
}
// Fields go on open ground just outside the houses, beside a road or another field.
function buildFarm(town) { return buildField(town, T.FARM); }
function buildField(town, fieldType) {
  const n = world.n, type = world.type;
  let best = -1, bestScore = Infinity;
  const R = town.R + 4;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = town.cx + dx, y = town.cy + dy;
    if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) continue;
    const i = y * n + x, t = type[i];
    if (!plantable(i)) continue;
    if (world.road[i] || poisoned(i) || world.burnLeft[i] > 0 || world.elev[i] > 0.7) continue;
    const d = Math.hypot(dx, dy);
    if (d > R) continue;
    let foreign = false; for (const o of world.towns) if (o !== town && Math.hypot(o.cx - x, o.cy - y) <= o.R + 3) { foreign = true; break; }
    if (foreign) continue;
    let touch = false, farmNear = false;
    for (const [ox, oy] of OFFS8) { const j = (y + oy) * n + x + ox; if (world.road[j] || isBuilding(type[j])) touch = true; if (type[j] === T.FARM || type[j] === T.PASTURE) farmNear = true; }
    if (!touch && !farmNear) continue;
    const score = d + Math.random() * 2 - (farmNear ? 1.5 : 0) + (inFootprint(town, x, y, 0) ? 2 : 0);
    if (score < bestScore) { bestScore = score; best = i; }
  }
  if (best < 0) return false;
  if (fieldType === T.PASTURE) { type[best] = T.PASTURE; world.townOf[best] = town.id; if (!town.buildings.includes(best)) town.buildings.push(best); world.buildingsTotal++; world.buildingsLeft++; dirty.add(best); toSite(town, best, T.PASTURE); return true; }
  if (!canAfford(town, COST[T.FARM])) return false;
  pay(town, COST[T.FARM]);
  type[best] = T.FARM; world.townOf[best] = town.id;
  if (!town.buildings.includes(best)) town.buildings.push(best);
  town.farms = (town.farms || 0) + 1;
  toSite(town, best, T.FARM);
  if (town.farms === 1 || town.farms % 8 === 0) log(`${town.name} clears fields (${countType(town, T.FARM)} farms)`, 'build');
  dirty.add(best);
  return true;
}

function housingCapacity(town) {
  let c = 0;
  for (const i of town.buildings) { const t = world.type[i]; if (CAPACITY[t]) c += CAPACITY[t]; }
  return c;
}
// Building counts are asked for dozens of times a town-tick; count once per tick and forget whenever a building changes.
const countCache = new WeakMap();
function countType(town, type) {
  let e = countCache.get(town);
  if (!e || e.tick !== world.tick || e.len !== town.buildings.length) {
    const m = new Map();
    for (const i of town.buildings) { const t = world.type[i]; m.set(t, (m.get(t) || 0) + 1); }
    e = { tick: world.tick, len: town.buildings.length, m }; countCache.set(town, e);
  }
  return e.m.get(type) || 0;
}
function forgetCounts(town) { countCache.delete(town); }
function hasType(town, type) { return countType(town, type) > 0; }
// Built or under construction: what a town counts when deciding whether to build another.
function countPlanned(town, type) { let c = countType(town, type); const s = town.sites; if (s) for (const k in s) if (world.type[+k] === T.SITE && s[k].type === type) c++; return c; }
function hasPlanned(town, type) { return countPlanned(town, type) > 0; }

// Upgrade a house near the centre into a tenement.
function buildTenement(town) {
  const n = world.n;
  const houses = town.buildings.filter(i => world.type[i] === T.HOUSE && world.burnLeft[i] <= 0);
  if (!houses.length) return false;
  houses.sort((a, b) => Math.hypot(a % n - town.cx, Math.floor(a / n) - town.cy) - Math.hypot(b % n - town.cx, Math.floor(b / n) - town.cy));
  const i = houses[Math.floor(Math.random() * Math.min(4, houses.length))];
  if (!canAfford(town, COST[T.TENEMENT])) return false;
  pay(town, COST[T.TENEMENT]);
  world.type[i] = T.TENEMENT; dirty.add(i); town.housesTotal++; town.housesLeft++; world.buildingsTotal++; world.buildingsLeft++; toSite(town, i, T.TENEMENT);
  if (Math.random() < 0.3) log(`${town.name} raises a tenement block`, 'build');
  return true;
}

// Place a civic building on a free cell beside a road inside the footprint.
function placeCivic(town, type, nearCentre) {
  const n = world.n, wt = world.type;
  let best = -1, bestScore = Infinity;
  for (let dy = -town.R; dy <= town.R; dy++) for (let dx = -town.R; dx <= town.R; dx++) {
    const x = town.cx + dx, y = town.cy + dy;
    if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1 || !inFootprint(town, x, y, 0.3)) continue;
    const i = y * n + x, t = wt[i];
    if (world.road[i] || poisoned(i) || world.burnLeft[i] > 0) continue;
    const ok = t === T.GRASS || t === T.ASH || t === T.RUBBLE || t === T.DIRT || t === T.SAND || t === T.SCRUB || (t === T.HOUSE && Math.random() < 0.3);
    if (!ok || !touchesRoad(x, y)) continue;
    const d = Math.hypot(dx, dy);
    const score = (nearCentre ? d : -d) + Math.random() * 2 + (t === T.HOUSE ? 3 : 0);
    if (score < bestScore) { bestScore = score; best = i; }
  }
  if (best < 0) return -1;
  if (wt[best] === T.HOUSE) { town.housesLeft--; }
  if (isTree(wt[best])) world.treeCount--;
  wt[best] = type; world.townOf[best] = town.id;
  if (!town.buildings.includes(best)) town.buildings.push(best);
  world.buildingsTotal++; world.buildingsLeft++;
  dirty.add(best);
  toSite(town, best, type);
  return best;
}

// What a town builds as it learns and grows.
function buildCivic(town) {
  if (Math.random() > 0.25) return;
  const want = [];
  if (town.popLeft >= 100 && !hasPlanned(town, T.TOWNHALL)) want.push([T.TOWNHALL, true, 'raises a town hall']);
  if (town.mil >= 1 && !hasPlanned(town, T.BARRACKS) && town.popLeft >= 40) want.push([T.BARRACKS, false, 'builds a barracks']);
  if (town.mil >= 2 && countPlanned(town, T.BARRACKS) < 2 && town.popLeft >= 200) want.push([T.BARRACKS, false, 'builds a second barracks']);
  if ((town.mil >= 2 || town.civ >= 1) && !hasPlanned(town, T.FORGE) && town.popLeft >= 50) want.push([T.FORGE, false, 'lights a forge']);
  if (town.civ >= 2 && !hasPlanned(town, T.UNIVERSITY) && town.popLeft >= 90) want.push([T.UNIVERSITY, true, 'founds a university']);
  if (town.civ >= 3 && !hasPlanned(town, T.TOWER)) want.push([T.TOWER, false, 'builds a watchtower']);
  if ((town.mil >= 4 || town.civ >= 3 || (town.civ >= 2 && town.power >= 3)) && countPlanned(town, T.FACTORY) < 1 + Math.floor(town.popLeft / 300) && town.popLeft >= 120) want.push([T.FACTORY, false, 'opens a factory']);
  if (town.mil >= 6 && !hasPlanned(town, T.SILO)) want.push([T.SILO, false, 'digs a missile silo']);
  if (town.civ >= 1 && !hasPlanned(town, T.HEALER) && town.popLeft >= (has(town, 'physician') ? 15 : 40)) want.push([T.HEALER, true, "opens a healer's house"]);
  if (town.civ >= 2 && hasType(town, T.HEALER) && !hasPlanned(town, T.HOSPITAL) && town.popLeft >= (has(town, 'physician') ? 80 : 150)) want.push([T.HOSPITAL, true, 'opens a hospital']);
  if (town.wantGaol && town.align.order > 0 && !hasPlanned(town, T.GAOL) && town.popLeft >= 30) want.push([T.GAOL, true, 'builds a gaol']);
  if (town.mil >= 5 && !hasPlanned(town, T.AIRBASE) && town.popLeft >= 120 && town.res.oil >= 4) want.push([T.AIRBASE, false, 'lays out a military air base']);
  if (town.popLeft >= 20 && !hasPlanned(town, T.LUMBERYARD)) want.push([T.LUMBERYARD, false, 'opens a lumberyard']);

  if (town.popLeft >= 160 && countPlanned(town, T.LUMBERYARD) < 2) want.push([T.LUMBERYARD, false, 'opens a second lumberyard']);
  if (!want.length) return;
  const [type, nearCentre, verb] = want[Math.floor(Math.random() * want.length)];
  const cost = COST[type];
  if (!canAfford(town, cost)) {
    const k = lacking(town, cost);
    if (town.wishLogged !== type && Math.random() < 0.3) { town.wishLogged = type; log(k ? `${town.name} wants a ${BUILDING_NAMES[type].toLowerCase()} but has no ${k}` : `${town.name} wants a ${BUILDING_NAMES[type].toLowerCase()} but is saving for the next step`, 'build'); }
    return;
  }
  const i = placeCivic(town, type, nearCentre);
  if (i >= 0) { pay(town, cost); log(`${town.name} ${verb}`, 'build'); }
}

// Rebuild rubble first, then grow outward along the roads, up to the size cap.
function buildHouse(town, quiet) {
  const n = world.n, type = world.type;
  let best = -1, bestScore = Infinity;
  // No artificial cap on size: the world sets the limits through timber, food, water, plague and sprawl fires.
  if (!canAfford(town, COST[T.HOUSE]) && !(town.housesLeft === 0 && Math.random() < 0.1)) { town.short = 'wood'; return false; } // a town with nothing standing scrapes a first house together
  const maxR = town.R + 1;
  for (let dy = -maxR - 1; dy <= maxR + 1; dy++) for (let dx = -maxR - 1; dx <= maxR + 1; dx++) {
    const d = Math.hypot(dx, dy);
    if (d < 1) continue;
    const x = town.cx + dx, y = town.cy + dy;
    // Footprint test at the would-be radius: lumpy outline, capped by the size limit.
    const ra = Math.min(maxR, radiusAt({ R: maxR, shape: town.shape, cx: town.cx, cy: town.cy }, dx, dy));
    if (d > ra + 0.3) continue;
    if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) continue;
    const i = y * n + x, t = type[i];
    if (world.road[i] || poisoned(i)) continue; // keep the roads clear; nobody builds on poisoned ground
    if (t === T.WATER || t === T.ROCK || t === T.PAD || t === T.HANGAR || t === T.WALL || isBuilding(t)) continue;
    if (world.burnLeft[i] > 0) continue;
    let foreign = false;
    for (const o of world.towns) if (o !== town && Math.hypot(o.cx - x, o.cy - y) <= o.R + 2) { foreign = true; break; }
    if (foreign) continue;
    let touch = false;
    for (const [ox, oy] of OFFS8) { const j = (y + oy) * n + x + ox; if (isBuilding(type[j]) || world.road[j] || type[j] === T.RUBBLE) { touch = true; break; } }
    if (!touch) continue;
    let score = d * 0.6 + Math.random() * 2.2;
    if (t === T.RUBBLE) score -= 6;
    if (isTree(t)) score += 1.5;
    if (touchesRoad(x, y)) score -= 2.5; else score += 1.5; // hug the streets
    if (score < bestScore) { bestScore = score; best = i; }
  }
  if (best < 0) return false;
  pay(town, COST[T.HOUSE]);
  const t = type[best];
  if (isTree(t)) world.treeCount--;
  const rebuilt = t === T.RUBBLE;
  type[best] = T.HOUSE;
  world.variant[best] = Math.random() < 0.6 ? 0 : 1;
  world.townOf[best] = town.id;
  if (!town.buildings.includes(best)) town.buildings.push(best);
  town.housesTotal++; town.housesLeft++;
  world.buildingsTotal++; world.buildingsLeft++;
  town.built++;
  toSite(town, best, T.HOUSE);
  if (town.destroyed) { town.destroyed = false; if (!quiet) log(`${town.name} rebuilds from the ashes`, 'build'); }
  const d = Math.hypot((best % n) - town.cx, Math.floor(best / n) - town.cy);
  if (d > town.R + 0.3) {
    town.R = Math.ceil(d);
    layRoads(town, true);
    recomputeRing(town);
    if (!quiet) say(town, 'grows', { homes: town.housesLeft }, 'build');
  } else if (!quiet && rebuilt && Math.random() < 0.12) say(town, 'rebuilding', { homes: town.housesLeft }, 'build');
  else if (!quiet && !rebuilt && town.built % 12 === 0) say(town, 'addsHomes', { homes: town.housesLeft }, 'build');
  dirty.add(best);
  return true;
}

function findTownSpot(town, ok) {
  const n = world.n, type = world.type;
  let best = -1, bestD = Infinity;
  for (let dy = -town.R; dy <= town.R; dy++) for (let dx = -town.R; dx <= town.R; dx++) {
    const d = Math.hypot(dx, dy);
    if (d > town.R + 0.3 || d < 1) continue;
    const x = town.cx + dx, y = town.cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x;
    if (world.road[i] || !ok(type[i]) || world.burnLeft[i] > 0) continue;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Road layouts: spokes at angles (degrees) out from the square, plus an optional ring road.
function pickLayout(R, rng) {
  const r = rng();
  const rot = [0, 45, 90, 135][Math.floor(rng() * 4)];
  let spokes;
  if (r < 0.22) spokes = [0, 90, 180, 270];                     // crossroads
  else if (r < 0.40) spokes = [0, 180, 90];                     // T junction
  else if (r < 0.52) spokes = [0, 90];                          // L bend
  else if (r < 0.70) spokes = [0, 180];                         // one main street
  else if (r < 0.82) spokes = [0, 120, 240];                    // Y fork
  else if (r < 0.92) spokes = [45, 135, 225, 315];              // X
  else spokes = [0, 60, 120, 180, 240, 300];                    // star
  spokes = spokes.map(a => (a + rot + (rng() < 0.25 ? Math.floor(rng() * 30) - 15 : 0)) % 360);
  const ring = R >= 4 && rng() < 0.35 ? Math.max(2, Math.round(R * (0.45 + rng() * 0.3))) : 0;
  return { spokes, ring };
}

function touchesRoad(x, y) {
  const n = world.n;
  for (const [ox, oy] of OFFS8) { const nx = x + ox, ny = y + oy; if (nx >= 0 && ny >= 0 && nx < n && ny < n && world.road[ny * n + nx]) return true; }
  return false;
}

function roadCells(town) {
  const n = world.n, out = [];
  for (let dy = -town.R; dy <= town.R; dy++) for (let dx = -town.R; dx <= town.R; dx++) {
    const x = town.cx + dx, y = town.cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    if (world.road[y * n + x]) out.push(y * n + x);
  }
  return out;
}

// All road cells a layout implies for a town of its current radius.
function layoutCells(town, layout) {
  const cells = [[town.cx, town.cy]];
  const line = (x0, y0, a, from, to) => {
    const ca = Math.cos(a * Math.PI / 180), sa = Math.sin(a * Math.PI / 180);
    for (let d = from; d <= to; d += 0.5) cells.push([Math.round(x0 + ca * d), Math.round(y0 + sa * d)]);
  };
  for (const a of layout.spokes) line(town.cx, town.cy, a, 0.5, town.R);
  for (const b of layout.branches || []) {
    if (b.at > town.R) continue;
    const bx = town.cx + Math.cos(b.spoke * Math.PI / 180) * b.at, by = town.cy + Math.sin(b.spoke * Math.PI / 180) * b.at;
    line(bx, by, b.spoke + b.dir, 0.5, Math.min(b.len, town.R - 0.5));
  }
  if (layout.ring) {
    const rr = layout.ring;
    for (let dy = -rr - 1; dy <= rr + 1; dy++) for (let dx = -rr - 1; dx <= rr + 1; dx++) {
      if (Math.abs(Math.hypot(dx, dy) - rr) < 0.55) cells.push([town.cx + dx, town.cy + dy]);
    }
  }
  return cells;
}

function layRoads(town, live) {
  const n = world.n, type = world.type;
  const cells = layoutCells(town, town.layout);
  for (let k = 0; k < cells.length; k++) {
    const [x, y] = cells[k];
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x, t = type[i];
    if (t === T.WATER) {
      // A short span of water with land beyond gets a wooden bridge.
      if (!world.flow || world.beavers && world.beavers.cell === i) continue;
      let span = 0, j = k, land = false;
      while (j < cells.length && span <= 3) { const [xx, yy] = cells[j]; if (xx < 0 || yy < 0 || xx >= n || yy >= n) break; const tt = type[yy * n + xx]; if (tt === T.WATER) { span++; j++; } else { land = passable(tt); break; } }
      if (land && span <= 3 && span > 0 && (!town.res || town.res.wood >= COST.bridge.wood)) { if (town.res) pay(town, COST.bridge); type[i] = T.BRIDGE; world.road[i] = 1; dirty.add(i); if (!town.bridged) { town.bridged = true; log(`${town.name} throws a bridge across the river`, 'build'); } }
      continue;
    }
    if (t === T.ROCK || isBuilding(t) || t === T.PAD || t === T.HANGAR || t === T.RUBBLE || t === T.WALL || t === T.DAM || t === T.BRIDGE) continue;
    if (isTree(t) && live !== false) world.treeCount--;
    type[i] = T.DIRT; world.road[i] = 1; dirty.add(i);
  }
}

// Growing towns build new roads: a spoke into the widest gap, a side street off a spoke, or a ring road.
function expandRoads(town) {
  const n = world.n, type = world.type, L = town.layout;
  L.branches = L.branches || [];
  const opts = [];
  const angles = L.spokes.slice().sort((a, b) => a - b);
  let bestGap = 0, bestAngle = 0;
  for (let k = 0; k < angles.length; k++) {
    const a = angles[k], b = k === angles.length - 1 ? angles[0] + 360 : angles[k + 1];
    if (b - a > bestGap) { bestGap = b - a; bestAngle = (a + (b - a) / 2) % 360; }
  }
  if (bestGap >= 70 && L.spokes.length < 8) opts.push({ kind: 'spoke', angle: (bestAngle + (Math.random() - 0.5) * 24 + 360) % 360 });
  if (town.R >= 4 && L.branches.length < Math.floor(town.R * 0.8)) {
    const sp = L.spokes[Math.floor(Math.random() * L.spokes.length)];
    opts.push({ kind: 'branch', spoke: sp, at: 2 + Math.floor(Math.random() * Math.max(1, town.R - 2)), dir: Math.random() < 0.5 ? 90 : -90, len: 2 + Math.floor(Math.random() * 3) });
  }
  if (town.R >= 5 && !L.ring && Math.random() < 0.5) opts.push({ kind: 'ring', r: Math.max(2, Math.round(town.R * (0.5 + Math.random() * 0.25))) });
  if (!opts.length) return false;
  const o = opts[Math.floor(Math.random() * opts.length)];
  const trial = { spokes: L.spokes.slice(), branches: L.branches.slice(), ring: L.ring };
  if (o.kind === 'spoke') trial.spokes.push(o.angle);
  else if (o.kind === 'branch') trial.branches.push(o);
  else trial.ring = o.r;
  // Only the cells this proposal adds; most of them must be free ground.
  const have = new Set(layoutCells(town, L).map(([x, y]) => y * n + x));
  let free = 0, total = 0;
  for (const [x, y] of layoutCells(town, trial)) {
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x;
    if (have.has(i)) continue;
    total++;
    const t = type[i];
    if (!(t === T.WATER || t === T.ROCK || isBuilding(t) || t === T.PAD || t === T.HANGAR || t === T.RUBBLE)) free++;
  }
  if (total < 2 || free < total * 0.6) return false;
  town.layout = trial;
  layRoads(town, true);
  recomputeRing(town);
  log(`${town.name} lays a new ${o.kind === 'ring' ? 'ring road' : o.kind === 'branch' ? 'side street' : 'road'}`, 'build');
  return true;
}

