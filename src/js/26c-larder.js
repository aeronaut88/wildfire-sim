/* ───────────────────────── The larder ─────────────────────────
   Food is more than grain. Fishers work the shore, the boats and, in winter, the ice. Smokehouses
   turn the autumn kill and the catch into jerky that keeps; mills and bakeries turn grain into bread
   that goes further; a brewery turns barley into beer; an inn's cooks turn bread and cured meat into
   hot meals. Fields grow four crops with their own seasons. All of it is gated on the craft tree. */
const FOOD_KINDS = ['fish', 'game', 'meals', 'fruit', 'grain', 'bread', 'jerky']; // eaten in this order: fresh first, then the sacks, then the loaves, the smokehouse last
const THEFT_ORDER = ['bread', 'grain', 'fish', 'game', 'jerky', 'fruit', 'meals'];
const CROP_NAMES = ['wheat', 'barley', 'turnips', 'orchard', 'tobacco'];
const CROP_YIELD = [9, 8, 7, 6, 6];
// Growth by season for each crop: spring, summer, autumn, winter.
const CROP_SEASON = [[0.9, 1, 1.1, 0], [0.9, 1, 1.1, 0], [0.6, 0.9, 1.2, 0.3], [0.5, 0.8, 1.0, 0], [0.7, 1.2, 0.9, 0]];
function foodStock(t) { let s = 0; for (const k of FOOD_KINDS) s += t.res[k] || 0; return s; }
function cropKindAt(i) { return world.cropKind ? world.cropKind[i] : 0; }
function barleyFields(t) { let c = 0; for (const i of t.buildings) if (world.type[i] === T.FARM && cropKindAt(i) === 1) c++; return c; }
// What a town plants: wheat until it learns better; barley for the brewery; turnips in cold country and
// after a famine; an orchard when it is fed and has stone to spare.
function pickCrop(t) {
  const c = t.craft || 0, cold = world.climate && (world.climate.name === 'cold' || world.climate.name === 'ridge');
  const opts = [[0, 3]];
  if (c >= 3) opts.push([1, 3]); // barley as soon as there is a mill to grind it: the brewery will want it
  if (c >= 4) opts.push([2, cold || t.famine || t.hadFamine ? 3 : 1.2]);
  if (c >= 7 && t.fed && !shortages(t).has('stone')) opts.push([3, 1]);
  if (c >= 5 && !cold && latCold(t.cy * world.n + t.cx) < 0.2 && biomeAt(t.cx, t.cy) !== 1 && biomeAt(t.cx, t.cy) !== 4) opts.push([4, 1.5]); // tobacco wants warm, dry ground, and not the far north
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
    else if ((t.res.wood || 0) < 1 && ((t.res.fish || 0) >= 6 || (t.res.game || 0) >= 6) && (!t.coldLogged || world.tick - t.coldLogged > YEAR)) { t.coldLogged = world.tick; say(t, 'smokeCold', {}, 'loss'); }
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
    else if ((t.res.grain || 0) < eat * 2 + 2 && (!t.bakersLogged || world.tick - t.bakersLogged > YEAR) && Math.random() < 0.5) { t.bakersLogged = world.tick; say(t, 'bakersOut', {}, 'loss'); }
  }
  // Brewery: barley into beer, if there are barley fields to speak of.
  const br = workshop(T.BREWERY);
  if (br !== undefined && jobCount(t, 'brewer') > 0 && barleyFields(t) >= 2) {
    let b = batchesOf('brewer', 2), done = 0, fuel = 0;
    while (b-- > 0 && (t.res.beer || 0) < resCap(t, 'beer') && (t.res.grain || 0) - 2 >= eat * 2 && (t.res.wood || 0) >= (fuel % 2 === 0 ? 1 : 0)) {
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

// ── Spirits: how life feels in a town, as against unrest, which is how it feels about its elder. ──
// Beer at the inn, hot meals, fruit and bread in the larder, festivals and feasts lift it; hunger, thirst,
// deaths and a dry inn sink it. High spirits calm a town and draw newcomers; low spirits drive families
// out to wherever the inn is open. And where there is beer, some drink too much.
function cheerOf(t) { return Number.isFinite(t.cheer) ? t.cheer : 50; }
function updateCheer(t) {
  const c0 = cheerOf(t), inn = hasType(t, T.INN) && t.buildings.some(i => world.type[i] === T.INN && world.burnLeft[i] <= 0);
  let d = (50 - c0) * 0.02; // drifts back toward the middle
  d += t.fed ? 0.3 : -1; if (t.famine) d -= 1.5; if (t.water === false) d -= 1;
  const deaths = t.deaths - (t.cheerDeaths || 0); t.cheerDeaths = t.deaths; d -= Math.min(2, deaths / 10);
  // The inn serves beer: a cup for every sixty people a cycle. A town that has had beer and runs dry feels it.
  t.drank = 0;
  if (inn && (t.res.beer || 0) > 0) { const cups = Math.min(t.res.beer, Math.max(1, Math.ceil(t.popLeft / 60))); t.res.beer -= cups; t.drank = cups; t.beerKnown = world.tick; d += 0.8; }
  else if (inn && t.beerKnown && world.tick - t.beerKnown < 2400) { d -= 0.6; if (!t.dryLoggedInn || world.tick - t.dryLoggedInn > 1200) { t.dryLoggedInn = world.tick; log(pick([`The inn at ${t.name} is dry. ${moodWord(t)[0].toUpperCase() + moodWord(t).slice(1)}.`, `No beer at ${t.name}'s inn ${daypart()}, and the talk turns sour`, `${t.name}'s brewer has nothing in the vats. The inn sits empty and so do the people.`]), 'loss'); } }
  if (t.ateMeals) d += t.mealsFruit && world.tick - t.mealsFruit < 32 ? 1 : 0.5;
  if ((t.res.fruit || 0) > 0) d += 0.2; if ((t.res.bread || 0) > 0) d += 0.2;
  // A pipe after work. A little tobacco never hurt anyone, they say; the healer's ledger says otherwise.
  t.smoked = 0;
  if ((t.res.tobacco || 0) > 0) {
    const pipes = Math.min(t.res.tobacco, Math.max(1, Math.ceil(t.popLeft / 120))); t.res.tobacco -= pipes; t.smoked = pipes; d += 0.4;
    if (!t.pipeLogged) { t.pipeLogged = true; log(`Pipe smoke over ${t.name} ${daypart()}: the first tobacco comes in and everyone tries it`, 'good'); }
    if (Math.random() < 0.015 * (hasType(t, T.HEALER) || hasType(t, T.HOSPITAL) ? 0.5 : 1)) {
      applyLosses(t, 1, 'the cough'); t.coughs = (t.coughs || 0) + 1; stat('ev', 'coughs');
      if (t.coughs === 1) log(`${t.name} buries the first of its pipe-smokers. The healer calls it the cough and says the pipe has nothing to do with it.`, 'loss');
      else if (Math.random() < 0.2) log(pick([`Another at ${t.name} goes to the cough. Half the town smokes; nobody blames the pipe.`, `The cough takes one more at ${t.name}. The pipes are lit at the graveside.`]), 'loss');
    }
  }
  if (t.festivalYear === Math.floor(world.tick / YEAR) && !t.cheerFest) { t.cheerFest = true; d += 8; } else if (t.festivalYear !== Math.floor(world.tick / YEAR)) t.cheerFest = false;
  t.cheer = Math.max(0, Math.min(100, c0 + d));
  // Low spirits: families leave for the happiest town within reach that has beds.
  if (t.cheer < 25 && t.popLeft >= 40 && world.tick % 80 < 16 && Math.random() < 0.5) {
    let best = null; for (const o of world.towns) if (o !== t && isAlive(o) && cheerOf(o) >= 55 && o.popLeft < housingCapacity(o) && Math.hypot(o.cx - t.cx, o.cy - t.cy) < world.n * 0.6 && (!best || cheerOf(o) > cheerOf(best))) best = o;
    if (best) {
      const k = Math.max(2, Math.round(t.popLeft * 0.02));
      t.popLeft -= k; best.popLeft += k; best.popTotal += k; stat('ev', 'leftForCheer', k);
      t.leftAcc = (t.leftAcc || 0) + k; // said once a season, with everyone who went since
      if (twDue(t, 'emigrate', YEAR / 4)) { say(t, 'emigrate', { k: t.leftAcc, other: best.name }, 'loss'); t.leftAcc = 0; }
    }
  }
}
// Where there is beer, some drink too much: a few at the inn through the day instead of at their work,
// and one who makes a name for it.
function drunkShare(t) { return t.drank > 0 || ((t.res.beer || 0) > 0 && hasType(t, T.INN)) ? (0.03 + (cheerOf(t) > 70 ? 0.02 : 0) + (has(t, 'drunkard') ? 0.03 : 0)) : 0; }
function updateSot(t) {
  if (!t.drank || !t.people) return;
  let sot = person(t, 'sot');
  if (!sot) {
    if (Math.random() > 0.3) return;
    sot = elect(t, 'sot', true); if (!sot) return;
    sot.story = pick(['has not been sober since the brewery opened', 'drinks to forget something nobody has asked about', 'sings when drunk, which is always', 'claims to have seen the dragon up close, twice']);
    log(`${sot.name} is the first to be found asleep under a table at ${t.name}'s inn. It will not be the last time.`, 'good');
    return;
  }
  if (Math.random() > 0.04) return; // a deed now and then
  const inn = t.buildings.find(i => world.type[i] === T.INN && world.burnLeft[i] <= 0);
  const frozen = world.water.some(i => world.snow[i] >= ICE_AT);
  const r = Math.random();
  if (r < 0.12 && inn !== undefined) {
    deed(sot, 'knocked a lamp over at the inn'); log(`${sot.name} knocks a lamp over at ${t.name}'s inn ${daypart()}. ${Math.random() < 0.3 ? 'It catches.' : 'Someone stamps it out, and throws them in the street.'}`, 'arson');
    if (Math.random() < 0.3) ignite(inn);
  } else if (r < 0.2 && frozen) {
    if (Math.random() < 0.25) { sot.alive = false; sot.cause = 'froze on the ice, drunk'; applyLosses(t, 1, 'froze'); deed(sot, 'went to sleep on the ice'); log(`${sot.name} of ${t.name} is found on the ice at first light, frozen where ${pick(['he', 'she', 'they'])} lay down. The fishers cut the hole for the body.`, 'loss'); }
    else { deed(sot, 'was carried in off the ice'); log(`${sot.name} is found asleep on the ice and carried in by ${t.name}'s fishers, swearing at them`, 'good'); }
  } else if (r < 0.35) { deed(sot, 'fell in the river'); log(`${sot.name} falls in the river at ${t.name} ${daypart()} and is fished out ${Math.random() < 0.5 ? 'by the fishers' : 'downstream, still holding the cup'}`, 'good'); }
  else if (r < 0.5) { deed(sot, 'slept in the smokehouse'); log(`${sot.name} sleeps the night in ${t.name}'s smokehouse and comes out cured`, 'good'); }
  else if (r < 0.65) { const e = person(t, 'elder'); deed(sot, `sang under ${e ? e.name : "the elder"}'s window`); log(`${sot.name} sings under ${e ? e.name + "'s" : "the elder's"} window at ${t.name} until dawn. ${e ? e.name : 'The elder'} ${pick(['throws a boot', 'joins in on the second verse', 'has the constable fetch a bucket', 'says nothing, and remembers'])}.`, 'good'); t.unrest = Math.max(0, (t.unrest || 0) + (Math.random() < 0.5 ? 1 : -1)); }
  else if (r < 0.8) { deed(sot, 'started a brawl at the inn'); const hurt = Math.random() < 0.3 ? 1 : 0; if (hurt) applyLosses(t, 1, 'brawl'); log(`A brawl at ${t.name}'s inn: ${sot.name} ${pick(['says something about the elder', 'takes a swing at a trader', 'calls the brewer a thief'])} and the room comes down on ${pick(['him', 'her', 'them'])}. ${hurt ? 'One does not get up.' : 'Two in the gaol by morning.'}`, 'loss'); t.crimes = (t.crimes || 0) + 1; }
  else { deed(sot, 'swore off drink'); log(`${sot.name} swears off drink in front of the whole of ${t.name}. ${pick(['It lasts a week.', 'It lasts until the next festival.', 'Nobody takes the bet.'])}`, 'good'); }
}
// Evenings at the inn: a few walkers with cups who stand about the door and wander home crooked.
function updateCarouser(town, w) {
  const n = world.n;
  if (!town.drank && (town.res.beer || 0) <= 0) return false;
  if (w.site < 0 || world.type[w.site] !== T.INN) return false;
  const tx = w.site % n, ty = (w.site - tx) / n;
  if (w.phase === 'out') {
    if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) { w.phase = 'work'; w.work = 0; w.carry = 1; w.kind = 'beer'; }
    else { stepToward(w, tx, ty, 1, false); if (w.stall > 4 || ++w.stuck > 80) return false; }
    return true;
  }
  if (w.phase === 'work') { if (++w.work >= 30 + Math.random() * 40) { w.phase = 'back'; w.lastCell = -1; } return true; }
  // Home, crooked: every other step goes somewhere else.
  const hx = w.home % n, hy = (w.home - hx) / n;
  if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) return false;
  if (Math.random() < 0.35) { const dx = Math.floor(Math.random() * 3) - 1, dy = Math.floor(Math.random() * 3) - 1, j = (w.y + dy) * n + w.x + dx; if (dx || dy) if (j >= 0 && j < n * n && passable(world.type[j]) && !isBuilding(world.type[j])) { w.x += dx; w.y += dy; } return true; }
  stepToward(w, hx, hy, 1, false);
  return !(++w.stuck > 160);
}
