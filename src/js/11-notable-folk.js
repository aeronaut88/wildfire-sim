/* ───────────────────────── Notable folk ─────────────────────────
   Every town has a handful of named people: an elder, a fire chief, a hunter, and that one
   person. They age, they do things the log remembers, and sometimes they die of what kills
   everyone else. When one goes, the town finds another. */
const FIRST_NAMES = ['Agnes', 'Mattias', 'Rook', 'Ida', 'Tobias', 'Wren', 'Hollis', 'Marta', 'Ezra', 'Pim', 'Sunniva', 'Cormac', 'Dagny', 'Lucan', 'Bea', 'Otto', 'Freya', 'Silas', 'Nell', 'Ansel', 'Greta', 'Jory', 'Thea', 'Ambrose', 'Petra', 'Roan', 'Elspeth', 'Hugo', 'Maren', 'Caspar', 'Liv', 'Barnaby', 'Signe', 'Teodor', 'Hazel', 'Emrys', 'Rosalind', 'Finn', 'Ingrid', 'Oskar', 'Winnie', 'Lorcan', 'Astrid', 'Benedikt', 'Tamsin', 'Soren', 'Clem', 'Juniper', 'Rufus', 'Odile'];
const LAST_NAMES = ['Thorne', 'Ashby', 'Fairweather', 'Coalbrook', 'Hollins', 'Marsh', 'Quill', 'Stannard', 'Greaves', 'Pike', 'Wexley', 'Oakes', 'Brandt', 'Fenwick', 'Larkspur', 'Dunmore', 'Haskell', 'Birchwood', 'Kettle', 'Ravel', 'Tolliver', 'Moss', 'Sedge', 'Hartigan', 'Bramble', 'Underhill', 'Crane', 'Fallow', 'Wick', 'Northey', 'Tully', 'Varga', 'Ellery', 'Blackwood', 'Hale', 'Pennyworth', 'Rourke', 'Stirling', 'Ashgrove', 'Lindqvist'];
const BACKSTORIES = ['came over the pass with the first wagons', 'was born in a hard winter and has never minded the cold', 'once walked to the far side of the valley and back in a day', 'keeps bees and talks to them', 'has never trusted the river', 'lost a childhood home to fire and still smells smoke in dreams', 'can name every tree within a mile', 'swears a dragon once looked them in the eye', 'won the pie contest nine years running', 'reads the weather in the way the pines move', 'was found as a baby on the north road', 'has buried two spouses and outlived them both cheerfully', 'carves animals out of birch and gives them away', 'taught half the town to swim', 'owes money in every town in the valley', 'claims to have seen the lights under the lake', 'fought in a war nobody else remembers', 'sings when the fire bell rings', 'has a scar from a boar and a story to match', 'planted the oak outside the hall', 'never sleeps on the night of the first snow', 'grew up in a wagon and still cannot sit still', 'keeps the only clock in town', 'has argued with the elder for thirty years', 'knows where the old mine shaft goes and will not say', 'brews something in the cellar that the chief pretends not to know about', 'walked away from a town that burned and never speaks its name', 'counts the geese every autumn and writes it down', 'was struck by lightning once and says it improved them', 'sleeps with a bucket of water by the bed'];
const ROLE_LABEL = { elder: 'elder', chief: 'fire chief', hunter: 'hunter', firebug: 'townsfolk', slayer: 'dragonslayer', geologist: 'geologist', constable: 'constable', thief: 'townsfolk', convict: 'convict', soldier: 'soldier', townsfolk: 'townsfolk', captain: 'militia captain', spy: 'townsfolk', healer: 'healer' };
/* Leaders. Every elder has a trait, and the trait steers the town's choices, right or wrong:
   who it fights, what it builds, what it hoards, what draws the dragons. The people have a say
   too: famine, war, thirst and tyranny raise unrest, and an elder who lets it climb is thrown out. */
