/* ───────────────────────── Resources ─────────────────────────
   Everything a town builds is paid for in wood, stone, iron, copper, coal or uranium. Wood is
   cut from the forest by loggers (the trees really go), stone comes from a quarry at a rock face,
   the metals from mines on finite seams. Stockpiles are small, so towns save up, trade, or fight. */
const RES_KINDS = ['wood', 'stone', 'iron', 'copper', 'coal', 'uranium', 'gold', 'oil', 'grain', 'fish', 'game', 'water', 'coin'];
const PRICE = { wood: 1, stone: 1, fish: 1, game: 1, grain: 1, coal: 2, iron: 3, copper: 4, oil: 3, uranium: 12, gold: 15, cattle: 8, pigs: 4, sheep: 3, chickens: 1 };
const COST = {
  [T.HOUSE]: { wood: 4 }, [T.TENEMENT]: { wood: 6, stone: 8 }, [T.FARM]: { wood: 1 }, [T.STATION]: { wood: 6, stone: 3 },
  [T.TOWNHALL]: { wood: 8, stone: 6 }, [T.BARRACKS]: { wood: 8, stone: 4, iron: 2 }, [T.FORGE]: { stone: 6, iron: 2 },
  [T.FACTORY]: { stone: 10, iron: 8, copper: 4 }, [T.UNIVERSITY]: { stone: 10, wood: 6, copper: 4 }, [T.TOWER]: { stone: 6, wood: 2 },
  [T.SILO]: { stone: 12, iron: 8, uranium: 10 }, [T.LUMBERYARD]: { wood: 6 }, [T.MINE]: { wood: 8, stone: 2 }, [T.QUARRY]: { wood: 4 },
  [T.WELL]: { stone: 4, wood: 2 }, [T.WHEEL]: { wood: 10, iron: 2 }, [T.PLANT]: { stone: 10, iron: 6 }, [T.SOLAR]: { copper: 8, iron: 4 },
  [T.HYDRO]: { stone: 14, iron: 8, copper: 6 }, [T.NUCLEAR]: { stone: 16, iron: 12, copper: 10, uranium: 6 },
  [T.DERRICK]: { stone: 8, iron: 10, copper: 4 }, [T.SHAFT]: { wood: 10, iron: 6, stone: 4 }, [T.PASTURE]: { wood: 6 }, [T.GRANARY]: { wood: 6 }, [T.AIRBASE]: { stone: 12, iron: 10, wood: 8, oil: 4 },
  engine: { iron: 3, copper: 1 }, wall: { stone: 10 }, bridge: { wood: 6 }, road: { stone: 3 }, tank: { iron: 10, coal: 3 }, gun: { iron: 6 },
  bomber: { iron: 8, copper: 4, oil: 3 }, fighter: { iron: 6, copper: 6, oil: 4 }, nuke: { uranium: 40, iron: 10 }, airbase: { stone: 12, iron: 8, wood: 10, oil: 6 },
};
const WOOD_YIELD = { [T.PINE]: 3, [T.OAK]: 5, [T.BIGPINE]: 6, [T.BIRCH]: 2, [T.SNAG]: 2, [T.JUNGLE]: 6 };
// What research alone cannot give you.
const MIL_NEED = [null, { iron: 10 }, null, { coal: 8 }, { iron: 15 }, { iron: 20 }, { uranium: 20 }];
const CIV_NEED = [null, { wood: 10 }, { copper: 8, stone: 10 }, { stone: 6 }, { iron: 12, copper: 8 }, { oil: 10, iron: 20, copper: 10 }]; // no aviation without hydrocarbons
function resCap(t, kind) {
  if (kind === 'coin') return 1e9;
  if (kind === 'water') return 40 + 30 * countType(t, T.WELL) + (t.civ >= 2 ? 40 : 0); // the cistern
  if (kind === 'fish' || kind === 'game') return 40 + 20 * countType(t, T.GRANARY); // the smokehouse shares the storehouse
  if (kind === 'grain') return 60 + 120 * countType(t, T.GRANARY); // a town that outgrows its granaries builds more
  if (kind === 'oil') return 30 + 20 * countType(t, T.DERRICK);
  if (kind === 'wood') return 40 + 30 * countType(t, T.LUMBERYARD);
  if (kind === 'stone') return 30 + 30 * countType(t, T.QUARRY);
  return 24 + 20 * countType(t, T.MINE);
}
const NEVER_RESERVED = new Set([T.HOUSE, T.FARM, T.GRANARY, T.WELL, T.LUMBERYARD, T.QUARRY, T.MINE, T.PASTURE, T.WHEEL, T.PLANT].map(k => COST[k]).concat([COST.road, COST.bridge]));
// Whether the town can pay. A town that has the points for a tech step holds back what the step needs,
// the way a player saves for an upgrade, except for the works that bring resources in.
function canAfford(t, cost) {
  if (!cost || !t.res) return true;
  const held = NEVER_RESERVED.has(cost) ? null : techReserve(t);
  for (const k in cost) if ((t.res[k] || 0) - (held && held[k] || 0) < cost[k]) return false;
  return true;
}
function lacking(t, cost) { if (!cost) return null; for (const k in cost) if ((t.res[k] || 0) < cost[k]) return k; return null; }
function pay(t, cost) { if (!cost || !t.res) return; for (const k in cost) t.res[k] = Math.max(0, (t.res[k] || 0) - cost[k]); }
function addRes(t, kind, amount) {
  if (!t.res || !kind) return;
  const cap = resCap(t, kind), before = t.res[kind] || 0;
  t.res[kind] = Math.min(cap, before + amount);
  t.gathered[kind] = (t.gathered[kind] || 0) + (t.res[kind] - before);
}
// Surface water the carriers can reach: a river or lake cell, not frozen over, within a walk.
function waterCellNear(t, from) {
  const n = world.n, R = t.R + 24, fx = from ? from.x : t.cx, fy = from ? from.y : t.cy;
  let best = -1, bd = Infinity;
  for (const i of world.water) { const x = i % n, y = (i - x) / n; if (Math.abs(x - t.cx) > R || Math.abs(y - t.cy) > R) continue; if (world.type[i] !== T.WATER || world.snow[i] >= ICE_AT) continue; const d = Math.hypot(x - fx, y - fy); if (d < bd) { bd = d; best = i; } }
  return best;
}
function aquifer(t) { return biomeAt(t.cx, t.cy) === 5 ? 150 + Math.floor(Math.random() * 150) : 400 + Math.floor(Math.random() * 400); }
// Wells draw on a finite aquifer that recharges a little in rain and a trickle otherwise; carriers
// bring the rest from the river. People drink, and a dry cistern means thirst.
function updateWater(t) {
  const wk = world.weather.kind, rain = wk === 'rain' || wk === 'storm' || wk === 'snow';
  let got = 0;
  for (const i of t.buildings) {
    if (world.type[i] !== T.WELL) continue;
    if (t.wells[i] === undefined) t.wells[i] = aquifer(t);
    if (rain) t.wells[i] = Math.min(t.wells[i] + 3, 900); else if (world.tick % 128 < 16) t.wells[i] += 1;
    if (t.wells[i] <= 0) continue;
    const draw = Math.min(t.wells[i], wk === 'drought' ? 2 : 3);
    t.wells[i] -= draw; got += draw;
    if (t.wells[i] <= 0) { log(`${t.name}'s well runs dry`, 'loss'); stat('ev', 'wellsDry'); }
  }
  if (got) addRes(t, 'water', got);
  const need = Math.ceil(t.popLeft / 40);
  t.res.water = Math.max(0, (t.res.water || 0) - need);
  t.water = t.res.water > 0;
}
// Power: water wheels (still in a frozen winter), coal plants that eat coal, solar that follows the sky.
function updatePower(t) {
  const wk = world.weather.kind;
  let supply = 0;
  const wheels = countType(t, T.WHEEL); if (wheels) supply += wheels * 3 * ((world.snowCover || 0) > 0.6 ? 0 : 1);
  const plants = countType(t, T.PLANT);
  if (plants) {
    if (t.res.coal > 0) { supply += plants * 4; t.coalT = (t.coalT || 0) + 16; if (t.coalT >= 40) { t.coalT -= 40; t.res.coal = Math.max(0, t.res.coal - plants); } t.plantLit = true; }
    else if (t.res.wood >= 2) { supply += plants * 3; t.coalT = (t.coalT || 0) + 16; if (t.coalT >= 40) { t.coalT -= 40; t.res.wood = Math.max(0, t.res.wood - 2 * plants); } t.plantLit = true; } // a boiler will burn timber
    else if (t.plantLit) { t.plantLit = false; log(`${t.name}'s boiler goes cold. Nothing left to burn.`, 'loss'); }
  }
  const solar = countType(t, T.SOLAR); if (solar) supply += solar * (wk === 'clear' || wk === 'drought' ? 2 : wk === 'snow' || wk === 'storm' ? 0.5 : 1);
  const hydro = countType(t, T.HYDRO); if (hydro) supply += hydro * 6 * ((world.snowCover || 0) > 0.8 ? 0.5 : wk === 'drought' ? 0.6 : 1); // the river runs low in drought and hard frost
  const reactors = countType(t, T.NUCLEAR);
  if (reactors) {
    if (t.res.uranium > 0) { supply += reactors * 12; t.uT = (t.uT || 0) + 16; if (t.uT >= 120) { t.uT -= 120; t.res.uranium = Math.max(0, t.res.uranium - reactors); } t.reactorOn = true; }
    else if (t.reactorOn) { t.reactorOn = false; log(`${t.name}'s reactor goes dark. No uranium.`, 'loss'); }
  }
  const need = countType(t, T.FACTORY) * 2 + countType(t, T.UNIVERSITY) + (t.civ >= 2 ? 1 : 0) + (hasType(t, T.SILO) ? 2 : 0);
  t.power = Math.round(supply); t.powerNeed = need;
  t.powerRatio = need ? Math.min(1, supply / need) : 1;
  return t.powerRatio;
}
// A work site on open ground beside something: rock for a quarry, a seam for a mine, water for a wheel.
function placeSite(town, type, maxD, okNeighbor) {
  const n = world.n, wt = world.type;
  let best = -1, bestScore = Infinity;
  // Every cell in reach is looked at: a coarser scan used to miss most of the sites next to a small seam.
  for (let dy = -maxD; dy <= maxD; dy++) for (let dx = -maxD; dx <= maxD; dx++) {
    const x = town.cx + dx, y = town.cy + dy;
    if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) continue;
    const i = y * n + x, t = wt[i];
    if (!(t === T.GRASS || t === T.SCRUB || t === T.ASH || t === T.MUD || t === T.STUMP || t === T.SAND || (t === T.DIRT && !world.road[i]))) continue;
    let ok = false; for (const [ox, oy] of OFFS8) { const j = (y + oy) * n + x + ox; if (okNeighbor(wt[j], j)) { ok = true; break; } }
    if (!ok) continue;
    const d = Math.hypot(dx, dy); if (d > maxD || d >= bestScore) continue;
    if (world.burnLeft[i] > 0 || poisoned(i)) continue;
    let foreign = false; for (const o of world.towns) if (o !== town && Math.hypot(o.cx - x, o.cy - y) <= o.R + 3) { foreign = true; break; }
    if (foreign) continue;
    const score = d + Math.random() * 3;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  if (best < 0) return -1;
  wt[best] = type; world.townOf[best] = town.id; world.road[best] = 0;
  if (!town.buildings.includes(best)) town.buildings.push(best);
  world.buildingsTotal++; world.buildingsLeft++;
  dirty.add(best);
  toSite(town, best, type);
  return best;
}
function mineServes(j) { // is some mine already working this ore cell?
  const n = world.n, x = j % n, y = (j - x) / n;
  for (const [ox, oy] of OFFS8) { const nx = x + ox, ny = y + oy; if (nx >= 0 && ny >= 0 && nx < n && ny < n && world.type[ny * n + nx] === T.MINE) return true; }
  return false;
}
function oreNear(town, kind, maxD) {
  const n = world.n;
  for (let dy = -maxD; dy <= maxD; dy++) for (let dx = -maxD; dx <= maxD; dx++) {
    const x = town.cx + dx, y = town.cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x;
    if (world.oreKind[i] === kind && world.ore[i] > 0) return true;
  }
  return false;
}
// Geologists: a town with geology and a university finds what is under the ground within reach.
function surveyFor(town) {
  const n = world.n, R = town.R + 20, opts = [];
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = town.cx + dx, y = town.cy + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x; if (world.deep[i] && !world.surveyed[i]) opts.push(i);
  }
  if (!opts.length) return;
  const i = opts[Math.floor(Math.random() * opts.length)], kind = world.deep[i];
  // The whole pocket comes up at once.
  const q = [i], seen = new Set([i]); let found = 0;
  while (q.length) { const j = q.shift(); if (world.deep[j] !== kind) continue; world.surveyed[j] = 1; dirty.add(j); found++; const x = j % n, y = (j - x) / n; for (const [ox, oy] of OFFS4) { const nx = x + ox, ny = y + oy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue; const k = ny * n + nx; if (!seen.has(k) && world.deep[k] === kind) { seen.add(k); q.push(k); } } }
  const geo = person(town, 'geologist') || elect(town, 'geologist', true); deed(geo, kind === 5 ? 'found oil' : `found a deep ${ORE_NAMES[kind]} seam`);
  log(kind === 5 ? `${town.name}'s geologist ${geo.name} finds oil under the ground nearby` : `${town.name}'s geologist ${geo.name} finds a deep ${ORE_NAMES[kind]} seam`, 'tech');
}
// Derricks and shafts pull from the surveyed pocket they stand on, as long as the town has power.
function updateExtraction(town) {
  for (const i of town.buildings) {
    const t = world.type[i];
    if (t !== T.DERRICK && t !== T.SHAFT) continue;
    if (town.spent[i] || !world.deepAmt[i]) continue;
    if (town.power < 1 || town.powerRatio < 0.5) continue;
    const kind = world.deep[i], take = Math.min(world.deepAmt[i], t === T.DERRICK ? 2 : 1);
    world.deepAmt[i] -= take; addRes(town, ORE_NAMES[kind], take);
    if (world.deepAmt[i] <= 0) { town.spent[i] = 1; log(kind === 5 ? `The oil under ${town.name} runs dry` : `The deep ${ORE_NAMES[kind]} seam under ${town.name} is exhausted`, 'loss'); }
  }
}
function buildOn(town, i, type) {
  const wt = world.type, t = wt[i];
  if (!(t === T.GRASS || t === T.SCRUB || t === T.ASH || t === T.MUD || t === T.STUMP || (t === T.DIRT && !world.road[i]) || isTree(t))) return false;
  if (world.burnLeft[i] > 0 || poisoned(i)) return false;
  for (const o of world.towns) if (o !== town && Math.hypot(o.cx - i % world.n, o.cy - Math.floor(i / world.n)) <= o.R + 3) return false;
  if (isTree(t)) world.treeCount--;
  wt[i] = type; world.townOf[i] = town.id; world.road[i] = 0;
  if (!town.buildings.includes(i)) town.buildings.push(i);
  world.buildingsTotal++; world.buildingsLeft++;
  dirty.add(i);
  toSite(town, i, type);
  return true;
}
function pastureRoom(t) { let have = 0; for (const k of LIVESTOCK) have += t.livestock[k] || 0; return countType(t, T.PASTURE) * 8 - have; }
function updateLivestock(town) {
  const ls = town.livestock; if (!ls) return;
  let total = 0; for (const k of LIVESTOCK) total += ls[k] || 0;
  // Breeding, if there is room on the pasture.
  if (pastureRoom(town) > 0) for (const k of LIVESTOCK) if (ls[k] >= 2 && Math.random() < (k === 'chickens' ? 0.14 : 0.06) * (has(town, 'beastlord') ? 1.6 : 1)) { ls[k]++; stat('ev', 'animalsBorn'); }
  // Fences before beasts: a town with animals, or one big enough to want some, lays out a pasture.
  const pastures = countPlanned(town, T.PASTURE);
  if ((total > 0 && pastureRoom(town) < 2 && pastures < 1 + Math.floor(total / 8)) || (!pastures && town.popLeft >= 30 && Math.random() < 0.2)) {
    if (canAfford(town, COST[T.PASTURE]) && buildField(town, T.PASTURE)) { pay(town, COST[T.PASTURE]); if (pastures === 0) log(`${town.name} fences a pasture`, 'build'); }
  }
}
// How far a town will send people for rock and ore: further on big maps, where the rock is further.
function siteReach(town) { return Math.max(town.R + 18, Math.round(world.n * 0.24)); }
function buildSites(town) {
  if (Math.random() > 0.3) return;
  if (town.civ >= 4 && hasPlanned(town, T.FACTORY)) {
    const n = world.n, R = town.R + 20;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = town.cx + dx, y = town.cy + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const i = y * n + x;
      if (!world.surveyed[i] || !world.deep[i] || !world.deepAmt[i] || isBuilding(world.type[i])) continue;
      const kind = world.deep[i], type = kind === 5 ? T.DERRICK : T.SHAFT;
      if (countPlanned(town, type) >= 2 || !canAfford(town, COST[type])) continue;
      if (buildOn(town, i, type)) { pay(town, COST[type]); town.deepSite[i] = kind; log(kind === 5 ? `${town.name} raises an oil derrick` : `${town.name} sinks a shaft to the deep ${ORE_NAMES[kind]}`, 'build'); if (Math.hypot(x - town.cx, y - town.cy) > town.R + 8) startWorkRoad(town, i); return; }
    }
  }
  if (town.popLeft >= 25 && !hasPlanned(town, T.QUARRY) && canAfford(town, COST[T.QUARRY])) {
    const i = placeSite(town, T.QUARRY, siteReach(town), (t, j) => t === T.ROCK && !world.oreKind[j]);
    if (i >= 0) { pay(town, COST[T.QUARRY]); log(`${town.name} opens a quarry`, 'build'); if (Math.hypot(i % world.n - town.cx, Math.floor(i / world.n) - town.cy) > town.R + 8) startWorkRoad(town, i); return; }
  }
  if (town.popLeft >= 40 && canAfford(town, COST[T.MINE])) {
    const wants = techWants(town), order = [6, 1, 2, 3, 4]; // gold first: everyone knows what that is
    for (const k of [4, 3, 2, 1]) if (wants.has(ORE_NAMES[k])) { order.splice(order.indexOf(k), 1); order.unshift(k); } // unless a tech is waiting on an ore
    for (const kind of order) {
      const wanted = wants.has(ORE_NAMES[kind]);
      if (kind === 2 && town.popLeft < 60 && !wanted) continue;
      if (kind === 4 && town.mil < 4 && town.civ < 3) continue; // nobody digs for uranium until they know what it is
      if (countPlanned(town, T.MINE) >= 1 + Math.floor(town.popLeft / 80) + (wanted ? 1 : 0)) { if (wanted) continue; break; }
      const i = placeSite(town, T.MINE, siteReach(town) + 6, (t, j) => t === T.ROCK && world.oreKind[j] === kind && world.ore[j] > 0 && !mineServes(j));
      if (i >= 0) { pay(town, COST[T.MINE]); town.mineKind[i] = kind; log(kind === 6 ? `GOLD! ${town.name} digs a gold mine` : `${town.name} digs ${kind === 1 ? 'an iron' : 'a ' + ORE_NAMES[kind]} mine`, 'build'); if (Math.hypot(i % world.n - town.cx, Math.floor(i / world.n) - town.cy) > town.R + 8) startWorkRoad(town, i); return; }
    }
  }
  const wells = countPlanned(town, T.WELL), dryWells = town.buildings.filter(i => world.type[i] === T.WELL && town.wells[i] !== undefined && town.wells[i] <= 0).length;
  if (town.popLeft >= 12 && town.res.water < resCap(town, 'water') * 0.35 && wells - dryWells < 1 + Math.floor(town.popLeft / 50) && canAfford(town, COST[T.WELL])) {
    const i = placeCivic(town, T.WELL, true);
    if (i >= 0) { pay(town, COST[T.WELL]); town.wells[i] = aquifer(town); log(wells ? `${town.name} digs another well` : `${town.name} digs a well`, 'build'); return; }
  }
  if (town.civ >= 1 && !hasPlanned(town, T.WHEEL) && canAfford(town, COST[T.WHEEL])) {
    const i = placeSite(town, T.WHEEL, town.R + 6, t => t === T.WATER);
    if (i >= 0) { pay(town, COST[T.WHEEL]); log(`${town.name} builds a water wheel on the river`, 'build'); return; }
  }
  if ((town.civ >= 1 || town.mil >= 2) && !hasPlanned(town, T.PLANT) && town.popLeft >= 50 && (town.res.coal >= 8 || town.res.wood >= 30) && canAfford(town, COST[T.PLANT])) {
    const i = placeCivic(town, T.PLANT, false);
    if (i >= 0) { pay(town, COST[T.PLANT]); log(`${town.name} ${town.res.coal >= 8 ? 'fires up a coal plant' : 'builds a wood-fired boiler and lights the first lamps'}`, 'build'); return; }
  }
  if (town.civ >= 3 && town.popLeft >= 80 && !hasPlanned(town, T.HYDRO) && canAfford(town, COST[T.HYDRO])) {
    const i = placeSite(town, T.HYDRO, town.R + 8, (t, j) => t === T.WATER && world.flow[j] >= 0);
    if (i >= 0) { pay(town, COST[T.HYDRO]); log(`${town.name} dams the river for hydroelectric power`, 'build'); return; }
  }
  if ((town.civ >= 4 || town.mil >= 6) && hasPlanned(town, T.UNIVERSITY) && !hasPlanned(town, T.NUCLEAR) && town.res.uranium >= COST[T.NUCLEAR].uranium && canAfford(town, COST[T.NUCLEAR])) {
    const i = placeCivic(town, T.NUCLEAR, false);
    if (i >= 0) { pay(town, COST[T.NUCLEAR]); log(`${town.name} brings a reactor online. ${town.align.moral < 0 ? 'Nobody asked whether it was safe.' : 'The engineers swear it is safe.'}`, 'build'); return; }
  }
  if (town.civ >= 4 && countPlanned(town, T.SOLAR) < 2 && canAfford(town, COST[T.SOLAR])) {
    const i = placeCivic(town, T.SOLAR, false);
    if (i >= 0) { pay(town, COST[T.SOLAR]); log(`${town.name} raises a solar array`, 'build'); }
  }
}
// Loggers, quarriers and miners: out to the work, a while at it, and back with the goods.
function updateGatherer(town, w) {
  const n = world.n, type = world.type;
  if (w.job === 'hunt') return updateHunter(town, w);
  if (w.job === 'water') return updateCarrier(town, w);
  if (w.job === 'build') return updateBuilder(town, w);
  if (w.job === 'harvest') return updateHarvester(town, w);
  if (w.site >= 0 && type[w.site] !== w.siteType) return false; // the site burned
  if (w.job === 'mine' && town.spent[w.site]) return false;
  if (w.phase === 'out') {
    const kind = w.job === 'log' ? 'wood' : w.job === 'quarry' ? 'stone' : ORE_NAMES[town.mineKind[w.site] || 0];
    if (kind && town.res[kind] >= resCap(town, kind)) { w.target = -1; return true; } // store is full: wait at home
    if (w.target < 0 || !gatherTargetOk(w)) {
      w.target = pickGatherTarget(town, w);
      if (w.target < 0) { w.idle = (w.idle || 0) + 1; return w.idle < 40; }
    }
    const tx = w.target % n, ty = (w.target - tx) / n;
    if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) { w.phase = 'work'; w.work = 0; w.stuck = 0; }
    else { stepToward(w, tx, ty, 1, false); if (w.stall > 4 || ++w.stuck > 60) { w.bad = (w.bad || []).concat(w.target).slice(-6); w.target = -1; w.stuck = 0; w.stall = 0; w.lastCell = -1; w.fails = (w.fails || 0) + 1; if (w.site >= 0 && w.fails > 3) { town.unreachable = town.unreachable || {}; town.unreachable[w.site] = world.tick + 1500; return false; } } } // remember trees it could not reach; a site nobody can walk to is left for a while
    return true;
  }
  if (w.phase === 'work') {
    w.work++;
    if (Math.random() < 0.45) dust(w.target);
    if (w.work >= (w.job === 'log' ? 10 : 14)) {
      if (w.job === 'log') {
        const t = type[w.target];
        if (isTree(t)) { w.carry = WOOD_YIELD[t] || 3; type[w.target] = T.FELLED; world.since[w.target] = world.tick; if (t !== T.SNAG) world.treeCount--; dirty.add(w.target); for (let k = 0; k < 3; k++) dust(w.target); town.felled = (town.felled || 0) + 1; stat('ev', 'felled'); }
      } else if (w.job === 'quarry') w.carry = 3;
      else {
        const o = w.target, take = Math.min(2, world.ore[o]);
        world.ore[o] -= take; w.carry = take; w.kind = ORE_NAMES[world.oreKind[o]];
        if (world.ore[o] <= 0) { world.oreKind[o] = 0; dirty.add(o); if (pickMineTarget(w) < 0) { town.spent[w.site] = 1; log(`The ${w.kind} seam at ${town.name} is worked out`, 'loss'); } }
      }
      w.phase = 'back';
    }
    return true;
  }
  const hx = w.home % n, hy = (w.home - hx) / n;
  if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) {
    if (w.carry) addRes(town, w.job === 'log' ? 'wood' : w.job === 'quarry' ? 'stone' : w.kind, w.carry);
    w.carry = 0; w.phase = 'out'; w.target = -1; w.stuck = 0;
  } else { stepToward(w, hx, hy, 1, false); if (w.stall > 10 || ++w.stuck > 80) return false; }
  return true;
}
// Hunters stalk the nearest herd, take one animal, and carry the game home. Now and then the
// animal comes home alive instead, and that is how a town first gets pigs, sheep, chickens or cattle.
function updateHunter(town, w) {
  const n = world.n;
  if (w.phase === 'out') {
    let herd = w.herd !== undefined ? (world.herds || [])[w.herd] : null;
    if (!herd || herd.size <= 0) { let best = -1, bd = town.R + 18; (world.herds || []).forEach((h, k) => { if (w.badHerd === k && world.tick < (w.badUntil || 0)) return; const d = Math.hypot(h.x - w.x, h.y - w.y); if (h.size >= 3 && d < bd) { bd = d; best = k; } }); /* small herds are left to recover; a herd across the water is left for a while */ if (best < 0) { w.idle = (w.idle || 0) + 1; return w.idle < 40; } w.herd = best; herd = world.herds[best]; }
    if (Math.hypot(herd.x - w.x, herd.y - w.y) <= 2.5) { w.phase = 'work'; w.work = 0; w.stall = 0; return true; }
    stepToward(w, herd.x, herd.y, 1, false);
    if (w.stall > 4 || ++w.stuck > 120) { w.badHerd = w.herd; w.badUntil = world.tick + 300; w.herd = undefined; w.stuck = 0; w.stall = 0; w.lastCell = -1; }
    return true;
  }
  if (w.phase === 'work') {
    const herd = (world.herds || [])[w.herd];
    if (!herd || herd.size < 3) { w.phase = 'out'; w.herd = undefined; return true; }
    if (++w.work === 5) {
      const [px, py] = cellCenter(w.y * n + w.x); particles.push({ x: px, y: py, vx: (herd.x - w.x) * 60, vy: (herd.y - w.y) * 60, life: 0, max: 150, color: '#ffe866', size: 2, grav: 0 }); // the shot
      herd.size--; herd.wx = -1; herd.rest = 0;
      const kind = HERD_KINDS.find(k => k[0] === herd.kind);
      if (kind[3] && pastureRoom(town) > 0 && Math.random() < 0.35) { w.animal = kind[3]; w.carry = 0; }
      else { w.carry = kind[4]; w.animal = null; }
      stat('ev', 'hunted');
      w.phase = 'back';
    }
    return true;
  }
  const hx = w.home % n, hy = (w.home - hx) / n;
  if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) {
    if (w.animal) { town.livestock[w.animal] = (town.livestock[w.animal] || 0) + 1; if (!town.tamed || !town.tamed[w.animal]) { town.tamed = town.tamed || {}; town.tamed[w.animal] = 1; deed(person(town, 'hunter'), `brought home the first ${w.animal}`); log(`${town.name}'s hunters bring a young ${w.animal === 'cattle' ? 'aurochs' : w.animal === 'pigs' ? 'boar' : w.animal === 'chickens' ? 'grouse' : 'wild sheep'} home alive, to raise`, 'build'); stat('ev', 'tamed'); } }
    else if (w.carry) addRes(town, 'game', w.carry);
    w.carry = 0; w.animal = null; w.phase = 'out'; w.herd = undefined; w.stuck = 0;
  } else { stepToward(w, hx, hy, 1, false); if (w.stall > 10 || ++w.stuck > 100) return false; }
  return true;
}
// Water carriers: out to the nearest open water, fill up, and back to the cistern.
function updateCarrier(town, w) {
  const n = world.n;
  if (w.phase === 'out') {
    if (w.target < 0 || world.type[w.target] !== T.WATER || world.snow[w.target] >= ICE_AT) { w.target = waterCellNear(town, w); if (w.target < 0) { w.idle = (w.idle || 0) + 1; return w.idle < 30; } }
    const tx = w.target % n, ty = (w.target - tx) / n;
    if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) { w.phase = 'work'; w.work = 0; w.stall = 0; return true; }
    stepToward(w, tx, ty, 1, false);
    if (w.stall > 4 || ++w.stuck > 80) { w.target = -1; w.stuck = 0; w.stall = 0; w.lastCell = -1; }
    return true;
  }
  if (w.phase === 'work') { if (++w.work >= 4) { w.carry = 6; w.kind = 'water'; w.phase = 'back'; } return true; }
  const hx = w.home % n, hy = (w.home - hx) / n;
  if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) { if (w.carry) addRes(town, 'water', w.carry); w.carry = 0; w.phase = 'out'; w.target = -1; w.stuck = 0; }
  else { stepToward(w, hx, hy, 1, false); if (w.stall > 10 || ++w.stuck > 100) return false; }
  return true;
}
function gatherTargetOk(w) {
  const t = world.type[w.target];
  if (world.burnLeft[w.target] > 0) return false;
  if (w.job === 'log') return isTree(t);
  if (w.job === 'quarry') return t === T.ROCK;
  return t === T.ROCK && world.ore[w.target] > 0;
}
function pickMineTarget(w) {
  const n = world.n, x = w.site % n, y = (w.site - x) / n;
  for (const [ox, oy] of OFFS8) { const nx = x + ox, ny = y + oy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue; const j = ny * n + nx; if (world.type[j] === T.ROCK && world.ore[j] > 0) return j; }
  return -1;
}
function pickGatherTarget(town, w) {
  const n = world.n, type = world.type;
  if (w.job === 'mine') return pickMineTarget(w);
  if (w.job === 'quarry') {
    const x = w.site % n, y = (w.site - x) / n, opts = [];
    for (const [ox, oy] of OFFS8) { const nx = x + ox, ny = y + oy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue; const j = ny * n + nx; if (type[j] === T.ROCK && !world.oreKind[j]) opts.push(j); }
    return opts.length ? opts[Math.floor(Math.random() * opts.length)] : -1;
  }
  // Loggers: the nearest standing tree that nobody else is on and no other town claims.
  const R = town.R + 12;
  let best = -1, bd = Infinity;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = town.cx + dx, y = town.cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x;
    if (!isTree(type[i]) || world.burnLeft[i] > 0 || world.snow[i] >= 190) continue;
    if (w.bad && w.bad.includes(i)) continue;
    const d = Math.hypot(x - w.x, y - w.y) + Math.random() * 2;
    if (d >= bd) continue;
    let bad = false; for (const o of world.towns) if (o !== town && Math.hypot(o.cx - x, o.cy - y) <= o.R + 4) { bad = true; break; }
    if (bad) continue;
    if (town.workers.some(o => o !== w && o.target === i)) continue;
    bd = d; best = i;
  }
  return best;
}
function spawnGatherers(town) {
  const n = world.n, type = world.type;
  if (world.tick % 7 !== 0 || town.popLeft < 4) return;
  const muster = campPoint(town); if (muster < 0) return;
  const mk = (job, site, siteType, home) => { const hx = home % n, hy = (home - hx) / n; town.workers.push({ x: hx, y: hy, px: hx, py: hy, target: -1, linger: 0, face: 1, job, gather: true, site, siteType, home, phase: 'out', work: 0, carry: 0, stuck: 0 }); };
  const short = shortages(town), tp = town.temper || { wood: 1, stone: 1, food: 1, build: 1 };
  const siteCount = Object.keys(town.sites || {}).filter(k => type[+k] === T.SITE).length;
  if (siteCount && town.workers.filter(w => w.job === 'build').length < Math.min(5, Math.round((1 + Math.floor(town.popLeft / 40)) * tp.build) + (siteCount > 3 ? 1 : 0))) { mk('build', -1, 0, muster); return; }
  const ripeCount = town.buildings.filter(i => type[i] === T.FARM && world.crop[i] >= 100).length;
  if (ripeCount && town.workers.filter(w => w.job === 'harvest').length < Math.min(6, 1 + Math.floor(ripeCount / 3) + Math.round(Math.floor(town.popLeft / 60) * tp.food) + (short.has('food') ? 1 : 0))) { mk('harvest', -1, 0, muster); return; }
  const waterNear = waterCellNear(town) >= 0;
  const wantWater = waterNear && (town.res.water || 0) < resCap(town, 'water') * 0.7 ? Math.min(3, 1 + Math.floor(town.popLeft / 60) + (short.has('water') ? 1 : 0)) : 0;
  if (town.workers.filter(w => w.job === 'water').length < wantWater) { mk('water', -1, 0, muster); return; }
  const herdsNear = (world.herds || []).some(h => Math.hypot(h.x - town.cx, h.y - town.cy) <= town.R + 18);
  const wantHunt = herdsNear && town.popLeft >= 15 && (town.res.game || 0) < resCap(town, 'game') ? Math.min(4, 1 + Math.floor(town.popLeft / 120) + (short.has('food') ? 1 : 0) + (has(town, 'beastlord') ? 1 : 0)) : 0;
  if (town.workers.filter(w => w.job === 'hunt').length < wantHunt) { mk('hunt', -1, 0, muster); return; }
  const yards = town.buildings.filter(i => type[i] === T.LUMBERYARD);
  const wantLog = Math.min(2 + 2 * yards.length + (short.has('wood') ? 2 : 0), Math.round((1 + Math.floor(town.popLeft / 40)) * tp.wood) + (short.has('wood') ? 1 : 0));
  const loggers = town.workers.filter(w => w.job === 'log').length;
  if (loggers < wantLog && town.res.wood < resCap(town, 'wood')) { mk('log', -1, 0, yards.length ? yards[Math.floor(Math.random() * yards.length)] : muster); return; }
  const blocked = i => town.unreachable && town.unreachable[i] > world.tick;
  for (const q of town.buildings.filter(i => type[i] === T.QUARRY && !blocked(i))) {
    if (town.workers.filter(w => w.job === 'quarry' && w.site === q).length < (short.has('stone') ? 3 : 2) && town.res.stone < resCap(town, 'stone')) { mk('quarry', q, T.QUARRY, muster); return; }
  }
  for (const m of town.buildings.filter(i => type[i] === T.MINE && !town.spent[i] && !blocked(i))) {
    const kind = ORE_NAMES[town.mineKind[m] || 0];
    if (town.workers.filter(w => w.job === 'mine' && w.site === m).length < (short.has(kind) ? 3 : 2) && (!kind || town.res[kind] < resCap(town, kind))) { mk('mine', m, T.MINE, muster); return; }
  }
}
// Who wants what somebody else has: a seam of a metal you cannot reach yourself.
function coveted(a, b) {
  if (!b.mineKind || a.mil < 1) return null;
  for (const i of b.buildings) {
    if (world.type[i] !== T.MINE || b.spent[i]) continue;
    const kind = b.mineKind[i]; if (!kind) continue;
    if (kind === 4 && a.mil < 4) continue;
    if (kind === 6 && a.align.moral >= 0 && Math.random() < 0.5) continue; // only the greedy covet gold outright
    if (Object.keys(a.mineKind).some(j => a.mineKind[j] === kind && world.type[j] === T.MINE && !a.spent[j])) continue;
    if (oreNear(a, kind, siteReach(a) + 6)) continue;
    return ORE_NAMES[kind];
  }
  return null;
}

