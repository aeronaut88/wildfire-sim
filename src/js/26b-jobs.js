/* ───────────────────────── Jobs ─────────────────────────
   A town's people are a workforce, not a number. Every growth cycle the town divides its people
   among trades by what it has to work with and what it is short of. The counts drive the extra
   mechanics (haulers, smiths, traders, soldiers, idle hands) and set how many of each trade are
   out on the map; the walkers you see are a sample of the trade, not the whole of it. */
const JOB_LIST = ['young', 'soldier', 'militia', 'constable', 'healer', 'farmer', 'fisher', 'hunter', 'forager', 'carrier', 'logger', 'quarrier', 'miner', 'builder', 'mason', 'baker', 'smoker', 'cook', 'brewer', 'smith', 'hauler', 'trader', 'drunk', 'household', 'idle'];
const JOB_LABEL = { young: 'young and old', soldier: 'soldiers', militia: 'militia', constable: 'constables', healer: 'healers', farmer: 'farmers', fisher: 'fishers', hunter: 'hunters', forager: 'foragers', carrier: 'water carriers', logger: 'loggers', quarrier: 'quarriers', miner: 'miners', builder: 'builders', mason: 'masons', baker: 'bakers', smoker: 'smokers', cook: 'cooks', brewer: 'brewers', smith: 'smiths', hauler: 'haulers', trader: 'traders', drunk: 'at the inn', household: 'keeping house', idle: 'idle hands' };
// The resource each trade answers a shortage of, so the short trades fill first.
const JOB_FOR_SHORT = { wood: 'logger', stone: 'quarrier', food: 'farmer', water: 'carrier', iron: 'miner', copper: 'miner', coal: 'miner', uranium: 'miner', gold: 'miner' };
const CRAFT_JOBS = { [T.BAKERY]: 'baker', [T.SMOKEHOUSE]: 'smoker', [T.INN]: 'cook', [T.BREWERY]: 'brewer', [T.FORGE]: 'smith' };
const CRAFT_SLOTS = { [T.BAKERY]: 3, [T.SMOKEHOUSE]: 2, [T.INN]: 2, [T.BREWERY]: 3, [T.FORGE]: 2 };
const PRODUCTION = [T.QUARRY, T.MINE, T.LUMBERYARD, T.FISHERY, T.BAKERY, T.SMOKEHOUSE, T.BREWERY, T.FORGE, T.MILL];

function jobCount(t, k) { return t.jobs && t.jobs[k] ? t.jobs[k] : 0; }
function workingPop(t) { return Math.max(0, t.popLeft - jobCount(t, 'young')); }
function idleShare(t) { const w = workingPop(t); return w > 0 ? jobCount(t, 'idle') / w : 0; }

