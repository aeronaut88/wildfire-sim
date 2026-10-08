/* ───────────────────────── The larder ─────────────────────────
   Food is more than grain. Fishers work the shore, the boats and, in winter, the ice. Smokehouses
   turn the autumn kill and the catch into jerky that keeps; mills and bakeries turn grain into bread
   that goes further; a brewery turns barley into beer; an inn's cooks turn bread and cured meat into
   hot meals. Fields grow four crops with their own seasons. All of it is gated on the craft tree. */
const FOOD_KINDS = ['fish', 'game', 'meals', 'fruit', 'bread', 'grain', 'jerky']; // eaten in this order: fresh first, the winter reserve last
const THEFT_ORDER = ['bread', 'grain', 'fish', 'game', 'jerky', 'fruit', 'meals'];
const CROP_NAMES = ['wheat', 'barley', 'turnips', 'orchard'];
const CROP_YIELD = [9, 8, 7, 6];
// Growth by season for each crop: spring, summer, autumn, winter.
const CROP_SEASON = [[0.9, 1, 1.1, 0], [0.9, 1, 1.1, 0], [0.6, 0.9, 1.2, 0.3], [0.5, 0.8, 1.0, 0]];
function foodStock(t) { let s = 0; for (const k of FOOD_KINDS) s += t.res[k] || 0; return s; }
function cropKindAt(i) { return world.cropKind ? world.cropKind[i] : 0; }
function barleyFields(t) { let c = 0; for (const i of t.buildings) if (world.type[i] === T.FARM && cropKindAt(i) === 1) c++; return c; }
// What a town plants: wheat until it learns better; barley for the brewery; turnips in cold country and
// after a famine; an orchard when it is fed and has stone to spare.
function pickCrop(t) {
  const c = t.craft || 0, cold = world.climate && (world.climate.name === 'cold' || world.climate.name === 'ridge');
  const opts = [[0, 3]];
  if (c >= 3) opts.push([1, hasType(t, T.BREWERY) || c >= 5 ? 3 : 1]);
  if (c >= 4) opts.push([2, cold || t.famine || t.hadFamine ? 3 : 1.2]);
  if (c >= 7 && t.fed && !shortages(t).has('stone')) opts.push([3, 1]);
  let sum = 0; for (const o of opts) sum += o[1];
  let r = Math.random() * sum; for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
  return 0;
}
function puff(i, color, k) {
  const [x, y] = cellCenter(i);
  for (let q = 0; q < (k || 2); q++) particles.push({ x: x + (Math.random() - 0.5) * cellPx * 0.6, y: y - cellPx * 0.4, vx: (Math.random() - 0.5) * 12 + params.windX * 6, vy: -18 - Math.random() * 14, life: 0, max: 700 + Math.random() * 400, color, size: Math.max(1.5, cellPx * 0.3), grav: -6 });
}

