/* ───────────────────────── Town response ───────────────────────── */

function onBuildingIgnite(i) {
  const town = world.towns[world.townOf[i]];
  if (!town) return;
  if (!town.firstHit) { town.firstHit = true; say(town, 'reaches', {}, 'loss'); }
  const res = occupants(town);
  if (res > 0 && isHome(world.type[i])) {
    const stone = world.mat[i] === 1; // a stone house burns slowly enough to get out of
    const survive = (world.dragonfire ? (stone ? 0.7 : 0.5) : world.raidfire ? (stone ? 0.85 : 0.7) : (town.mobilized ? 0.92 : stone ? 0.85 : 0.6)) + (town.align.moral > 0 ? 0.04 : 0);
    let lost = 0;
    for (let k = 0; k < res; k++) if (Math.random() > survive) lost++;
    lost = Math.min(lost, town.popLeft);
    if (lost > 0) {
      town.popLeft -= lost; world.popLeft -= lost; world.deaths += lost; town.deaths += lost;
      stat('deaths', world.dragonfire ? 'dragon fire' : world.raidfire ? 'torched in a raid' : 'fire', lost); stat('deathsTown', town.name, lost);
      if (town.people && Math.random() < 0.5 * lost / Math.max(1, town.popLeft + lost)) killNotable(town, world.dragonfire ? 'dragon fire' : world.raidfire ? 'torched in a raid' : 'fire');
      // The first dead of a fire are news; the rest are counted and said once, when the fire is out.
      if (!town.mobilized && world.tick - (town.fireDeadTick || -1e9) > 120) { town.fireDead = 0; town.fireDeadSaid = 0; } // a count nobody stood down from is stale
      town.fireDead = (town.fireDead || 0) + lost; town.fireDeadTick = world.tick;
      if (!town.fireDeadSaid) { town.fireDeadSaid = town.fireDead; say(town, 'trapped', { n: lost, cause: world.dragonfire ? 'dragon' : world.raidfire ? 'raid' : 'fire', stone }, 'loss'); }
    }
  }
}

function onBuildingDestroyed(i, cause) {
  const town = world.towns[world.townOf[i]];
  if (!town) return;
  forgetCounts(town);
  const t = world.type[i];
  if (cause === 'blast') {
    const res = Math.min(occupants(town), town.popLeft);
    if (res > 0) { town.popLeft -= res; world.popLeft -= res; world.deaths += res; town.deaths += res; town.blastDead = (town.blastDead || 0) + res; stat('deaths', 'blast', res); stat('deathsTown', town.name, res); }
    town.firstHit = true;
  }
  world.buildingsLeft--; world.buildingsLost++;
  stat('lost', cause === 'blast' ? 'blast' : world.dragonfire ? 'dragon fire' : world.raidfire ? 'torched in a raid' : 'fire'); stat('lostTown', town.name);
  if (t === T.NUCLEAR) meltdown(i, town);
  if (t === T.AIRBASE && town.fighters) { say(town, 'jetsBurn', { n: town.fighters }, 'loss'); stat('ev', 'fightersLost', town.fighters); town.fighters = 0; }
  if (t === T.AIRBASE && town.bombers) { say(town, 'bombersBurn', { n: town.bombers }, 'loss'); stat('ev', 'bombersLost', town.bombers); town.bombers = 0; }
  let animals = null;
  if (t === T.PASTURE && town.livestock) { const pastures = Math.max(1, countType(town, T.PASTURE)); const lost = []; for (const k of LIVESTOCK) { const n0 = town.livestock[k] || 0, d = Math.min(n0, Math.ceil(n0 / pastures)); if (d > 0) { town.livestock[k] -= d; lost.push(`${d} ${d === 1 ? { cattle: 'cow', pigs: 'pig', chickens: 'chicken' }[k] || k : k}`); stat('ev', 'animalsBurned', d); } } if (lost.length) animals = lost; }
  if (isHome(t)) { town.housesLeft--; town.homesLost++; noteHomeLoss(town); }
  else if (t !== T.STATION && BUILDING_NAMES[t]) buildingGone(town, BUILDING_NAMES[t].toLowerCase(), animals);
  if (t === T.STATION) {
    town.hasStation = false;
    for (const tr of town.trucks) if (tr.alive && (tr.state === 'idle' || tr.state === 'refill')) loseTruck(town, tr, 'lost with the station');
    say(town, 'stationLost', {}, 'loss');
  }
  if (town.housesLeft === 0 && !town.destroyed) {
    town.destroyed = true;
    say(town, 'townGone', { homes: town.homesLost }, 'loss');
    sendRefugees(town);
  }
}