function allocateJobs(t) {
  const jobs = {}; for (const k of JOB_LIST) jobs[k] = 0;
  let pool = Math.max(0, t.popLeft);
  const take = (k, n) => { n = Math.max(0, Math.min(pool, Math.round(n))); jobs[k] += n; pool -= n; return n; };
  const tp = t.temper || { wood: 1, stone: 1, food: 1, build: 1, trade: 1 };
  const type = world.type;
  // Children and the old do not work. A town with a hospital keeps its old people longer.
  take('young', pool * (hasType(t, T.HOSPITAL) ? 0.34 : 0.28));
  // Fixed posts.
  t.soldiers = Math.min(t.soldiers || 0, pool);
  take('soldier', t.soldiers);
  take('militia', Math.min(t.militia || 0, pool));
  if (t.case && t.case.hunt) take('constable', 1 + countType(t, T.GAOL));
  take('healer', countType(t, T.HEALER) + 2 * countType(t, T.HOSPITAL));
  take('drunk', pool * drunkShare(t)); // some are at the inn instead of at their work
  // Food before anything.
  const farms = countType(t, T.FARM);
  take('farmer', Math.ceil(farms / 2) * tp.food);
  const short = shortages(t);
  const sea = season();
  const herdsNear = (world.herds || []).some(h => h.size > 0 && Math.hypot(h.x - t.cx, h.y - t.cy) <= t.R + 18);
  const mines = t.buildings.filter(i => type[i] === T.MINE && !t.spent[i]).length;
  const sites = Object.keys(t.sites || {}).filter(k => type[+k] === T.SITE);
  const stoneSites = sites.filter(k => t.sites[k].mat).length;
  const want = {
    fisher: countType(t, T.FISHERY) * 3 + 2 * (world.boats || []).filter(b => b.town === t.id && !b.fire).length,
    hunter: herdsNear && t.popLeft >= 15 ? 1 + Math.floor(t.popLeft / 120) + (short.has('food') ? 1 : 0) + (has(t, 'beastlord') ? 1 : 0) : 0,
    forager: hasType(t, T.HEALER) && (sea === 0 || sea === 1) ? 1 + countType(t, T.HOSPITAL) + (has(t, 'physician') ? 1 : 0) : 0,
    carrier: waterCellNear(t) >= 0 ? 1 + Math.floor(t.popLeft / 60) + (short.has('water') ? 1 : 0) : 0,
    logger: (countType(t, T.LUMBERYARD) ? 3 * countType(t, T.LUMBERYARD) : 2) * tp.wood + (short.has('wood') ? 2 : 0),
    quarrier: countType(t, T.QUARRY) * (short.has('stone') ? 3 : 2) * tp.stone,
    miner: mines * 3,
    builder: sites.length ? Math.min(6, sites.length + (has(t, 'builder') ? 2 : 0)) * tp.build : 0,
    mason: knowsMasonry(t) ? 2 * stoneSites : 0,
  };
  for (const ty in CRAFT_JOBS) want[CRAFT_JOBS[ty]] = countType(t, +ty) * CRAFT_SLOTS[ty];
  // The trades that answer a shortage fill first, then the rest in order.
  const order = Object.keys(want).sort((a, b) => (Object.values(JOB_FOR_SHORT).includes(b) && [...short].some(s => JOB_FOR_SHORT[s] === b) ? 1 : 0) - (Object.values(JOB_FOR_SHORT).includes(a) && [...short].some(s => JOB_FOR_SHORT[s] === a) ? 1 : 0));
  for (const k of order) take(k, want[k]);
  // Haulers carry the goods in from the works; traders drive the wagons and work the market.
  const prod = t.buildings.filter(i => PRODUCTION.includes(type[i])).length;
  take('hauler', Math.ceil(Math.max(0, prod - 1) / 2) * tp.trade);
  let roads = 0; for (const k in (world.tradeRoads || {})) { const r = world.tradeRoads[k]; if (!r.building && (r.a === t.id || r.b === t.id)) roads++; }
  take('trader', roads + (hasType(t, T.TOWNHALL) ? 1 : 0));
  // Spare hands go to the fields, the woods, the sites, the shore and the quarry: a town does not leave people standing about.
  // Land, timber and rock are the limit, not people.
  const spare = pool;
  if (spare > 0) {
    take('farmer', farms ? spare * 0.35 : 0);
    take('logger', spare * 0.15);
    take('builder', sites.length ? spare * 0.15 : 0);
    take('fisher', countType(t, T.FISHERY) ? spare * 0.1 : 0);
    take('quarrier', countType(t, T.QUARRY) ? spare * 0.1 : 0);
    take('hunter', herdsNear ? spare * 0.05 : 0);
    take('miner', mines ? spare * 0.05 : 0);
  }
  // Most of whoever is left keeps the homes, the gardens and the animals; the rest are idle hands.
  take('household', pool * 0.7);
  jobs.idle = pool;
  t.jobs = jobs;
  // Idle hands: a word in the log now and then, and unrest (in updateUnrest).
  if (jobs.idle >= 15 && idleShare(t) > 0.3 && (!t.idleLogged || world.tick - t.idleLogged > 1500) && Math.random() < 0.3) { t.idleLogged = world.tick; say(t, 'idleHands', { n: jobs.idle }, 'loss'); }
}

// Soldiers: full-time, barracks-housed, trained a few at a time once the town knows steel. They are the first
// into a fight and worth two of the levy.
function updateSoldiers(t) {
  const slots = (t.mil || 0) >= 1 ? 12 * countType(t, T.BARRACKS) : 0;
  const target = Math.min(slots, Math.floor(workingPop(t) * 0.25));
  t.soldiers = t.soldiers || 0;
  if (t.soldiers < target) { t.soldiers++; if (t.soldiers === 1) { log(`${t.name} keeps its first full-time soldiers at the barracks`, 'war'); if (!person(t, 'captain') && !person(t, 'soldier')) { const p = elect(t, 'soldier', true); if (p) p.story = `drills the ${t.name} soldiers at dawn and again at dusk`; } } }
  else if (t.soldiers > target) t.soldiers = target;
}
function soldierPower(t) { return 1 + 0.08 * Math.min(12, t.soldiers || 0); }

// Logistics: haulers bring the loads in faster, up to a quarter more; a staffed forge with iron to spare puts
// better tools in everyone's hands.
function logistics(t) { const prod = t.buildings.filter(i => PRODUCTION.includes(world.type[i])).length; const wanted = Math.ceil(Math.max(0, prod - 1) / 2); return wanted <= 0 ? 1 : 1 + 0.25 * Math.min(1, jobCount(t, 'hauler') / wanted); }
function tools(t) { return jobCount(t, 'smith') >= 1 && (t.res.iron || 0) >= 2 ? 1.2 : 1; }
function yieldMul(t, job) { return logistics(t) * (job === 'log' || job === 'quarry' || job === 'mine' || job === 'harvest' ? tools(t) : 1) * (jobCount(t, 'drunk') > 0 ? 0.95 : 1); } // a town with drinkers gets a little less done
function wearTools(t) { if (tools(t) > 1 && world.tick % 200 < 16 && t.res.iron > 0) { t.res.iron--; t.toolsWorn = (t.toolsWorn || 0) + 1; } }