// ── Processing: every growth cycle, each staffed workshop runs its batches. ──
function updateProcessing(t) {
  if (!t.res) return;
  const mastery = (t.craft || 0) >= 8, out = mastery ? 4 : 3, eat = Math.ceil(t.popLeft / 30);
  const type = world.type;
  const sea = season();
  const batchesOf = (job, perWorker) => Math.min(jobCount(t, job) * perWorker, 12);
  const first = (key, text) => { if (!t.firsts) t.firsts = {}; if (!t.firsts[key]) { t.firsts[key] = world.tick; log(text, 'build'); stat('ev', key); } };
  const workshop = ty => t.buildings.find(i => type[i] === ty && world.burnLeft[i] <= 0);
  // Smokehouse: fish and game into jerky, a stick of wood a batch. Double shifts in autumn when the kill comes in.
  const sm = workshop(T.SMOKEHOUSE);
  if (sm !== undefined && jobCount(t, 'smoker') > 0) {
    let b = batchesOf('smoker', sea === 2 ? 2 : 1), done = 0;
    while (b-- > 0 && (t.res.jerky || 0) < resCap(t, 'jerky') && (t.res.wood || 0) >= 1) {
      const src = (t.res.game || 0) >= 2 && ((t.res.game || 0) >= (t.res.fish || 0) || (t.res.fish || 0) < 2) ? 'game' : (t.res.fish || 0) >= 2 ? 'fish' : null;
      if (!src) break;
      // keep a little fresh for tonight's pot
      if ((t.res.fish || 0) + (t.res.game || 0) - 2 < Math.min(4, eat)) break;
      t.res[src] -= 2; t.res.wood -= 1; addRes(t, 'jerky', out); done++;
      t.smoked = (t.smoked || 0) + out; if (src === 'fish') t.smokedFish = (t.smokedFish || 0) + out;
    }
    if (done) { puff(sm, '#6a6a6a', done); first('firstJerky', `The smokehouse at ${t.name} is lit. ${t.res.game >= t.res.fish ? 'Venison' : 'Fish'} hangs in the smoke, and for the first time something will keep till winter.`); }
    else if ((t.res.wood || 0) < 1 && ((t.res.fish || 0) >= 6 || (t.res.game || 0) >= 6) && (!t.coldLogged || world.tick - t.coldLogged > 800)) { t.coldLogged = world.tick; log(`The smokehouse at ${t.name} stands cold for want of firewood, and the catch is going off`, 'loss'); }
  }
  // Mill and bakery: grain into bread. Without a mill the bakers grind by hand and manage half as much.
  const bk = workshop(T.BAKERY);
  if (bk !== undefined && jobCount(t, 'baker') > 0) {
    const mill = hasType(t, T.MILL);
    let b = Math.max(1, Math.round(batchesOf('baker', 1) * (mill ? 1 : 0.5))), done = 0, fuel = 0;
    while (b-- > 0 && (t.res.bread || 0) < resCap(t, 'bread') && (t.res.grain || 0) - 2 >= eat * 2 && (t.res.wood || 0) >= (fuel % 2 === 0 ? 1 : 0)) {
      t.res.grain -= 2; if (fuel++ % 2 === 0) t.res.wood -= 1; addRes(t, 'bread', out); done++;
      t.baked = (t.baked || 0) + out;
    }
    if (done) { puff(bk, '#9a9aa4', 1); first('firstBread', `The ovens at ${t.name} are lit ${daypart()}. The first bread comes out ${mill ? 'light and good' : 'heavy, but it is bread'}.`); }
    else if ((t.res.grain || 0) < eat * 2 + 2 && (!t.bakersLogged || world.tick - t.bakersLogged > 800) && Math.random() < 0.5) { t.bakersLogged = world.tick; log(`${t.name}'s bakers are out of grain`, 'loss'); }
  }
  // Brewery: barley into beer, if there are barley fields to speak of.
  const br = workshop(T.BREWERY);
  if (br !== undefined && jobCount(t, 'brewer') > 0 && barleyFields(t) >= 2) {
    let b = batchesOf('brewer', 1), done = 0, fuel = 0;
    while (b-- > 0 && (t.res.beer || 0) < resCap(t, 'beer') && (t.res.grain || 0) - 2 >= eat * 3 && (t.res.wood || 0) >= (fuel % 2 === 0 ? 1 : 0)) {
      t.res.grain -= 2; if (fuel++ % 2 === 0) t.res.wood -= 1; addRes(t, 'beer', out); done++;
      t.brewed = (t.brewed || 0) + out;
    }
    if (done) { puff(br, '#c9a86a', 1); first('firstBeer', `${t.name} broaches its first barrel. ${pick(['It is not good. Nobody cares.', 'The brewer calls it drinkable, which is generous.', 'The elder has two and makes a speech.', 'It is, everyone agrees, better than the water.'])}`); }
  }
  // The inn: bread and cured meat into hot meals, once the town knows cookery. Fruit on the table doubles the cheer.
  const inn = workshop(T.INN);
  if (inn !== undefined && jobCount(t, 'cook') > 0 && (t.craft || 0) >= 6) {
    let b = batchesOf('cook', 1), done = 0;
    while (b-- > 0 && (t.res.meals || 0) < resCap(t, 'meals') && (t.res.bread || 0) >= 1 && (t.res.jerky || 0) >= 1) {
      t.res.bread -= 1; t.res.jerky -= 1; const fruit = (t.res.fruit || 0) >= 1; if (fruit) t.res.fruit -= 1;
      addRes(t, 'meals', out); done++; if (fruit) t.mealsFruit = world.tick;
      t.cooked = (t.cooked || 0) + out;
    }
    if (done) { puff(inn, '#d9c08a', 1); first('firstMeals', `The kitchen at ${t.name}'s inn serves its first hot meal: ${recipeFor(t)}. ${person(t, 'cook') ? person(t, 'cook').name + ' takes the credit.' : 'Nobody is sure who cooked it.'}`); }
  }
}
// A dish from what is in the larder.
function recipeFor(t) {
  const meat = (t.res.game || 0) > (t.res.fish || 0) ? pick(['venison', 'boar', 'hare']) : pick(['trout', 'smoked trout', 'pike']);
  const veg = t.buildings.some(i => world.type[i] === T.FARM && cropKindAt(i) === 2) ? 'turnip' : barleyFields(t) ? 'barley' : 'bread';
  const fruit = (t.res.fruit || 0) > 0 ? pick(['apple', 'plum', 'pear']) : null;
  return pick([`${meat} and ${veg} stew`, `${meat} with ${veg}`, fruit ? `${fruit} bread and ${meat}` : `${veg} and ${meat} pie`, (t.res.beer || 0) > 0 ? `${meat} in beer` : `${meat} broth`]);
}