// One building lost in a fire is news. The rest of what burned in the same fire is told once, when it is out.
function buildingGone(town, what, animals) {
  if (town.mobilized && town.fireBldSaid) { (town.fireBld = town.fireBld || []).push(animals ? `${what}:${animals.reduce((a, s) => a + parseInt(s, 10), 0)}` : what); return; }
  if (town.mobilized) town.fireBldSaid = 1;
  if (animals) say(town, 'pastureLost', { animals: listWords(animals) }, 'loss');
  else say(town, 'buildingLost', { what, meant: meantOf(what) }, 'loss');
}
function fireTallyList(town) {
  const counts = {}; let head = 0;
  for (const e of town.fireBld || []) { const [w, a] = e.split(':'); counts[w] = (counts[w] || 0) + 1; if (a) head += parseInt(a, 10) || 0; }
  const items = Object.keys(counts).map(w => counts[w] === 1 ? `the ${w}` : `${countWord(counts[w])} ${w === 'graveyard' ? 'plots of the graveyard' : w.endsWith('s') ? w : w.replace(/([^aeiou])y$/, '$1ie') + 's'}`);
  if (town.crewRun) items.push(phraseText('crewTally', { n: town.crewRun }).replace(/^and /, ''));
  if (head) items.push(`${head} head of stock from the pastures`);
  return items;
}
function occupants(town) {
  return Math.min(24, Math.ceil(town.popLeft / Math.max(1, town.housesLeft)));
}

// The building code. A town that loses a quarter of its homes in one fire (a lawful town, a sixth) and knows
// masonry decrees that every new wall is stone. London did the same in 1666, and banned thatch in 1212.
function noteHomeLoss(town) {
  if (world.tick - (town.lossTick || -1000) > 200) { town.lossRun = 0; town.lossTick = world.tick; }
  town.lossRun = (town.lossRun || 0) + 1;
  const homesBefore = town.housesLeft + town.lossRun, frac = town.align.order > 0 ? 0.15 : 0.25;
  if (town.lossRun >= Math.max(2, Math.ceil(homesBefore * frac))) {
    if (knowsMasonry(town)) adoptCode(town);
    else town.codeWish = world.tick; // they would, if they knew how
  }
}
function adoptCode(town) {
  if (town.code && town.code.stone) return;
  town.code = { stone: true, since: world.tick }; stat('ev', 'codes');
  const e = person(town, 'elder'); if (e) deed(e, 'decreed the stone code');
  say(town, 'stoneCode', { who: e ? e.name : null }, 'build');
}

function loseCrew(town, crew, why) {
  const people = Math.min(crew.size, town.popLeft);
  town.popLeft -= people; world.popLeft -= people; world.deaths += people; town.deaths += people;
  stat('deaths', 'fire crews lost', people); stat('deathsTown', town.name, people);
  town.claimed.delete(crew.target);
  // The first crew lost in a fire is told with how it happened; the rest are counted for the tally.
  if (town.mobilized && town.crewSaid) town.crewRun = (town.crewRun || 0) + people;
  else {
    if (town.mobilized) town.crewSaid = true;
    if (why === 'overrun by the fire') {
      const ty = world.type[crew.y * world.n + crew.x];
      const ground = isTree(ty) ? 'timber' : ty === T.SCRUB ? 'scrub' : isBuilding(ty) ? 'street' : 'grass';
      say(town, 'crewOverrun', { n: people, chief: chiefName(town), ground }, 'loss');
    } else say(town, 'crewLost', { n: people, why }, 'loss');
  }
  const [x, y] = cellCenter(crew.y * world.n + crew.x);
  popups.push({ x, y, text: '+', color: '#ff8a73', t0: performance.now(), dur: 1400 });
}
function loseTruck(town, truck, why) {
  truck.alive = false; truck.state = 'dead';
  say(town, 'engineLost', { id: truck.id, why, chief: chiefName(town) }, 'loss');
}

