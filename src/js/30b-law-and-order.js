/* ───────────────────────── Law and order ─────────────────────────
   Crimes breed from hunger, unrest, fat treasuries and bad elders. Each one gets a named culprit, a
   constable who takes a while to find them, and a sentence set by the town's law and whoever is in
   charge, right or wrong. All of it shows: the constable walks, the fugitive runs, the log keeps the
   record, and the town card says what the law is here. */

const SENTENCE_LABEL = { gaol: 'trial and the gaol', labour: 'hard labour at the quarry', execution: 'the rope', banish: 'banishment', fine: 'a fine', mob: 'whatever the mob decides', pressed: 'the militia', pardon: 'mercy', warden: 'a strange reward' };
const CRIME_LABEL = { arson: 'arson', theft: 'theft from the stores', embezzle: 'robbing the coin room', treason: 'desertion to the enemy', spying: 'spying for the enemy', smuggling: 'smuggling' };
// What the law says before the elder has a word. Order sets the method, morals the severity.
function lawOf(town) {
  const o = town.align.order, m = town.align.moral;
  if (o > 0) return m > 0 ? 'gaol' : m < 0 ? 'execution' : 'labour';
  if (o < 0) return m > 0 ? 'banish' : m < 0 ? 'pressed' : 'mob';
  return m < 0 ? 'execution' : 'fine';
}
const LEADER_BEND = { tyrant: ['execution', 1, 'hangs them all'], peacemaker: ['pardon', 0.7, 'would rather forgive'], merchant: ['fine', 0.7, 'prefers a fine'], warmonger: ['pressed', 0.7, 'wants them in the ranks'], builder: ['labour', 0.6, 'puts them to work'], prophet: ['banish', 0.6, 'casts them out'], madman: ['warden', 0.5, 'does something strange'] };
function lawLabel(town) {
  const bend = LEADER_BEND[trait(town)];
  return SENTENCE_LABEL[lawOf(town)] + (bend ? `, though the elder ${bend[2]}` : '');
}
function decideSentence(town, c, who) {
  const r = Math.random();
  if (c.kind === 'treason' || c.kind === 'spying') {
    const tr = trait(town), o = town.align.order, m = town.align.moral;
    if (tr === 'peacemaker' || (o < 0 && m > 0)) return 'banish';
    if (o > 0 && m > 0 && tr !== 'tyrant') return 'gaol';
    if (o < 0 && m === 0) return 'mob';
    if (o < 0 && m < 0) return 'pressed';
    return 'execution';
  }
  if (c.kind === 'theft' && c.hungry && town.align.moral > 0 && r < 0.8) return 'pardon';
  const bend = LEADER_BEND[trait(town)];
  if (bend && r < bend[1]) return bend[0];
  return lawOf(town);
}
// How likely a fire-setter is here: the gallows and the gaol discourage it, unrest and a soft elder invite it.
function arsonMul(town) {
  let m = 1;
  if (hasType(town, T.GAOL)) m *= 0.7;
  if (town.fear > world.tick) m *= 0.5;
  if (has(town, 'peacemaker')) m *= 1.3;
  if ((town.unrest || 0) >= 60) m *= 1.8;
  return m;
}
function findPerson(town, name) { return (town.people || []).find(p => p.name === name) || null; }
function constableOf(town) {
  let c = person(town, 'constable');
  if (!c && (hasType(town, T.TOWNHALL) || hasType(town, T.BARRACKS) || town.militia >= 4)) c = elect(town, 'constable', true);
  return c;
}
// A crime has happened: name the culprit and start the case.
function openCase(town, kind, who, cell, extra) {
  const c = Object.assign({ kind, who: who.name, started: world.tick, cell, witnessed: false, hunt: false, loot: 0, hungry: false }, extra || {});
  if (kind === 'arson') c.witnessed = (who.arsons || 0) >= 2 || Math.random() < 0.15;
  else if (kind === 'theft') c.witnessed = Math.random() < 0.3;
  town.case = c;
  town.crimes = (town.crimes || 0) + 1; stat('ev', 'crimes'); stat('crime', CRIME_LABEL[kind]);
  const con = constableOf(town);
  if (con) { c.hunt = true; log(`Constable ${con.name} of ${town.name} ${c.witnessed ? `goes looking for ${who.name}; people saw them` : 'starts asking questions'}`, 'arson'); }
  else log(`Nobody in ${town.name} is going after whoever did it`, 'arson');
}
// Crimes that breed from the town's condition. Called every sixteen ticks a town.
function updateLaw(town) {
  if (town.popLeft <= 0) return;
  if (town.case) { updateCase(town); return; }
  releaseConvicts(town);
  if ((town.lawCooldown || 0) > world.tick) return;
  const hungry = town.famine || town.fed === false, food = (town.res.grain || 0) + (town.res.fish || 0) + (town.res.game || 0);
  const r = Math.random();
  const enemies = world.towns.filter(o => o !== town && isAlive(o) && atWar(town, o));
  if (town.spy && !enemies.some(o => o.id === town.spy.from)) { const sp = findPerson(town, town.spy.who); if (sp) { town.people = town.people.filter(p => p !== sp); } log(`With the war over, a stranger slips out of ${town.name} by night. Nobody had asked what they were doing there.`, 'arson'); town.spy = null; }
  if (town.spy) {
    // A spy at work: the enemy learns what the town learns, and the constable may notice a stranger asking too many questions.
    const e = world.towns[town.spy.from];
    if (e && isAlive(e)) { const take = Math.min(town.milPts || 0, 2); town.milPts -= take; e.milPts = (e.milPts || 0) + take; }
    let notice = 0.012 * (town.align.order > 0 ? 1.5 : 1) * (hasType(town, T.TOWER) ? 1.3 : 1) * ((town.unrest || 0) >= 50 ? 0.6 : 1) * (person(town, 'constable') ? 1 : 0.3);
    if (Math.random() < notice) { const sp = findPerson(town, town.spy.who); if (sp) { log(`A stranger in ${town.name} has been asking about the walls and the granary. ${sp.name}, they call themselves.`, 'arson'); openCase(town, 'spying', sp, town.cy * world.n + town.cx, { witnessed: true }); return; } }
  }
  if (enemies.length) {
    const o = enemies[Math.floor(Math.random() * enemies.length)];
    const losing = town.militia * 2 < o.militia || town.popLeft < o.popLeft * 0.5;
    if (town.militia >= 6 && ((town.unrest || 0) >= 50 || losing) && r < 0.005) {
      const n = Math.min(Math.floor(town.militia / 2), 2 + Math.floor(Math.random() * 4));
      town.militia -= n; o.militia += n; stat('ev', 'desertions');
      const who = makePerson(Math.random, 'captain', 22 + Math.random() * 25); who.story = `led a company of ${town.name}'s militia and did not like the way the war was going`; town.people.push(who);
      log(`${who.name} walks out of ${town.name} in the night with ${n} soldiers and goes over to ${o.name}`, 'war');
      openCase(town, 'treason', who, hideout(town), { witnessed: true, loot: n, flee: o.id });
      return;
    }
    if (!town.spy && !(o.spyPlanted && world.tick - o.spyPlanted < 3000) && o.militia >= 4 && Math.random() < 0.004) {
      const sp = makePerson(Math.random, 'spy', 20 + Math.random() * 30); sp.story = 'arrived over the hills with a trade in pots and pans and a good memory'; sp.revealed = false;
      town.people.push(sp); town.spy = { from: o.id, who: sp.name, since: world.tick }; o.spyPlanted = world.tick; stat('ev', 'spies');
      log(`${o.name} sends someone to live quietly in ${town.name}`, 'war'); // the player sees this; the town does not
      return;
    }
  }
  if (hungry && food >= 3 && r < 0.05) {
    const take = Math.min(food, 2 + Math.floor(Math.random() * 5)); let left = take;
    for (const k of ['grain', 'fish', 'game']) { const a = Math.min(town.res[k] || 0, left); town.res[k] -= a; left -= a; if (!left) break; }
    const who = thiefOf(town, 'took to the granary at night when the children were hungry');
    log(`Someone has been at the granary in ${town.name}: ${take} food gone in the night`, 'arson');
    openCase(town, 'theft', who, town.cy * world.n + town.cx, { loot: take, hungry: true });
  } else if (!hungry && (town.unrest || 0) >= 60 && food >= 20 && r < 0.012) {
    const take = 3 + Math.floor(Math.random() * 6); town.res.grain = Math.max(0, (town.res.grain || 0) - take);
    const who = thiefOf(town, 'thinks the stores belong to whoever can carry them');
    log(`${take} grain missing from the granary in ${town.name}`, 'arson');
    openCase(town, 'theft', who, town.cy * world.n + town.cx, { loot: take });
  } else if (town.res.coin >= 120 && ((town.unrest || 0) >= 45 || has(town, 'miser') || has(town, 'tyrant')) && r < 0.012) {
    const take = Math.floor(town.res.coin * (0.1 + Math.random() * 0.2)); town.res.coin -= take;
    const who = thiefOf(town, 'kept the ledgers at the hall and kept a little of what they counted');
    log(`The chest at ${town.name} is light: ${take} coin missing from the coin room`, 'arson');
    openCase(town, 'embezzle', who, town.cy * world.n + town.cx, { loot: take });
  }
}
function thiefOf(town, story) {
  const known = (town.people || []).find(p => p.alive && p.role === 'thief');
  if (known && Math.random() < 0.6) return known;
  const p = makePerson(Math.random, 'thief', 16 + Math.random() * 40); p.story = story; p.revealed = false;
  town.people.push(p); if (town.people.length > 14) town.people = town.people.filter(q => q.alive).slice(-10).concat(town.people.filter(q => !q.alive).slice(-4));
  return p;
}
// The hunt: a constable on the streets, the culprit keeping to the edges, and a roll every sixteen
// ticks that favours militia, towers, a fire warden and a lawful town, and goes against a town so
// restless that people hide them. Most cases close inside a few hundred ticks; some go cold.
function updateCase(town) {
  const c = town.case, who = findPerson(town, c.who);
  if (!who || !who.alive) { town.case = null; return; }
  const age = world.tick - c.started;
  if (!c.hunt) {
    const con = constableOf(town);
    if (con) { c.hunt = true; log(`Constable ${con.name} takes up the case of ${CRIME_LABEL[c.kind]} in ${town.name}`, 'arson'); }
    else if (age > 300) { town.case = null; town.lawCooldown = world.tick + 400; return; }
    else return;
  }
  if (!town.mobilized) {
    if (!town.workers.some(w => w.job === 'constable')) { const h = campPoint(town); if (h >= 0) town.workers.push({ x: h % world.n, y: Math.floor(h / world.n), px: h % world.n, py: Math.floor(h / world.n), target: -1, linger: 0, face: 1, job: 'constable', law: true }); }
    if (!town.workers.some(w => w.job === 'fugitive')) { const h = hideout(town); if (h >= 0) town.workers.push({ x: h % world.n, y: Math.floor(h / world.n), px: h % world.n, py: Math.floor(h / world.n), target: -1, linger: 0, face: 1, job: 'fugitive', law: true }); }
  }
  let p = 0.015 * Math.min(2.5, 1 + town.militia / 40);
  if (hasType(town, T.TOWER)) p *= 1.5;
  if (has(town, 'firewatch')) p *= 1.5;
  if (hasType(town, T.GAOL)) p *= 1.2;
  p *= town.align.order > 0 ? 1.3 : town.align.order < 0 ? 0.7 : 1;
  const u = town.unrest || 0; if (u >= 60) p *= 0.4; else if (u >= 40) p *= 0.7;
  if (c.witnessed) p *= 2.5;
  const con = town.workers.find(w => w.job === 'constable'), fug = town.workers.find(w => w.job === 'fugitive');
  if (con && fug && Math.hypot(con.x - fug.x, con.y - fug.y) <= 2) p *= 4; // a chase in the open
  if (c.flee !== undefined) {
    // A deserter runs for the enemy's lines. Past the town's reach, they are gone.
    if (fug) fug.flee = c.flee;
    if (fug && Math.hypot(fug.x - town.cx, fug.y - town.cy) > town.R + 12) { const o = world.towns[c.flee]; defect(town, who, o, c); return; }
    p *= 2;
  } else if (c.fled === undefined && age > 400 && Math.random() < 0.03) {
    const o = world.towns.filter(t => t !== town && isAlive(t) && Math.hypot(t.cx - town.cx, t.cy - town.cy) < 70).sort((a, b) => Math.hypot(a.cx - town.cx, a.cy - town.cy) - Math.hypot(b.cx - town.cx, b.cy - town.cy))[0];
    if (o) { c.fled = o.id; c.fledAt = world.tick; town.workers = town.workers.filter(w => w.job !== 'fugitive'); log(`${who.name} slips out of ${town.name} on the road to ${o.name}`, 'arson'); return; }
  }
  if (c.fled !== undefined) {
    const o = world.towns[c.fled];
    if (!o || !isAlive(o)) { town.case = null; return; }
    if (world.tick - c.fledAt < 100) return;
    if (o.align.order > 0 || rel(town, o) >= 20) { log(`${o.name} sends ${who.name} back to ${town.name} in chains`, 'win'); stat('ev', 'extraditions'); capture(town, c, who); }
    else {
      setRel(town, o, rel(town, o) - 10); stat('ev', 'extraditionsRefused');
      log(`${o.name} will not give up ${who.name}. ${town.name} takes it badly.`, 'diplo');
      town.people = town.people.filter(p => p !== who); who.role = c.kind === 'arson' ? 'firebug' : 'townsfolk'; who.revealed = false; who.story = `came to ${o.name} one step ahead of ${town.name}'s constable`;
      o.people.push(who); if (o.people.length > 14) o.people = o.people.filter(q => q.alive).slice(-10).concat(o.people.filter(q => !q.alive).slice(-4));
      town.workers = town.workers.filter(w => !w.law); town.case = null; town.lawCooldown = world.tick + 200;
    }
    return;
  }
  if (Math.random() < p) { capture(town, c, who); return; }
  if (age > 2000) {
    town.case = null; town.lawCooldown = world.tick + 300; who.revealed = c.witnessed; who.escaped = (who.escaped || 0) + 1;
    town.workers = town.workers.filter(w => !w.law);
    log(`The trail goes cold in ${town.name}. ${c.witnessed ? `${who.name} is still about, and everyone knows it` : 'Whoever it was is still about'}.`, 'arson');
    if (c.kind === 'arson' && Math.random() < 0.3) { town.people = town.people.filter(p => p !== who); roam(town, who, 'slips away into the hills'); }
  }
}
function defect(town, who, o, c) {
  town.workers = town.workers.filter(w => !w.law); town.case = null; town.lawCooldown = world.tick + 200;
  town.people = town.people.filter(p => p !== who);
  if (o && isAlive(o)) { who.role = 'townsfolk'; who.revealed = true; who.story = `came over from ${town.name} in the war with ${c.loot} soldiers at their back`; o.people.push(who); log(`${who.name} reaches ${o.name}'s lines. ${town.name} will not forget it.`, 'war'); }
  deed(who, `deserted ${town.name} for ${o ? o.name : 'the enemy'}`);
}
// Banished and escaped arsonists do not vanish. They wander the woods, and one day they come back to somebody's town.
function roam(town, who, how) {
  const n = world.n, h = hideout(town); if (h < 0) return;
  world.firebugs = world.firebugs || [];
  world.firebugs.push({ name: who.name, from: town.id, x: h % n, y: Math.floor(h / n), px: h % n, py: Math.floor(h / n), face: 1, target: -1, next: world.tick + 1500 + Math.floor(Math.random() * 3000), town: -1, stuck: 0 });
  stat('ev', 'firebugsLoose');
  log(`${who.name} ${how}. Somebody should have made sure.`, 'arson');
}
function updateFirebugs() {
  const bugs = world.firebugs; if (!bugs || !bugs.length) return;
  const n = world.n, keep = [];
  for (const b of bugs) {
    b.px = b.x; b.py = b.y;
    if (world.burnLeft[b.y * n + b.x] > 0) { log(`${b.name}, the firebug, dies in a fire of somebody else's making`, 'loss'); continue; }
    // Fire nearby: run the other way, whatever the errand.
    { let fx = 0, fy = 0, hot = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = b.x + dx, y = b.y + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; if (world.burnLeft[y * n + x] > 0) { fx += dx; fy += dy; hot++; } }
      if (hot) { const len = Math.hypot(fx, fy) || 1; const tx = Math.max(1, Math.min(n - 2, Math.round(b.x - fx / len * 6))), ty = Math.max(1, Math.min(n - 2, Math.round(b.y - fy / len * 6))); if (passable(world.type[ty * n + tx])) { stepToward(b, tx, ty, 2, false); b.target = -1; keep.push(b); continue; } } }
    if (b.town < 0 && world.tick >= b.next) {
      const pool = world.towns.filter(t => isAlive(t) && t.popLeft >= 10 && t.id !== b.from);
      const t = pool.length ? pool[Math.floor(Math.random() * pool.length)] : world.towns[b.from];
      if (t && isAlive(t)) { b.town = t.id; b.target = -1; }
      else b.next = world.tick + 1000;
    }
    if (b.town >= 0) {
      const t = world.towns[b.town];
      if (!t || !isAlive(t)) { b.town = -1; b.next = world.tick + 800; keep.push(b); continue; }
      if (Math.hypot(b.x - t.cx, b.y - t.cy) <= t.R + 3) {
        // Arrived: a fire on the edge, and a face the town has never seen.
        for (let tries = 0; tries < 30; tries++) { const a = Math.random() * Math.PI * 2, d = t.R + 2 + Math.random() * 3; const x = Math.round(t.cx + Math.cos(a) * d), y = Math.round(t.cy + Math.sin(a) * d); if (x < 0 || y < 0 || x >= n || y >= n) continue; const i = y * n + x; if (isFuel(world.type[i]) && !isBuilding(world.type[i]) && world.burnLeft[i] <= 0) { ignite(i); break; } }
        const from = world.towns[b.from];
        const p = makePerson(Math.random, 'firebug', 25 + Math.random() * 30); p.name = b.name; p.revealed = true; p.arsons = 3; p.story = `was driven out of ${from ? from.name : 'another valley'} for arson and came back with matches`;
        t.people = t.people || []; t.people.push(p);
        stat('ev', 'firebugFires');
        log(`${b.name}, the firebug driven out of ${from ? from.name : 'the hills'}, sets a fire on the edge of ${t.name}`, 'arson');
        const [px, py] = cellCenter(t.cy * n + t.cx); popups.push({ x: px, y: py - t.R * cellPx - 14, text: 'FIREBUG', color: '#ff6ad5', t0: performance.now(), dur: 2600 });
        if (!t.case) openCase(t, 'arson', p, b.y * n + b.x, { witnessed: true });
        continue;
      }
      stepToward(b, t.cx, t.cy, 1, false);
      if (b.stall > 6 || ++b.stuck > 600) { b.town = -1; b.next = world.tick + 500; b.stuck = 0; b.stall = 0; b.lastCell = -1; }
    } else if (world.tick % 3 === 0) {
      // Keeping to the woods, away from everyone.
      if (b.target < 0 || (b.x === b.target % n && b.y === Math.floor(b.target / n))) {
        for (let tries = 0; tries < 12; tries++) { const x = Math.max(1, Math.min(n - 2, b.x + Math.floor(Math.random() * 17) - 8)), y = Math.max(1, Math.min(n - 2, b.y + Math.floor(Math.random() * 17) - 8)); const i = y * n + x; if (!passable(world.type[i]) || world.towns.some(t => Math.hypot(t.cx - x, t.cy - y) < t.R + 6)) continue; b.target = i; break; }
      }
      if (b.target >= 0) { stepToward(b, b.target % n, Math.floor(b.target / n), 1, false); if (b.stall > 3) { b.stall = 0; b.target = -1; b.lastCell = -1; } }
    }
    keep.push(b);
  }
  world.firebugs = keep;
}
// After market day, goods sometimes leave by the back road. Under a grasping elder, or in wartime, somebody is making money the town is not.
function maybeSmuggle(tr, town) {
  if (town.case || town.popLeft < 20) return;
  const war = world.towns.some(o => o !== town && atWar(town, o));
  if (!(has(town, 'miser') || has(town, 'tyrant') || war) || (town.unrest || 0) < 25 || Math.random() > 0.35) return;
  const wants = techWants(town);
  if (wants.size && Math.random() < 0.3) {
    const k = [...wants][0], amt = 4 + Math.floor(Math.random() * 5); addRes(town, k, amt); stat('ev', 'smuggled', amt);
    log(`After the caravan leaves ${town.name}, ${amt} ${k} turns up that nobody paid for. ${town.align.order < 0 ? 'Nobody asks.' : 'The elder wants to know who.'}`, 'arson');
    if (town.align.order < 0) return;
    openCase(town, 'smuggling', thiefOf(town, 'knows every trader by name and every back road out of town'), town.cy * world.n + town.cx, { loot: amt, witnessed: Math.random() < 0.4 });
    return;
  }
  let best = null; for (const k of RES_KINDS) if (k !== 'coin' && k !== 'water' && PRICE[k] && (!best || town.res[k] > town.res[best])) best = k;
  if (!best || town.res[best] < 8) return;
  const amt = Math.min(town.res[best] - 3, 5 + Math.floor(Math.random() * 8)); town.res[best] -= amt; tr.stock[best] = (tr.stock[best] || 0) + amt; stat('ev', 'smuggled', amt);
  if (town.align.order < 0 && Math.random() < 0.6) { log(`${amt} ${best} leaves ${town.name} on the caravan by the back road, and nobody minds`, 'arson'); return; }
  log(`${amt} ${best} is missing from ${town.name}'s stores after market day, and the caravan's wagons sit low`, 'arson');
  openCase(town, 'smuggling', thiefOf(town, 'knows every trader by name and every back road out of town'), town.cy * world.n + town.cx, { loot: amt, witnessed: Math.random() < 0.4 });
}
function hideout(town) {
  const n = world.n;
  for (let tries = 0; tries < 30; tries++) {
    const a = Math.random() * Math.PI * 2, d = town.R + 1 + Math.random() * 4;
    const x = Math.round(town.cx + Math.cos(a) * d), y = Math.round(town.cy + Math.sin(a) * d);
    if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) continue;
    const i = y * n + x; if (passable(world.type[i]) && !isBuilding(world.type[i]) && world.burnLeft[i] <= 0) return i;
  }
  return -1;
}
// The constable walks the streets and gives chase; the fugitive keeps to the edge of town and runs when the law comes near.
function updateLawWorker(town, w) {
  if (!town.case) return false;
  const n = world.n, type = world.type;
  const other = town.workers.find(o => o.law && o !== w);
  const near = other ? Math.hypot(other.x - w.x, other.y - w.y) : 99;
  if (w.job === 'constable') {
    if (near <= 8 && other) { w.target = other.y * n + other.x; w.linger = 0; }
    else if (w.target < 0 || (w.x === w.target % n && w.y === Math.floor(w.target / n) && ++w.linger > 2 + Math.floor(Math.random() * 4))) {
      const roads = roadCells(town); const edge = Math.random() < 0.5 ? hideout(town) : -1;
      w.target = edge >= 0 ? edge : roads.length ? roads[Math.floor(Math.random() * roads.length)] : -1; w.linger = 0;
    }
  } else if (w.flee !== undefined) {
    const o = world.towns[w.flee]; if (o) { stepToward(w, o.cx, o.cy, 1, false); if (w.stall > 4) { w.stall = 0; w.lastCell = -1; } }
    return true;
  } else {
    if (near <= 4 && other) {
      const dx = w.x - other.x, dy = w.y - other.y, len = Math.hypot(dx, dy) || 1;
      const tx = Math.max(1, Math.min(n - 2, Math.round(w.x + dx / len * 5))), ty = Math.max(1, Math.min(n - 2, Math.round(w.y + dy / len * 5)));
      if (passable(type[ty * n + tx])) { w.target = ty * n + tx; w.linger = 0; }
    } else if (w.target < 0 || (w.x === w.target % n && w.y === Math.floor(w.target / n) && ++w.linger > 4 + Math.floor(Math.random() * 10))) { w.target = hideout(town); w.linger = 0; }
  }
  if (w.target >= 0 && !(w.x === w.target % n && w.y === Math.floor(w.target / n))) { stepToward(w, w.target % n, Math.floor(w.target / n), w.job === 'fugitive' && near <= 4 ? 2 : 1, false); if (w.stall > 3) { w.stall = 0; w.target = -1; w.lastCell = -1; } }
  return true;
}
function capture(town, c, who) {
  const con = person(town, 'constable');
  town.workers = town.workers.filter(w => !w.law);
  town.caught = (town.caught || 0) + 1; stat('ev', 'caught');
  who.revealed = true;
  if (con) deed(con, `caught ${who.name} for ${CRIME_LABEL[c.kind]}`);
  deed(who, `was caught for ${CRIME_LABEL[c.kind]}`);
  if (c.loot && c.kind === 'embezzle') { const back = Math.floor(c.loot * 0.8); town.res.coin += back; log(`${back} of the ${c.loot} coin is found under ${who.name}'s floor`, 'win'); }
  if (c.kind === 'spying') { const e = world.towns[town.spy ? town.spy.from : -1]; if (e) { setRel(town, e, rel(town, e) - 10); deed(who, `was unmasked as ${e.name}'s spy`); } town.spy = null; stat('ev', 'spiesCaught'); }
  const s = decideSentence(town, c, who);
  const [px, py] = cellCenter(town.cy * world.n + town.cx);
  popups.push({ x: px, y: py - town.R * cellPx - 14, text: 'CAUGHT', color: '#a7e36f', t0: performance.now(), dur: 2200 });
  const where = c.kind === 'arson' ? 'in the woods above the town' : 'at the edge of town';
  log(`${con ? `Constable ${con.name}` : `${town.name}'s militia`} takes ${who.name} ${where} for ${CRIME_LABEL[c.kind]}`, 'win');
  applySentence(town, c, who, s);
  town.case = null; town.lawCooldown = world.tick + 200;
}
function applySentence(town, c, who, s) {
  const l = leader(town), ln = l ? l.name : 'the elder', kind = CRIME_LABEL[c.kind];
  stat('sentence', SENTENCE_LABEL[s]);
  const wasFirebug = who.role === 'firebug';
  const term = 600 + Math.floor(Math.random() * 900);
  switch (s) {
    case 'gaol':
      who.role = 'convict'; who.until = world.tick + term; who.wasRole = wasFirebug ? 'firebug' : 'thief';
      if (!hasType(town, T.GAOL)) { town.wantGaol = true; log(`${who.name} is tried for ${kind} and locked in the cellar of the hall for ${Math.round(term / YEAR * 12)} months; ${town.name} needs a gaol`, 'arson'); }
      else log(`${who.name} is tried for ${kind} and sent to the gaol for ${Math.round(term / YEAR * 12)} months`, 'arson');
      break;
    case 'labour':
      who.role = 'convict'; who.until = world.tick + term; who.labour = true; who.wasRole = wasFirebug ? 'firebug' : 'thief';
      log(`${who.name} gets ${Math.round(term / YEAR * 12)} months of hard labour at the quarry for ${kind}`, 'arson');
      break;
    case 'execution': {
      const feared = c.kind === 'arson' && (who.arsons || 0) >= 2;
      who.alive = false; who.died = world.tick; who.cause = 'hanged'; stat('ev', 'hanged');
      town.unrest = Math.max(0, Math.min(100, (town.unrest || 0) + (feared ? -4 : 6))); town.fear = world.tick + 2000;
      log(`${ln} of ${town.name} has ${who.name} hanged in the square for ${kind}. ${feared ? 'Nobody weeps.' : 'People mutter that it was too much.'}`, 'loss');
      break;
    }
    case 'banish':
      stat('ev', 'banished');
      if (c.kind === 'arson' && Math.random() < 0.6) { town.people = town.people.filter(p => p !== who); roam(town, who, `is cast out of ${town.name} for ${kind} and walks into the hills with what they can carry`); }
      else { who.alive = false; who.died = world.tick; who.cause = 'banished'; log(`${who.name} is cast out of ${town.name} for ${kind} and walks into the hills with what they can carry`, 'arson'); }
      break;
    case 'fine': {
      const fine = 10 + Math.floor(Math.random() * 20); town.res.coin += fine; who.role = 'townsfolk';
      log(`${who.name} pays ${town.name} ${fine} coin for ${kind} and goes home`, 'arson');
      break;
    }
    case 'mob':
      if (Math.random() < 0.5) { who.alive = false; who.died = world.tick; who.cause = 'hanged'; stat('ev', 'hanged'); town.unrest = Math.max(0, Math.min(100, (town.unrest || 0) + 3)); log(`A mob in ${town.name} drags ${who.name} to the old oak for ${kind}. The constable looks away.`, 'loss'); }
      else { who.role = 'townsfolk'; log(`A mob in ${town.name} beats ${who.name} for ${kind} and lets them go, and some of them are laughing`, 'arson'); }
      break;
    case 'pressed': {
      const add = world.towns.some(o => o !== town && atWar(town, o)) ? 2 : 1; town.militia += add; who.role = 'soldier';
      log(`${who.name} is given a spear and a place in ${town.name}'s militia for ${kind}. ${add > 1 ? 'There is a war on; nobody asks questions.' : 'It is cheaper than a gaol.'}`, 'arson');
      break;
    }
    case 'pardon':
      town.unrest = Math.max(0, (town.unrest || 0) - 3); who.role = 'townsfolk';
      log(c.hungry ? `${ln} of ${town.name} says a hungry parent is no thief and sends ${who.name} home with a loaf` : `${ln} of ${town.name} pardons ${who.name} for ${kind}`, 'good');
      break;
    case 'warden': {
      const chief = person(town, 'chief'); if (chief) chief.role = 'townsfolk';
      who.role = 'chief'; who.fires = who.fires || 0;
      log(`${ln} of ${town.name} says it takes one to know one and makes ${who.name} the fire chief. The town is not sure what to think.`, 'arson');
      break;
    }
  }
  deed(who, `${s === 'execution' ? 'was hanged' : s === 'banish' ? 'was banished' : s === 'gaol' ? 'was gaoled' : s === 'labour' ? 'was sent to the quarry' : s === 'pressed' ? 'was pressed into the militia' : s === 'pardon' ? 'was pardoned' : s === 'warden' ? 'was made fire chief' : 'was punished'} for ${kind}`);
  if (wasFirebug && who.role !== 'firebug' && Math.random() < 0.6) elect(town, 'firebug', true); // someone else picks up the matches, sooner or later
}
/* ───────────────────────── Medicine ─────────────────────────
   A healer's house, then a hospital, staffed by a named healer and stocked with herbs that foragers
   gather from scrub, reeds and jungle in spring and summer. Herbs are spent to save people: a share of
   the dead in a plague, a battle, a dragon's visit or the fallout. An empty shelf means the healer can
   only watch. Elders live longer with a healer in town. */
function healMul(t) { return hasType(t, T.HOSPITAL) ? 0.5 : hasType(t, T.HEALER) ? 0.75 : 1; }
// How many of `dead` the healer pulls through, herbs permitting. One handful of herbs per four saved.
function heal(t, dead, cause) {
  if (!t.res || dead <= 0) return 0;
  const hosp = hasType(t, T.HOSPITAL), house = hasType(t, T.HEALER);
  if (!hosp && !house) return 0;
  const h = person(t, 'healer'); if (!h) return 0;
  let share = (hosp ? 0.5 : 0.3) + (has(t, 'physician') ? 0.15 : 0);
  if (cause === 'fallout') share *= hosp ? 1 : 0.5; // sickness nobody can name needs a hospital
  const want = Math.floor(dead * share), canTreat = Math.min(want, (t.res.herbs || 0) * 4);
  if (canTreat <= 0) { if (want >= 3 && (!t.herbLogged || world.tick - t.herbLogged > 600)) { t.herbLogged = world.tick; log(`${h.name} has nothing on the shelves at ${t.name} and can only watch`, 'loss'); } return 0; }
  t.res.herbs -= Math.ceil(canTreat / 4); t.healed = (t.healed || 0) + canTreat; stat('ev', 'healed', canTreat);
  if (canTreat >= 3) deed(h, `pulled ${canTreat} through the ${cause === 'battle' ? 'fighting' : cause === 'dragon' ? 'dragon\'s visit' : cause}`);
  if (cause !== 'plague' && Math.random() < 0.5) log(`${h.name} patches up ${canTreat} at ${t.name} who would not have lived`, 'good');
  return canTreat;
}
function updateHealer(town) {
  if (!hasType(town, T.HEALER) && !hasType(town, T.HOSPITAL)) return;
  if (!person(town, 'healer')) { const h = elect(town, 'healer', true); h.story = 'learned the herbs from a grandmother and the rest from burying people'; log(`${h.name} hangs out a healer's sign in ${town.name}`, 'build'); }
}

// Convicts serve their time. Hard labour means stone, as long as the town has a quarry to work.
function releaseConvicts(town) {
  for (const p of town.people || []) {
    if (!p.alive || p.role !== 'convict') continue;
    if (p.labour && hasType(town, T.QUARRY) && Math.random() < 0.5) addRes(town, 'stone', 1);
    if (world.tick >= p.until) {
      const reformed = Math.random() < 0.7, from = p.labour ? 'the quarry' : 'the gaol';
      p.role = reformed ? 'townsfolk' : p.wasRole || 'townsfolk'; p.revealed = !reformed; p.labour = false;
      log(reformed ? `${p.name} comes out of ${from} at ${town.name} a changed person` : `${p.name} is let out of ${from} at ${town.name} and has learned nothing`, 'build');
    }
  }
}