const TRAITS = {
  warmonger:  { label: 'warmonger',      blurb: 'itches for a fight and calls it strength', good: 0.3, evil: 2.5, chaos: 1.5 },
  peacemaker: { label: 'peacemaker',     blurb: 'would rather talk than march', good: 2.5, evil: 0.3, chaos: 0.8 },
  builder:    { label: 'builder',        blurb: 'measures a life in walls raised', good: 1.5, evil: 1, chaos: 0.8 },
  miser:      { label: 'fiscal conservative', blurb: 'counts every coin twice and spends none', good: 1, evil: 1.5, chaos: 0.5 },
  hoarder:    { label: 'hoarder',        blurb: 'keeps the gold where it can be seen, and the dragons see it', good: 0.5, evil: 2, chaos: 1 },
  merchant:   { label: 'merchant',       blurb: 'never met a caravan without a deal in it', good: 1.2, evil: 1.2, chaos: 1 },
  scholar:    { label: 'scholar',        blurb: 'would sooner read than eat', good: 1.5, evil: 0.8, chaos: 0.8 },
  hermit:     { label: 'hermit',         blurb: 'wants nothing from the neighbours and gives less', good: 0.8, evil: 1, chaos: 1.3 },
  tyrant:     { label: 'tyrant',         blurb: 'rules by fear and takes a cut of everything', good: 0.1, evil: 3, chaos: 1 },
  madman:     { label: 'madman',         blurb: 'hears the river and does what it says', good: 0.4, evil: 1, chaos: 3 },
  greenthumb: { label: 'green thumb',    blurb: 'can make wheat grow on a rock', good: 1.5, evil: 0.8, chaos: 1 },
  firewatch:  { label: 'fire warden',    blurb: 'sleeps with one eye on the ridge', good: 1.5, evil: 0.8, chaos: 0.8 },
  beastlord:  { label: 'beastmaster',    blurb: 'likes animals better than people', good: 1, evil: 1, chaos: 1.3 },
  prophet:    { label: 'prophet',        blurb: 'has seen the fire to come and builds towers against it', good: 1.3, evil: 0.8, chaos: 1.5 },
  drunkard:   { label: 'drunkard',       blurb: 'is beloved, unreliable and occasionally on fire', good: 1, evil: 0.8, chaos: 2 },
  physician:  { label: 'physician',      blurb: 'has a cure for everything and a theory for the rest', good: 1.5, evil: 0.8, chaos: 1 },
};
function rollTrait(town, avoid) {
  const keys = Object.keys(TRAITS).filter(k => k !== avoid);
  const w = keys.map(k => { const tr = TRAITS[k]; return town.align.moral > 0 ? tr.good : town.align.moral < 0 ? tr.evil : 1 * (town.align.order < 0 ? tr.chaos : 1); });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let k = 0; k < keys.length; k++) { r -= w[k]; if (r <= 0) return keys[k]; }
  return keys[keys.length - 1];
}
function leader(town) { return person(town, 'elder'); }
function trait(town) { const l = leader(town); return l ? l.trait : null; }
function has(town, tr) { return trait(town) === tr; }
function traitLabel(p) { return p && p.trait ? TRAITS[p.trait].label : ''; }
function makePerson(rng, role, ageYears) {
  rng = rng || Math.random;
  return { name: FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)] + ' ' + LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)], role, born: world.tick - Math.round(ageYears * YEAR), alive: true, deeds: [], story: BACKSTORIES[Math.floor(rng() * BACKSTORIES.length)], fires: 0, revealed: false };
}
function seedPeople(town, rng) {
  rng = rng || Math.random;
  town.people = [makePerson(rng, 'elder', 45 + rng() * 25), makePerson(rng, 'chief', 28 + rng() * 25), makePerson(rng, 'hunter', 18 + rng() * 30), makePerson(rng, 'firebug', 16 + rng() * 40)];
  town.people[0].trait = rollTrait(town); town.unrest = 10;
}
function person(town, role) { return town.people ? town.people.find(p => p.alive && p.role === role) : null; }
function personAge(p) { return Math.max(0, Math.floor((world.tick - p.born) / YEAR)); }
function roleLabel(p) { return (p.role === 'firebug' || p.role === 'thief' || p.role === 'spy') && !p.revealed ? 'townsfolk' : p.role === 'firebug' ? 'firebug' : p.role === 'thief' ? 'thief' : p.role === 'spy' ? 'spy' : ROLE_LABEL[p.role] || p.role; }
function deed(p, text) { if (!p) return; p.deeds.push({ tick: world.tick, text }); if (p.deeds.length > 6) p.deeds.shift(); }
function elect(town, role, quiet, avoidTrait) {
  if (role === 'firebug') { const g = grudgeHolders(town).find(q => q.role === 'townsfolk' || q.role === 'thief'); if (g && Math.random() < 0.6) { g.role = 'firebug'; g.revealed = false; g.arsons = 0; g.story = `never forgave ${g.grudge.why}`; return g; } }
  const prev = (town.people || []).filter(q => q.role === role).slice(-1)[0];
  const p = makePersonIn(town, role, 20 + Math.random() * 35, prev && role !== 'firebug' && Math.random() < 0.35 ? prev : null);
  if (role === 'elder') p.trait = rollTrait(town, avoidTrait);
  town.people.push(p); if (town.people.length > 14) town.people = town.people.filter(q => q.alive).slice(-10).concat(town.people.filter(q => !q.alive).slice(-4));
  if (!quiet) log(role === 'elder' ? `${town.name} chooses ${p.name} as elder, ${/^[aeiou]/.test(TRAITS[p.trait].label) ? 'an' : 'a'} ${TRAITS[p.trait].label} who ${TRAITS[p.trait].blurb}` : role === 'chief' ? `${p.name} takes over as ${town.name}'s fire chief` : `${p.name} becomes ${town.name}'s ${ROLE_LABEL[role]}`, 'build');
  return p;
}
// Unrest: hunger, thirst, war and tyranny push it up; peace, bread and a loved elder bring it down.
function updateUnrest(town) {
  const l = leader(town); if (!l) { town.people = town.people || []; elect(town, 'elder', true); return; }
  if (!l.trait) l.trait = rollTrait(town);
  let d = -1.5;
  if (town.famine) d += 1.5; if (!town.fed) d += 0.5; if (!town.water) d += 1;
  if (world.towns.some(o => o !== town && atWar(town, o))) d += 0.5;
  const deaths = town.deaths - (town.lastDeathsSeen || 0); town.lastDeathsSeen = town.deaths; d += Math.min(2, deaths / 10);
  const tr = l.trait;
  if (tr === 'tyrant') d += 0.7; if (tr === 'madman') d += 0.5; if (tr === 'miser' && town.res.coin > 150 && !town.fed) d += 0.6;
  d += Math.min(1.2, 0.4 * grudgeHolders(town).length); // families that remember a wrong
  if (tr === 'peacemaker' || tr === 'prophet' || tr === 'drunkard') d -= 0.5; if (tr === 'builder' || tr === 'greenthumb') d -= 0.3;
  if (town.align.order > 0) d -= 0.3;
  town.unrest = Math.max(0, Math.min(100, (town.unrest || 10) + d));
  if (town.unrest >= 80 && Math.random() < 0.02) overthrow(town, l);
}
function overthrow(town, l) {
  const tr = TRAITS[l.trait] ? TRAITS[l.trait].label : 'elder';
  const hanged = (l.trait === 'tyrant' || l.trait === 'warmonger') && Math.random() < 0.5;
  l.alive = false; l.died = world.tick; l.cause = hanged ? 'hanged by the mob' : 'thrown out by the mob';
  stat('ev', 'overthrows'); town.overthrows = (town.overthrows || 0) + 1;
  log(`REVOLT in ${town.name}: the people rise against ${l.name} the ${tr} and ${hanged ? 'hang them from the hall' : 'run them out of town'}`, 'war'); remember(town, 'revolt', { who: l.name });
  for (const q of town.people) if (q.alive && q.grudge && q.grudge.against === 'the law') { q.grudge = null; deed(q, 'was in the crowd at the hall the day the elder fell, and called it settled'); }
  const [px, py] = cellCenter(town.cy * world.n + town.cx); popups.push({ x: px, y: py - town.R * cellPx - 14, text: 'REVOLT', color: '#ff6ad5', t0: performance.now(), dur: 2600 });
  town.militia = Math.floor(town.militia * 0.75); town.unrest = 30;
  if (Math.random() < 0.35) { const homes = town.buildings.filter(i => isHome(world.type[i]) && world.burnLeft[i] <= 0); if (homes.length) { ignite(homes[Math.floor(Math.random() * homes.length)]); log(`Riots in ${town.name}; a house burns`, 'arson'); } }
  const next = elect(town, 'elder', false, l.trait);
  deed(next, `came to power in the revolt against ${l.name}`);
}
// The madman, the drunkard and the prophet act on their own. Once in a while.
function leaderActs(town) {
  const l = leader(town); if (!l || Math.random() > 0.004) return;
  const tr = l.trait;
  if (tr === 'madman') {
    const r = Math.random();
    if (r < 0.3 && town.res.grain > 10) { town.res.grain = Math.floor(town.res.grain / 2); log(`${l.name} of ${town.name} declares a feast and empties half the granary`, 'arson'); }
    else if (r < 0.55) { const fields = town.buildings.filter(i => world.type[i] === T.FARM && world.burnLeft[i] <= 0); if (fields.length) { ignite(fields[Math.floor(Math.random() * fields.length)]); log(`${l.name} of ${town.name} sets a field alight to see what the smoke says`, 'arson'); } }
    else if (r < 0.75) { const others = world.towns.filter(o => o !== town && isAlive(o) && !atWar(town, o)); if (others.length) declareWar(town, others[Math.floor(Math.random() * others.length)], 'over an insult nobody else heard'); }
    else if (town.livestock) { let freed = 0; for (const k of LIVESTOCK) { freed += town.livestock[k] || 0; town.livestock[k] = 0; } if (freed) log(`${l.name} of ${town.name} opens the pastures and sets ${freed} animals free`, 'arson'); }
  } else if (tr === 'drunkard' && Math.random() < 0.5) {
    const homes = town.buildings.filter(i => isHome(world.type[i]) && world.burnLeft[i] <= 0); if (homes.length) { ignite(homes[Math.floor(Math.random() * homes.length)]); log(`${l.name} of ${town.name} falls asleep with the lamp lit`, 'alarm'); }
  } else if (tr === 'prophet' && !hasType(town, T.TOWER) && town.popLeft >= 20 && canAfford(town, COST[T.TOWER])) {
    const i = placeCivic(town, T.TOWER, false); if (i >= 0) { pay(town, COST[T.TOWER]); log(`${l.name} of ${town.name} orders a watchtower raised against the fire to come`, 'build'); }
  } else if (tr === 'tyrant' && town.res.coin >= 20) { const cut = Math.floor(town.res.coin * 0.1); town.res.coin -= cut; l.hoard = (l.hoard || 0) + cut; if (Math.random() < 0.3) log(`${l.name} of ${town.name} takes ${cut} coin from the chest for the palace`, 'loss'); }
}
const DEATH_VERB = { hanged: 'is hanged', banished: 'is banished', fire: 'dies in the fire', 'dragon fire': 'is taken by the dragon', 'torched in a raid': 'dies when the raiders torch the town', famine: 'starves', battle: 'falls in battle', 'put to the sword': 'is put to the sword', plague: 'dies of the plague', thirst: 'dies of thirst', fallout: 'wastes away from the fallout', blast: 'is killed in the blast', dragon: 'is killed by the dragon', 'fire crews lost': 'is lost with the fire crews' };
function killNotable(town, cause) {
  const living = (town.people || []).filter(p => p.alive); if (!living.length) return;
  const p = living[Math.floor(Math.random() * living.length)];
  p.alive = false; p.died = world.tick; p.cause = cause; stat('ev', 'notableDeaths');
  log(`${p.name}, ${roleLabel(p)} of ${town.name}, ${DEATH_VERB[cause] || 'dies'} at ${personAge(p)}`, 'loss');
  funeral(town, p, false);
  if (p.role === 'elder' || p.role === 'chief' || p.role === 'hunter') elect(town, p.role);
  else if (p.role === 'firebug') elect(town, 'firebug', true);
}
function agePeople(town) {
  if (world.tick % 600 !== 0 || !town.people) return;
  for (const p of town.people) if (p.alive && personAge(p) > 72 && Math.random() < (0.08 + (personAge(p) - 72) * 0.02) * (hasType(town, T.HEALER) ? 0.6 : 1)) {
    p.alive = false; p.died = world.tick; p.cause = 'old age'; stat('ev', 'notableDeaths');
    log(`${p.name}, ${roleLabel(p)} of ${town.name}, dies of old age at ${personAge(p)}. ${p.story[0].toUpperCase() + p.story.slice(1)}.`, 'loss');
    funeral(town, p, false);
    if (p.role === 'elder' || p.role === 'chief' || p.role === 'hunter') elect(town, p.role); else if (p.role === 'firebug') elect(town, 'firebug', true);
  }
}
function oldestResident() {
  let best = null;
  for (const t of world.towns) if (isAlive(t)) for (const p of t.people || []) if (p.alive && (!best || p.born < best.p.born)) best = { p, town: t };
  return best;
}