function updateTowns() {
  const n = world.n;
  const burning = world.burning;
  for (const town of world.towns) {
    if (town.popLeft < 0) { world.popLeft -= town.popLeft; town.popLeft = 0; }
    let minD2 = Infinity, nearest = -1;
    for (let k = 0; k < burning.length; k++) {
      const i = burning[k];
      if (world.burnLeft[i] <= 0) continue;
      const dx = (i % n) - town.cx, dy = ((i - (i % n)) / n) - town.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) { minD2 = d2; nearest = i; }
    }
    const detect = town.R * 2 + 9 + detectBonus(town);
    const threatened = nearest >= 0 && minD2 < detect * detect;
    if (threatened) {
      town.lastThreat = world.tick;
      town.nearestFire = nearest;
      town.fireDist = Math.sqrt(minD2);
      town.fireDir = Math.atan2(Math.floor(nearest / n) - town.cy, (nearest % n) - town.cx);
      if (!town.mobilized && town.popLeft > 0 && town.housesLeft > 0) { // no homes, no base to rally from
        town.mobilized = true;
        town.fires++; stat('ev', 'alarms');
        town.rallyAt = world.tick + (town.align.order > 0 ? 1 : 1 + Math.floor(Math.random() * 3));
        // Turnout is a dice roll: sometimes a handful show up, sometimes the whole town. Chaotic towns swing wider.
        const base = Math.sqrt(town.popLeft);
        const spreadT = town.align.order < 0 ? 1.4 : 0.9;
        town.crewsToSpawn = Math.min(14, Math.max(1, Math.round(base * (0.3 + Math.random() * spreadT) * (has(town, 'firewatch') ? 1.5 : has(town, 'drunkard') ? 0.7 : 1))));
        maybeSendAid(town);
        town.housesAtAlarm = town.housesLeft;
        const c = town.crewsToSpawn;
        const chief = person(town, 'chief'); if (chief) { chief.fires++; if (chief.fires === 1 || chief.fires % 5 === 0) deed(chief, `led the town against its ${chief.fires === 1 ? 'first' : chief.fires + 'th'} fire`); }
        town.crewRun = 0; town.crewSaid = false; town.fireBld = []; town.fireBldSaid = 0; // a new fire, a new count (the dead are counted from the first, even before the bell)
        const live = town.trucks.filter(tr => tr.alive);
        const crewsTxt = c === 1 ? 'a single crew' : c + ' crews', chiefTxt = chief && Math.random() < 0.5 ? chief.name : null;
        if (live.length) say(town, 'alarmEngines', { crews: crewsTxt, chief: chiefTxt, eng: `${live.length} engine${live.length > 1 ? 's' : ''}`, engN: live.length }, 'alarm');
        else say(town, 'alarm', { crews: crewsTxt, chief: chiefTxt }, 'alarm');
        const [x, y] = cellCenter(town.cy * n + town.cx);
        popups.push({ x, y: y - town.R * cellPx, text: 'RALLY!', color: '#ffb627', t0: performance.now(), dur: 1800 });
        for (const tr of live) tr.state = 'out';
      }
    } else if (town.mobilized && world.tick - town.lastThreat > 25) {
      town.mobilized = false;
      town.claimed.clear();
      town.crewsToSpawn = 0;
      town.fireDist = Infinity; town.nearestFire = -1;
      const lostNow = Math.max(0, (town.housesAtAlarm || town.housesLeft) - town.housesLeft);
      const dead = town.fireDead || 0;
      if (town.housesLeft > 0) {
        if (dead > 0) say(town, 'fireDead', { dead, lost: lostNow, had: town.housesAtAlarm }, 'loss');
        else if (lostNow === 0) say(town, 'saved', { homes: town.housesLeft }, 'win');
        else say(town, 'lost', { lost: lostNow, had: town.housesAtAlarm }, 'good');
        if (lostNow >= 10) remember(town, 'bigfire');
      }
      else say(town, 'survivorsStandDown', {}, 'loss');
      const rest = fireTallyList(town);
      if (rest.length && town.housesLeft > 0) say(town, 'fireTally', { list: listWords(rest) }, 'loss');
      town.fireDead = 0; town.fireDeadSaid = 0; town.crewRun = 0; town.crewSaid = false; town.fireBld = []; town.fireBldSaid = 0;
      for (const tr of town.trucks) if (tr.alive) tr.state = 'return';
    }

    if (town.mobilized && town.crewsToSpawn > 0 && world.tick >= town.rallyAt) {
      const home = musterPoint(town);
      if (home < 0) town.crewsToSpawn = 0; // nothing standing to muster at
      else {
        town.crewsToSpawn--;
        const size = 3 + Math.floor(Math.random() * 3);
        const hx = home % n, hy = Math.floor(home / n);
        town.crews.push({ x: hx, y: hy, px: hx, py: hy, size, target: -1, progress: 0, mode: 'dig', face: 1 });
      }
    }

    if (town.blastDead && world.tick - (town.blastSaid || -1e9) >= 6) { say(town, 'blastDead', { n: town.blastDead }, 'loss'); town.blastDead = 0; town.blastSaid = world.tick; }
    updateCrews(town);
    updateTrucks(town);
    updateWorkers(town);
    growTown(town);
    maybeArson(town);
  }
}

// Survivors of a destroyed town take to the road for the friendliest living town.
function sendRefugees(town) {
  if (town.popLeft < 6 || world.settlers) return;
  const hosts = world.towns.filter(o => o !== town && isAlive(o) && rel(town, o) > -20 && o.align.moral >= 0 && !((o.plagueUntil || 0) > world.tick)).sort((a, b) => rel(town, b) - rel(town, a));
  if (!hosts.length) return;
  const host = hosts[0];
  const path = findPath(town.cx, town.cy, host.cx, host.cy);
  if (!path) return;
  const size = Math.max(1, Math.round(town.popLeft * 0.7));
  town.popLeft -= size; town.popTotal -= size; world.popLeft -= size; world.popTotal -= size;
  world.settlers = { mode: 'join', town: host, tx: host.cx, ty: host.cy, x: town.cx, y: town.cy, px: town.cx, py: town.cy, face: 1, wait: 0, path, pi: 0, size, refugees: town.name };
  say(town, 'refugees', { n: size, host: host.name }, 'build');
}

