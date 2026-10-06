/* ───────────────────────── Town response ───────────────────────── */

function onBuildingIgnite(i) {
  const town = world.towns[world.townOf[i]];
  if (!town) return;
  if (!town.firstHit) { town.firstHit = true; say(town, 'reaches', {}, 'loss'); }
  const res = occupants(town);
  if (res > 0 && isHome(world.type[i])) {
    const survive = (world.dragonfire ? 0.5 : world.raidfire ? 0.7 : (town.mobilized ? 0.92 : 0.6)) + (town.align.moral > 0 ? 0.04 : 0);
    let lost = 0;
    for (let k = 0; k < res; k++) if (Math.random() > survive) lost++;
    lost = Math.min(lost, town.popLeft);
    if (lost > 0) {
      town.popLeft -= lost; world.popLeft -= lost; world.deaths += lost; town.deaths += lost;
      stat('deaths', world.dragonfire ? 'dragon fire' : world.raidfire ? 'torched in a raid' : 'fire', lost); stat('deathsTown', town.name, lost);
      if (town.people && Math.random() < 0.5 * lost / Math.max(1, town.popLeft + lost)) killNotable(town, world.dragonfire ? 'dragon fire' : world.raidfire ? 'torched in a raid' : 'fire');
      town.lostLogged += lost;
      if (town.lostLogged >= 8) {
        log(`${town.name}: ${town.lostLogged} ${town.lostLogged === 1 ? 'person' : 'people'} could not get out`, 'loss');
        town.lostLogged = 0;
      }
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
  if (t === T.AIRBASE && town.fighters) { log(`${town.fighters} jet${town.fighters > 1 ? 's' : ''} burn on the apron at ${town.name}`, 'loss'); stat('ev', 'fightersLost', town.fighters); town.fighters = 0; }
  if (t === T.AIRBASE && town.bombers) { log(`${town.bombers} bomber${town.bombers > 1 ? 's' : ''} burn in the hangars at ${town.name}`, 'loss'); stat('ev', 'bombersLost', town.bombers); town.bombers = 0; }
  if (t === T.PASTURE && town.livestock) { const pastures = Math.max(1, countType(town, T.PASTURE)); const lost = []; for (const k of LIVESTOCK) { const n0 = town.livestock[k] || 0, d = Math.min(n0, Math.ceil(n0 / pastures)); if (d > 0) { town.livestock[k] -= d; lost.push(`${d} ${k}`); stat('ev', 'animalsBurned', d); } } if (lost.length) log(`${town.name} loses ${lost.join(', ')} with the pasture`, 'loss'); }
  if (isHome(t)) { town.housesLeft--; town.homesLost++; }
  else if (t !== T.STATION && BUILDING_NAMES[t]) say(town, 'buildingLost', { what: BUILDING_NAMES[t].toLowerCase() }, 'loss');
  if (t === T.STATION) {
    town.hasStation = false;
    for (const tr of town.trucks) if (tr.alive && (tr.state === 'idle' || tr.state === 'refill')) loseTruck(town, tr, 'lost with the station');
    log(`${town.name} fire station burns down`, 'loss');
  }
  if (town.housesLeft === 0 && !town.destroyed) {
    town.destroyed = true;
    log(`${town.name} is gone`, 'loss');
    sendRefugees(town);
  }
}

function occupants(town) {
  return Math.min(24, Math.ceil(town.popLeft / Math.max(1, town.housesLeft)));
}

function loseCrew(town, crew, why) {
  const people = Math.min(crew.size, town.popLeft);
  town.popLeft -= people; world.popLeft -= people; world.deaths += people; town.deaths += people;
  stat('deaths', 'fire crews lost', people); stat('deathsTown', town.name, people);
  town.claimed.delete(crew.target);
  say(town, 'crewLost', { n: people, why }, 'loss');
  const [x, y] = cellCenter(crew.y * world.n + crew.x);
  popups.push({ x, y, text: '+', color: '#ff8a73', t0: performance.now(), dur: 1400 });
}
function loseTruck(town, truck, why) {
  truck.alive = false; truck.state = 'dead';
  log(`${town.name} engine ${truck.id} ${why}`, 'loss');
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
        say(town, 'alarm', { crews: c === 1 ? 'a single crew' : c + ' crews', chief: chief && Math.random() < 0.5 ? chief.name : null }, 'alarm');
        const [x, y] = cellCenter(town.cy * n + town.cx);
        popups.push({ x, y: y - town.R * cellPx, text: 'RALLY!', color: '#ffb627', t0: performance.now(), dur: 1800 });
        const live = town.trucks.filter(tr => tr.alive);
        for (const tr of live) tr.state = 'out';
        if (live.length) log(`${town.name} station rolls ${live.length} engine${live.length > 1 ? 's' : ''}`, 'good');
      }
    } else if (town.mobilized && world.tick - town.lastThreat > 25) {
      town.mobilized = false;
      town.claimed.clear();
      town.crewsToSpawn = 0;
      town.fireDist = Infinity; town.nearestFire = -1;
      const lostNow = Math.max(0, (town.housesAtAlarm || town.housesLeft) - town.housesLeft);
      if (town.housesLeft > 0) { if (lostNow === 0) say(town, 'saved', { homes: town.housesLeft }, 'win'); else { say(town, 'lost', { lost: lostNow, had: town.housesAtAlarm }, 'good'); if (lostNow >= 10) remember(town, 'bigfire'); } }
      else log(`${town.name} survivors stand down`, 'loss');
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
  const hosts = world.towns.filter(o => o !== town && isAlive(o) && rel(town, o) > -20 && o.align.moral >= 0).sort((a, b) => rel(town, b) - rel(town, a));
  if (!hosts.length) return;
  const host = hosts[0];
  const path = findPath(town.cx, town.cy, host.cx, host.cy);
  if (!path) return;
  const size = Math.max(1, Math.round(town.popLeft * 0.7));
  town.popLeft -= size; town.popTotal -= size; world.popLeft -= size; world.popTotal -= size;
  world.settlers = { mode: 'join', town: host, tx: host.cx, ty: host.cy, x: town.cx, y: town.cy, px: town.cx, py: town.cy, face: 1, wait: 0, path, pi: 0, size, refugees: town.name };
  say(town, 'refugees', { n: size, host: host.name }, 'build');
}