function nextTownName(rng) {
  rng = rng || Math.random;
  const used = new Set(world.towns.map(t => t.name));
  for (let k = 0; k < 40; k++) { const nm = makeTownName(rng); if (!used.has(nm)) return nm; }
  return 'New ' + world.towns[Math.floor(Math.random() * world.towns.length)].name;
}

// Find a spot for a town of radius R. Loose enough that towns land on peninsulas and river islands now and then.
function findTownSite(R, rng) {
  const n = world.n, type = world.type;
  for (let tries = 0; tries < 300; tries++) {
    const x = R + 3 + Math.floor(rng() * (n - 2 * R - 6));
    const y = R + 3 + Math.floor(rng() * (n - 2 * R - 6));
    let ok = true;
    for (const o of world.towns) if (Math.hypot(o.cx - x, o.cy - y) < o.R + R + 10) { ok = false; break; }
    if (!ok || !passable(type[y * n + x])) continue;
    if (world.air && Math.hypot(world.air.x - x, world.air.y - y) < R + 5) continue;
    let good = 0, total = 0, burning = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      total++;
      const i = (y + dy) * n + x + dx;
      const tt = type[i];
      if (tt !== T.WATER && tt !== T.ROCK) good++;
      if (world.burnLeft[i] > 0 || tt === T.ASH || world.fallout[i] > 20) burning++;
    }
    if (good >= total * 0.72 && burning === 0) return [x, y];
  }
  return null;
}