// ── Fishing: from the shore, from a boat, and through the ice. ──
function fishYield(t, cell) {
  if (!t.waterNear || world.tick - t.waterNear.tick > 400) {
    const n = world.n, R = t.R + 12; let c = 0;
    for (const i of world.water) { const x = i % n, y = (i - x) / n; if (Math.abs(x - t.cx) <= R && Math.abs(y - t.cy) <= R && world.type[i] === T.WATER) c++; }
    t.waterNear = { tick: world.tick, count: c };
  }
  let y = 0.6 + 0.4 * Math.min(1, t.waterNear.count / 40);
  const sea = season();
  y *= [1, 1.1, 1.3, 0.6][sea];
  if (world.flow[cell] >= 0 && world.salmonRun && world.tick - world.salmonRun < 400) y *= 1.5; // the run
  return y;
}
function salmonRun() {
  const year = Math.floor(world.tick / YEAR);
  if (season() === 2 && world.salmonYear !== year && world.river.length) { world.salmonYear = year; world.salmonRun = world.tick; log(pick(['The salmon are running: the river is thick with them at every ford', 'Salmon in the river, so many the water looks like it is boiling at the shallows', 'The run is on. Every fisher in the valley is at the river']), 'weather'); }
}
function updateFisher(town, w) {
  const n = world.n;
  if (jobCount(town, 'fisher') < 1) return false;
  if (w.phase === 'out') {
    if (w.target < 0 || world.type[w.target] !== T.WATER) {
      // the nearest water within reach; the river in autumn, when the salmon run
      const R = town.R + 12, river = season() === 2 && world.salmonRun && world.tick - world.salmonRun < 400;
      let best = -1, bd = Infinity;
      for (const i of world.water) { const x = i % n, y = (i - x) / n; if (Math.abs(x - town.cx) > R || Math.abs(y - town.cy) > R || world.type[i] !== T.WATER) continue; if (w.bad && w.bad.includes(i)) continue; const d = Math.hypot(x - w.x, y - w.y) + Math.random() * 3 - (river && world.flow[i] >= 0 ? 6 : 0); if (d < bd) { bd = d; best = i; } }
      if (best < 0) { w.idle = (w.idle || 0) + 1; return w.idle < 30; }
      w.target = best; w.stuck = 0; w.stall = 0; w.lastCell = -1;
    }
    const tx = w.target % n, ty = (w.target - tx) / n;
    if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) {
      w.phase = 'work'; w.work = 0;
      if (world.snow[w.target] >= ICE_AT) { w.bank = w.y * n + w.x; w.x = tx; w.y = ty; w.ice = true; w.job = 'icefish'; } // out onto the ice
      return true;
    }
    stepToward(w, tx, ty, 1, false);
    if (w.stall > 4 || ++w.stuck > 100) { w.bad = (w.bad || []).concat(w.target).slice(-6); w.target = -1; w.stuck = 0; w.stall = 0; w.lastCell = -1; }
    return true;
  }
  if (w.phase === 'work') {
    if (w.ice && world.snow[w.target] < ICE_AT) { // the ice went out from under
      if (Math.random() < 0.5) { lostOnIce(town, w); return false; }
      w.x = w.bank % n; w.y = Math.floor(w.bank / n); w.ice = false; w.job = 'fish'; w.phase = 'out'; w.target = -1; return true;
    }
    if (++w.work === 2 && w.ice && world.snow[w.target] < ICE_AT + 6 && Math.random() < 0.02) { lostOnIce(town, w); return false; } // thin ice
    if (w.work >= 8) {
      const yld = fishYield(town, w.target) * (w.ice ? 0.6 : 1);
      w.carry = Math.max(1, Math.round((1 + Math.random() * 3) * yld)); w.kind = 'fish';
      if (w.ice && Math.random() < 0.3) { const [px, py] = cellCenter(w.target); particles.push({ x: px, y: py - cellPx * 0.3, vx: (Math.random() - 0.5) * 20, vy: -25, life: 0, max: 400, color: '#c4dcf0', size: 2, grav: 60 }); }
      stat('ev', w.ice ? 'iceFished' : 'fished', w.carry);
      if (w.ice) { w.x = w.bank % n; w.y = Math.floor(w.bank / n); w.ice = false; w.job = 'fish'; if (!town.iceLogged || world.tick - town.iceLogged > 2400) { town.iceLogged = world.tick; log(`${town.name}'s fishers cut holes in the ice ${daypart()} and sit over them with lines. It is cold work, and it is food.`, 'weather'); stat('ev', 'iceFishing'); } }
      w.phase = 'back';
    }
    return true;
  }
  const hx = w.home % n, hy = (w.home - hx) / n;
  if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) { if (w.carry) addRes(town, 'fish', w.carry); w.carry = 0; w.phase = 'out'; w.target = -1; w.stuck = 0; }
  else { stepToward(w, hx, hy, 1, false); if (w.stall > 10 || ++w.stuck > 100) return false; }
  return true;
}
function lostOnIce(town, w) {
  applyLosses(town, 1, 'drowned'); stat('ev', 'throughIce');
  const who = town.people && Math.random() < 0.3 ? person(town, 'fisher') : null;
  if (who && who.alive) { who.alive = false; who.cause = 'went through the ice'; log(`${who.name} of ${town.name} goes through the ice ${daypart()} and does not come up`, 'loss'); }
  else log(`One of ${town.name}'s fishers goes through the ice ${daypart()}. The others get a rope out too late.`, 'loss');
}
// A town with a fisher's hut, people enough and timber to spare puts a boat on the water.
function maybeLaunchBoat(t) {
  if (!hasType(t, T.FISHERY) || t.popLeft < 60 || (t.res.wood || 0) < 8 || world.boats.some(b => !b.fire && b.town === t.id) || Math.random() > 0.2) return;
  const n = world.n, near = world.water.find(i => world.type[i] === T.WATER && Math.hypot(i % n - t.cx, Math.floor(i / n) - t.cy) <= t.R + 8);
  if (near === undefined) return;
  t.res.wood -= 8;
  world.boats.push({ x: near % n, y: Math.floor(near / n), px: near % n, py: Math.floor(near / n), face: 1, fire: false, idle: 0, town: t.id });
  log(`${t.name} launches a fishing boat`, 'build'); stat('ev', 'boatsLaunched');
}

// ── Springs: a stream that rises inside the valley. ──
function springNear(t) {
  if (world.spring === undefined || world.spring < 0) return false;
  const n = world.n, x = world.spring % n, y = (world.spring - x) / n;
  return Math.hypot(x - t.cx, y - t.cy) <= t.R + 8;
}
function drinkFromSpring(t) {
  if (!springNear(t)) return;
  addRes(t, 'water', 3);
  if (!t.springLogged) { t.springLogged = true; log(`${t.name} draws its water from the spring. It has never run dry and never frozen.`, 'build'); }
}