// ── Walkers for the new trades ──
// Haulers shuttle between the works and the store with a load on their back.
function updateHauler(town, w) {
  const n = world.n;
  if (jobCount(town, 'hauler') < 1) return false;
  if (w.phase === 'out') {
    if (w.target < 0 || !PRODUCTION.includes(world.type[w.target])) {
      const works = town.buildings.filter(i => PRODUCTION.includes(world.type[i]) && world.burnLeft[i] <= 0);
      if (!works.length) return false;
      w.target = works[Math.floor(Math.random() * works.length)]; w.stuck = 0; w.stall = 0; w.lastCell = -1;
    }
    const tx = w.target % n, ty = (w.target - tx) / n;
    if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) { w.phase = 'back'; w.carry = 1; w.kind = 'goods'; w.linger = 0; }
    else { stepToward(w, tx, ty, 1, false); if (w.stall > 4 || ++w.stuck > 80) { w.target = -1; w.stuck = 0; w.stall = 0; w.lastCell = -1; return Math.random() < 0.7; } }
    return true;
  }
  const hx = w.home % n, hy = (w.home - hx) / n;
  if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) { w.phase = 'out'; w.carry = 0; w.target = -1; w.trips = (w.trips || 0) + 1; return w.trips < 6; }
  stepToward(w, hx, hy, 1, false);
  if (w.stall > 4 || ++w.stuck > 80) { w.stuck = 0; w.stall = 0; w.lastCell = -1; return Math.random() < 0.7; }
  return true;
}
// Farmers tend the fields between harvests: out to a field, a while hoeing, on to the next.
function updateTender(town, w) {
  const n = world.n;
  if (jobCount(town, 'farmer') < 1 || season() === 3) return false;
  if (w.target < 0 || world.type[w.target] !== T.FARM) {
    const farms = town.buildings.filter(i => world.type[i] === T.FARM && world.crop[i] < 100 && world.burnLeft[i] <= 0);
    if (!farms.length) return false;
    w.target = farms[Math.floor(Math.random() * farms.length)]; w.work = 0; w.stuck = 0; w.stall = 0; w.lastCell = -1;
  }
  const tx = w.target % n, ty = (w.target - tx) / n;
  if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) {
    if (++w.work % 7 === 0) dust(w.target);
    if (w.work >= 24) { w.target = -1; w.fields = (w.fields || 0) + 1; return w.fields < 3; }
    return true;
  }
  stepToward(w, tx, ty, 1, false);
  if (w.stall > 4 || ++w.stuck > 80) { w.target = -1; w.stuck = 0; w.stall = 0; w.lastCell = -1; return Math.random() < 0.5; }
  return true;
}
// Crafters walk to their workshop, work a shift at the door, and go home.
function updateCrafter(town, w) {
  const n = world.n;
  if (w.site < 0 || world.type[w.site] !== w.siteType || jobCount(town, w.craft) < 1) return false;
  if (w.phase === 'out') {
    const tx = w.site % n, ty = (w.site - tx) / n;
    if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1) { w.phase = 'work'; w.work = 0; }
    else { stepToward(w, tx, ty, 1, false); if (w.stall > 4 || ++w.stuck > 80) return false; }
    return true;
  }
  if (w.phase === 'work') { if (++w.work >= 40) w.phase = 'back'; return true; }
  const hx = w.home % n, hy = (w.home - hx) / n;
  if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) return false;
  stepToward(w, hx, hy, 1, false);
  return !(w.stall > 4 || ++w.stuck > 80);
}
// The first person to work a new kind of workshop gets a name.
const WORKSHOP_ROLE = { [T.BAKERY]: 'baker', [T.SMOKEHOUSE]: 'smoker', [T.INN]: 'cook', [T.BREWERY]: 'brewer', [T.FORGE]: 'smith', [T.FISHERY]: 'fisher', [T.MILL]: 'miller' };
const WORKSHOP_STORY = { baker: 'is up before anyone to light the ovens', smoker: 'smells of woodsmoke and does not mind', cook: 'can make a stew out of anything that stands still', brewer: 'tastes every batch twice, for safety', smith: 'has burned the same thumb three times', fisher: 'knows where the fish are and will not say', miller: 'is grey to the eyebrows with flour', mason: 'can tell good stone by the ring of it' };
function nameWorkshop(town, type) {
  const role = WORKSHOP_ROLE[type]; if (!role || !town.people || person(town, role)) return;
  const p = elect(town, role, true); if (!p) return;
  p.story = WORKSHOP_STORY[role] || p.story; deed(p, `opened ${town.name}'s first ${(BUILDING_NAMES[type] || 'workshop').toLowerCase()}`);
  if (Math.random() < 0.6) log(`${p.name} ${WORKSHOP_STORY[role]} and runs ${town.name}'s new ${(BUILDING_NAMES[type] || 'workshop').toLowerCase()}`, 'build');
}