function foundTown(cx, cy, R, opts) {
  const n = world.n, type = world.type, rng = opts.rng || Math.random;
  const town = {
    id: world.towns.length, name: opts.name || nextTownName(rng), cx, cy, R,
    buildings: [], housesTotal: 0, housesLeft: 0, popTotal: 0, popLeft: 0,
    hasStation: false, stationIdx: -1, trucks: [],
    mobilized: false, rallyAt: 0, lastThreat: -1000, fireDir: 0, fireDist: Infinity, nearestFire: -1,
    crews: [], crewsToSpawn: 0, ring: [], claimed: new Set(),
    firstHit: false, destroyed: false, lostLogged: 0,
    R0: R, growTimer: 10 + Math.floor(rng() * 10), nextTruckId: 1, built: 0,
    deaths: 0, homesLost: 0, fires: 0, founded: world.tick,
    align: rollAlignment(rng), militia: 0, relations: {}, wars: {}, raidCooldown: 0, wallR: 0, raidsMade: 0, raidsSuffered: 0,
    shape: [0.25 + rng() * 0.3, rng() * 6.283, 0.15 + rng() * 0.25, rng() * 6.283, rng() * 0.15, rng() * 6.283],
    mil: 0, civ: 0, research: 0, nukes: 0, shellCooldown: 0, nukeCooldown: 0, sick: 0,
    res: { wood: 24, stone: 10, iron: 0, copper: 0, coal: 0, uranium: 0, gold: 0, oil: 0, grain: 12, fish: 0, game: 0, water: 30, coin: 20 }, gathered: { wood: 0, stone: 0, iron: 0, copper: 0, coal: 0, uranium: 0, gold: 0, oil: 0, grain: 0, fish: 0, game: 0, water: 0, coin: 0 },
    wells: {}, sites: {}, fed: true, hunger: 0,
    temper: { wood: 0.7 + rng() * 0.6, stone: 0.7 + rng() * 0.6, food: 0.7 + rng() * 0.6, build: 0.7 + rng() * 0.6, trade: 0.7 + rng() * 0.6 }, // no two towns weigh things alike
    power: 0, powerNeed: 0, powerRatio: 1, water: true, master: -1, mineKind: {}, spent: {}, deepSite: {}, livestock: { cattle: 0, pigs: 0, sheep: 0, chickens: 0 },
  };
  seedPeople(town, rng);
  const stationWanted = rng() < opts.stationChance;
  let stationPlaced = false;
  town.layout = pickLayout(R, rng);
  // Clear most trees inside the town footprint, then lay the roads.
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (!inFootprint(town, cx + dx, cy + dy, 0.3)) continue;
    const i = (cy + dy) * n + cx + dx, tt = type[i];
    if (isTree(tt) && rng() < 0.88) { type[i] = T.GRASS; if (opts.live) world.treeCount--; dirty.add(i); }
  }
  layRoads(town, opts.live);

  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dy);
    const x = cx + dx, y = cy + dy;
    if (!inFootprint(town, x, y, 0.3)) continue;
    const i = y * n + x;
    const tt = type[i];
    if (tt === T.WATER || tt === T.ROCK || tt === T.PAD || tt === T.HANGAR || world.road[i]) continue;
    // Station: first free cell touching a road, close to the centre.
    if (stationWanted && !stationPlaced && d <= 2.5 && touchesRoad(x, y)) {
      type[i] = T.STATION; stationPlaced = true;
      town.hasStation = true; town.stationIdx = i;
      town.buildings.push(i); world.townOf[i] = town.id;
      dirty.add(i);
      continue;
    }
    const nearRoad = touchesRoad(x, y);
    const houseP = (nearRoad ? 0.9 : 0.45) * opts.houseScale * (1 - (d / R) * 0.5);
    if (rng() < houseP) {
      if (isTree(type[i]) && opts.live) world.treeCount--;
      type[i] = T.HOUSE;
      world.variant[i] = rng() < 0.6 ? 0 : 1;
      world.townOf[i] = town.id;
      town.buildings.push(i);
      town.housesTotal++;
      town.popTotal += 3 + Math.floor(rng() * 4);
      dirty.add(i);
    } else dirty.add(i);
  }
  if (town.housesTotal < 3) {
    for (const i of town.buildings) { type[i] = T.GRASS; world.townOf[i] = -1; dirty.add(i); }
    return null;
  }
  town.housesLeft = town.housesTotal;
  town.popLeft = town.popTotal;
  if (town.hasStation) {
    const nTrucks = 1 + Math.floor(rng() * 2) + (rng() < 0.3 ? 1 : 0);
    const sx = town.stationIdx % n, sy = Math.floor(town.stationIdx / n);
    for (let k = 0; k < nTrucks; k++) {
      town.trucks.push({ id: k + 1, x: sx, y: sy, px: sx, py: sy, water: 20, cap: 20, state: 'idle', refill: 0, alive: true, face: 1 });
    }
  }
  town.nextTruckId = town.trucks.length + 1;
  recomputeRing(town);
  world.towns.push(town);
  world.buildingsTotal += town.buildings.length;
  world.popTotal += town.popTotal;
  if (opts.live) { world.buildingsLeft += town.buildings.length; world.popLeft += town.popTotal; }
  return town;
}

// Irregular footprint: the effective radius varies with direction, so towns are lumpy rather than round.
function radiusAt(town, dx, dy) {
  const sh = town.shape; if (!sh) return town.R;
  const a = Math.atan2(dy, dx);
  const f = 1 + sh[0] * Math.sin(2 * a + sh[1]) + sh[2] * Math.sin(3 * a + sh[3]) + sh[4] * Math.sin(5 * a + sh[5]);
  return town.R * Math.max(0.45, Math.min(1.15, f));
}
function inFootprint(town, x, y, pad) {
  const dx = x - town.cx, dy = y - town.cy;
  return Math.hypot(dx, dy) <= radiusAt(town, dx, dy) + (pad || 0.3);
}

function recomputeRing(town) {
  const n = world.n, R = town.R;
  town.ring = [];
  for (let dy = -R - 4; dy <= R + 4; dy++) for (let dx = -R - 4; dx <= R + 4; dx++) {
    const d = Math.hypot(dx, dy), ra = radiusAt(town, dx, dy);
    if (d < ra + 1.3 || d > ra + 3.2) continue;
    const x = town.cx + dx, y = town.cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    town.ring.push(y * n + x);
  }
}

function buildAirbase(town) {
  const n = world.n;
  const type = world.type;
  for (let tries = 0; tries < 200; tries++) {
    const a = Math.random() * Math.PI * 2, d = town.R + 3 + Math.random() * 5;
    const x = Math.round(town.cx + Math.cos(a) * d), y = Math.round(town.cy + Math.sin(a) * d);
    if (x < 2 || y < 2 || x >= n - 3 || y >= n - 3) continue;
    let ok = true;
    for (const t of world.towns) if (t !== town && Math.hypot(t.cx - x, t.cy - y) < t.R + 4) ok = false;
    if (!ok) continue;
    for (let dy = -1; dy <= 2 && ok; dy++) for (let dx = -1; dx <= 2; dx++) {
      const tt = type[(y + dy) * n + x + dx];
      if (tt === T.WATER || tt === T.ROCK || isBuilding(tt)) { ok = false; break; }
    }
    if (!ok) continue;
    for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) {
      const i = (y + dy) * n + x + dx;
      if (isTree(type[i])) { world.treeCount--; type[i] = T.GRASS; }
      if (dx >= 0 && dx < 2 && dy >= 0 && dy < 2) type[i] = T.PAD;
      dirty.add(i);
    }
    type[y * n + x] = T.HANGAR;
    world.air = { x: x + 1, y: y + 1, sorties: 1, max: 3, regen: 0, cooldown: 0, plane: null, owner: town.name };
    log(`${town.name} opens an airstrip. One tanker on contract.`, 'build');
    return true;
  }
  return false;
}

