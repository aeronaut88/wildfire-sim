/* ───────────────────────── Law and order ─────────────────────────
   Crimes breed from hunger, unrest, fat treasuries and bad elders. Each one gets a named culprit, a
   constable who takes a while to find them, and a sentence set by the town's law and whoever is in
   charge, right or wrong. All of it shows: the constable walks, the fugitive runs, the log keeps the
   record, and the town card says what the law is here. */

const SENTENCE_LABEL = { gaol: 'trial and the gaol', labour: 'hard labour at the quarry', execution: 'the rope', banish: 'banishment', fine: 'a fine', mob: 'whatever the mob decides', pressed: 'the militia', pardon: 'mercy', warden: 'a strange reward', pillory: 'a day in the pillory' };
const CRIME_LABEL = { arson: 'arson', theft: 'theft from the stores', embezzle: 'robbing the coin room', treason: 'desertion to the enemy', spying: 'spying for the enemy', smuggling: 'smuggling', sedition: 'speaking against the elder', escape: 'breaking gaol', banditry: 'banditry' };
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
  if (c.kind === 'sedition') return trait(town) === 'tyrant' && r < 0.5 ? 'execution' : 'gaol';
  if (c.kind === 'escape' || c.kind === 'banditry') { const o = town.align.order, m = town.align.moral; return m < 0 || (o > 0 && m === 0) ? 'execution' : o > 0 ? 'gaol' : 'banish'; }
  if ((c.kind === 'theft' || c.kind === 'smuggling') && (c.loot || 0) <= 8 && town.align.moral >= 0 && town.align.order >= 0 && r < 0.4) return 'pillory';
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
  const wrong = (town.wrongs || []).find(w => w.kind === kind && world.tick - w.tick < YEAR * 2);
  if (wrong) {
    town.wrongs = town.wrongs.filter(w => w !== wrong); const con = person(town, 'constable'); const inn = findPerson(town, wrong.name);
    const fate = inn && !inn.alive ? (inn.cause === 'hanged' ? 'hanged' : 'cast out') : 'punished';
    log(`The ${kind === 'arson' ? 'fires' : 'thefts'} did not stop with ${wrong.name}. ${town.name} ${fate} the wrong person. ${moodWord(town)[0].toUpperCase() + moodWord(town).slice(1)}.`, 'loss');
    town.unrest = Math.min(100, (town.unrest || 0) + 12); stat('ev', 'wrongsFound');
    if (con) { deed(con, `${fate} the wrong person for ${CRIME_LABEL[kind]}`); if (town.align.moral > 0 && Math.random() < 0.5) { con.role = 'townsfolk'; const nc = elect(town, 'constable', true); log(`${con.name} hands in the constable's badge at ${town.name}. ${nc.name} takes it up.`, 'build'); } }
    if (inn && inn.alive) { inn.role = 'townsfolk'; inn.innocent = false; deed(inn, `was cleared of ${CRIME_LABEL[kind]} too late`); }
    c.witnessed = true; // this time everyone is watching
  }
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
    if (!town.mobilized && !town.workers.some(w => w.job === 'spy')) { const h = hideout(town); if (h >= 0) town.workers.push({ x: h % world.n, y: Math.floor(h / world.n), px: h % world.n, py: Math.floor(h / world.n), target: -1, linger: 0, face: 1, job: 'spy', law: true, name: town.spy.who, runAt: world.tick + 200 }); }
    const spw = town.workers.find(w => w.job === 'spy');
    let notice = 0.012 * (town.align.order > 0 ? 1.5 : 1) * (hasType(town, T.TOWER) ? 1.3 : 1) * ((town.unrest || 0) >= 50 ? 0.6 : 1) * (person(town, 'constable') ? 1 : 0.3) * (spw && spw.run ? 3 : 1);
    if (Math.random() < notice) { const sp = findPerson(town, town.spy.who); if (sp) { log(`A stranger in ${town.name} has been asking about the walls and the granary. ${sp.name}, they call themselves.`, 'arson'); openCase(town, 'spying', sp, town.cy * world.n + town.cx, { witnessed: true }); return; } }
  }
  if (enemies.length) {
    const o = enemies[Math.floor(Math.random() * enemies.length)];
    const losing = town.militia * 2 < o.militia || town.popLeft < o.popLeft * 0.5;
    if (town.militia >= 6 && ((town.unrest || 0) >= 50 || losing) && r < 0.005) {
      const n = Math.min(Math.floor(town.militia / 2), 2 + Math.floor(Math.random() * 4));
      const path = findPath(town.cx, town.cy, o.cx, o.cy); if (!path) return;
      town.militia -= n; stat('ev', 'desertions');
      const who = makePersonIn(town, 'captain', 22 + Math.random() * 25); who.story = `led a company of ${town.name}'s militia and did not like the way the war was going`; town.people.push(who);
      world.warbands.push({ from: town.id, to: o.id, x: town.cx, y: town.cy, px: town.cx, py: town.cy, face: 1, path, pi: 0, size: n, wait: 0, armour: 0, guns: 0, defect: true, captain: who.name });
      log(`${who.name} walks out of ${town.name} in the night with ${n} soldiers, bound for ${o.name}'s lines`, 'war');
      openCase(town, 'treason', who, hideout(town), { witnessed: true, loot: n, flee: o.id, band: true });
      return;
    }
    if (!town.spy && !(o.spyPlanted && world.tick - o.spyPlanted < 3000) && o.militia >= 4 && Math.random() < 0.004) {
      const sp = makePerson(Math.random, 'spy', 20 + Math.random() * 30); // a stranger: no family here sp.story = 'arrived over the hills with a trade in pots and pans and a good memory'; sp.revealed = false;
      town.people.push(sp); town.spy = { from: o.id, who: sp.name, since: world.tick }; o.spyPlanted = world.tick; stat('ev', 'spies');
      { const h = hideout(town); if (h >= 0) town.workers.push({ x: h % world.n, y: Math.floor(h / world.n), px: h % world.n, py: Math.floor(h / world.n), target: -1, linger: 0, face: 1, job: 'spy', law: true, name: sp.name, runAt: world.tick + 200 + Math.floor(Math.random() * 300) }); }
      log(`${o.name} sends someone to live quietly in ${town.name}`, 'war'); // the player sees this; the town does not
      return;
    }
  }
  if (has(town, 'tyrant') && town.popLeft >= 30 && r < 0.004 && person(town, 'constable')) {
    const g = grudgeHolders(town).find(q => q.role === 'townsfolk'); const who = g || innocentOf(town);
    const l = leader(town);
    log(`${l ? l.name : 'The elder'} of ${town.name} has ${who.name} seized ${daypart()} for ${g ? 'carrying a grudge' : 'a word said at the well'}`, 'arson');
    town.unrest = Math.min(100, (town.unrest || 0) + 5); stat('ev', 'seizures');
    openCase(town, 'sedition', who, town.cy * world.n + town.cx, { witnessed: true, political: true });
    return;
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
  const g = grudgeHolders(town).find(q => q.role === 'townsfolk'); if (g && Math.random() < 0.5) { g.role = 'thief'; g.revealed = false; g.story = `never forgave ${g.grudge.why}, and takes what the town owes`; return g; }
  const p = makePersonIn(town, 'thief', 16 + Math.random() * 40); p.story = story; p.revealed = false;
  town.people.push(p); if (town.people.length > 14) town.people = town.people.filter(q => q.alive).slice(-10).concat(town.people.filter(q => !q.alive).slice(-4));
  return p;
}
// The hunt: a constable on the streets, the culprit keeping to the edges, and a roll every sixteen
// ticks that favours militia, towers, a fire warden and a lawful town, and goes against a town so
// restless that people hide them. Most cases close inside a few hundred ticks; some go cold.
function updateCase(town) {
  const c = town.case, who = findPerson(town, c.who);
  if (!who || !who.alive) { town.workers = town.workers.filter(w => !w.law); town.case = null; return; }
  if (c.phase === 'procession') { updateProcession(town); return; }
  const age = world.tick - c.started;
  if (!c.hunt) {
    const con = constableOf(town);
    if (con) { c.hunt = true; log(`Constable ${con.name} takes up the case of ${CRIME_LABEL[c.kind]} in ${town.name}`, 'arson'); }
    else if (age > 300) { town.case = null; town.lawCooldown = world.tick + 400; return; }
    else return;
  }
  if (!town.mobilized) {
    if (!town.workers.some(w => w.job === 'constable')) { const h = campPoint(town); if (h >= 0) town.workers.push({ x: h % world.n, y: Math.floor(h / world.n), px: h % world.n, py: Math.floor(h / world.n), target: -1, linger: 0, face: 1, job: 'constable', law: true }); }
    if (!town.workers.some(w => w.job === 'fugitive') && !c.band) { const spw = town.workers.find(w => w.job === 'spy'); if (spw && c.kind === 'spying') { spw.job = 'fugitive'; spw.target = -1; } else { const h = hideout(town); if (h >= 0) town.workers.push({ x: h % world.n, y: Math.floor(h / world.n), px: h % world.n, py: Math.floor(h / world.n), target: -1, linger: 0, face: 1, job: 'fugitive', law: true }); } }
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
    // Deserters march for the enemy's lines as a band. Past the town's reach, they are gone; caught, the men come home and the captain answers for it.
    const band = world.warbands.find(b => b.defect && b.from === town.id && b.captain === who.name);
    if (!band) { const o = world.towns[c.flee]; defect(town, who, o, c); return; }
    town.workers = town.workers.filter(w => w.job !== 'fugitive');
    if (Math.hypot(band.x - town.cx, band.y - town.cy) > town.R + 12) { const o = world.towns[c.flee]; defect(town, who, o, c); return; }
    p *= 2;
    if (Math.random() < p) {
      world.warbands = world.warbands.filter(b => b !== band); town.militia += band.size;
      const n = world.n; town.workers.push({ x: band.x, y: band.y, px: band.x, py: band.y, target: -1, linger: 0, face: 1, job: 'fugitive', law: true });
      log(`${town.name}'s constable rides down the deserters on the road; ${band.size} soldiers come back shamefaced`, 'win');
      capture(town, c, who);
    }
    return;
  } else if (c.fled === undefined && age > 400 && Math.random() < 0.03) {
    const o = world.towns.filter(t => t !== town && isAlive(t) && Math.hypot(t.cx - town.cx, t.cy - town.cy) < 70).sort((a, b) => Math.hypot(a.cx - town.cx, a.cy - town.cy) - Math.hypot(b.cx - town.cx, b.cy - town.cy))[0];
    if (o) { c.fled = o.id; c.fledAt = world.tick; town.workers = town.workers.filter(w => w.job !== 'fugitive'); log(`${who.name} slips out of ${town.name} on the road to ${o.name}`, 'arson'); return; }
  }
  if (c.fled !== undefined) {
    const o = world.towns[c.fled];
    if (!o || !isAlive(o)) { town.case = null; return; }
    if (world.tick - c.fledAt < 100) return;
    if (o.align.order > 0 || rel(town, o) >= 20) {
      const b = town.bounty && town.bounty.name === who.name ? town.bounty : null;
      if (b) { const paid = Math.min(town.res.coin, b.coin); town.res.coin -= paid; o.res.coin += paid; town.bounty = null; log(`${o.name} sends ${who.name} back to ${town.name} in chains and claims the bounty, ${paid} coin`, 'win'); }
      else log(`${o.name} sends ${who.name} back to ${town.name} in chains`, 'win');
      stat('ev', 'extraditions'); capture(town, c, who);
    }
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
    else if ((c.kind === 'theft' || c.kind === 'escape' || c.kind === 'smuggling') && (who.escaped || 0) >= 2) { town.people = town.people.filter(p => p !== who); gangUp(town, who); }
  }
}
// A thief the law could not hold twice takes to the woods with a few hard cases, and the roads are not safe.
function gangUp(town, who) {
  const n = world.n, h = hideout(town); if (h < 0) return;
  world.firebugs = world.firebugs || [];
  world.firebugs.push({ kind: 'gang', name: who.name, from: town.id, x: h % n, y: Math.floor(h / n), px: h % n, py: Math.floor(h / n), face: 1, target: -1, next: world.tick + 200, town: -1, stuck: 0, size: 3, robbed: 0, camp: -1 });
  stat('ev', 'gangs');
  log(`${who.name} takes to the woods above ${town.name} with ${2} hard cases. The roads out of ${town.name} are not safe.`, 'arson');
}
function updateGang(b, keep) {
  const n = world.n, home = world.towns[b.from];
  if (b.camp < 0) { for (let tries = 0; tries < 20; tries++) { const a = Math.random() * Math.PI * 2, d = (home ? home.R : 6) + 10 + Math.random() * 8; const x = Math.round((home ? home.cx : b.x) + Math.cos(a) * d), y = Math.round((home ? home.cy : b.y) + Math.sin(a) * d); if (x < 2 || y < 2 || x >= n - 2 || y >= n - 2) continue; const i = y * n + x; if (passable(world.type[i]) && isTree(world.type[i]) || world.type[i] === T.SCRUB) { b.camp = i; break; } } if (b.camp < 0) b.camp = b.y * n + b.x; }
  // Prey: a caravan or wagons on the road nearby, else the town's own edge.
  const tr = world.trader;
  if (tr && Math.hypot(tr.x - b.x, tr.y - b.y) <= 6 && world.tick >= b.next) {
    const took = []; for (const k in tr.stock) { const amt = Math.ceil(tr.stock[k] * 0.3); if (amt > 0) { tr.stock[k] -= amt; took.push(`${amt} ${k}`); } } const coin = Math.floor(tr.coin * 0.4); tr.coin -= coin;
    b.robbed++; b.next = world.tick + 300; b.loot = (b.loot || 0) + coin; stat('ev', 'robberies');
    log(`${b.name}'s gang stops the caravan on the road${home ? ' below ' + home.name : ''} and takes ${took.length ? took.join(', ') + ' and ' : ''}${coin} coin`, 'arson');
    world.traderWary = Math.max(world.traderWary || 0, world.tick + 600);
  } else if (world.tick >= b.next) {
    const g = (world.wagons || []).find(w => Math.hypot(w.x - b.x, w.y - b.y) <= 6);
    if (g) { world.wagons = world.wagons.filter(w => w !== g); b.robbed++; b.next = world.tick + 300; stat('ev', 'robberies'); const a = world.towns[g.from]; log(`${b.name}'s gang takes the wagons from ${a ? a.name : 'the road'} and burns what they cannot carry`, 'arson'); }
    else if (home && isAlive(home) && Math.random() < 0.3) { let best = null; for (const k of RES_KINDS) if (k !== 'coin' && k !== 'water' && (!best || home.res[k] > home.res[best])) best = k; if (best && home.res[best] >= 6) { home.res[best] -= 4; b.robbed++; b.next = world.tick + 300; stat('ev', 'robberies'); log(`${b.name}'s gang comes down on ${home.name}'s edge ${daypart()} and makes off with 4 ${best}`, 'arson'); } else b.next = world.tick + 100; }
    else b.next = world.tick + 60;
  }
  // Keep near the camp, or shadow the road when a caravan is about.
  const want = tr && Math.hypot(tr.x - b.x, tr.y - b.y) <= 30 ? tr.y * n + tr.x : b.camp;
  if (want !== b.y * n + b.x) { stepToward(b, want % n, Math.floor(want / n), 1, false); if (b.stall > 4) { b.stall = 0; b.lastCell = -1; } }
  // A posse rides when the gang has robbed enough and the town can spare the militia.
  if (home && isAlive(home) && b.robbed >= 2 && home.militia >= 6 && !world.warbands.some(q => q.posse === b.name) && Math.random() < 0.02) {
    const size = Math.min(home.militia, 4 + Math.floor(Math.random() * 5)); const path = findPath(home.cx, home.cy, b.x, b.y);
    if (path) { home.militia -= size; world.warbands.push({ from: home.id, to: home.id, x: home.cx, y: home.cy, px: home.cx, py: home.cy, face: 1, path, pi: 0, size, wait: 0, armour: 0, guns: 0, posse: b.name }); stat('ev', 'posses'); log(`A posse of ${size} rides out of ${home.name} after ${b.name}'s gang`, 'war'); }
  }
  keep.push(b);
}
// The posse reaches the camp: a fight in the trees.
function posseArrives(band, gang) {
  const home = world.towns[band.from]; if (!home) return;
  const win = Math.random() < 0.55 + 0.05 * band.size;
  if (win) {
    const dead = Math.min(band.size, Math.floor(Math.random() * 2)); applyLosses(home, dead, 'battle'); home.militia += band.size - dead;
    world.firebugs = world.firebugs.filter(g => g !== gang);
    if (Math.random() < 0.5) { log(`${home.name}'s posse corners ${gang.name}'s gang in the trees. ${gang.name} is shot running${dead ? `; ${dead} of the posse will not ride again` : ''}. ${gang.loot ? `${gang.loot} coin comes home in a sack.` : ''}`, 'war'); if (gang.loot) home.res.coin += gang.loot; stat('ev', 'gangsBroken'); }
    else { const p = makePersonIn(home, 'thief', 25 + Math.random() * 25); p.name = gang.name; p.revealed = true; p.escaped = 0; p.story = `ran a gang in the woods until the posse came`; home.people.push(p); if (gang.loot) home.res.coin += gang.loot; log(`${home.name}'s posse takes ${gang.name} alive in the trees and brings them in${dead ? `, ${dead} of the posse dead` : ''}`, 'war'); stat('ev', 'gangsBroken'); if (!home.case) openCase(home, 'banditry', p, home.cy * world.n + home.cx, { witnessed: true, hunt: true }); if (home.case && home.case.who === p.name) { home.case.hunt = true; capture(home, home.case, p); } }
  } else {
    const dead = Math.min(band.size, 1 + Math.floor(Math.random() * 2)); applyLosses(home, dead, 'battle'); home.militia += band.size - dead; gang.camp = -1; gang.next = world.tick + 400;
    log(`${gang.name}'s gang ambushes ${home.name}'s posse in the trees: ${dead} dead, the rest come home, and the gang moves camp`, 'war');
  }
}
// A new elder's first act, in a good town, is to open the gaol.
function amnesty(town, why) {
  const held = (town.people || []).filter(p => p.alive && p.role === 'convict');
  if (!held.length) return;
  for (const p of held) { p.role = 'townsfolk'; p.revealed = true; p.labour = false; town.workers = town.workers.filter(w => w.convict !== p.name); }
  town.unrest = Math.max(0, (town.unrest || 0) - 4); stat('ev', 'amnesties');
  log(`${why}: ${held.map(p => p.name).join(', ')} walk${held.length === 1 ? 's' : ''} out of the ${hasType(town, T.GAOL) ? 'gaol' : 'cellar'} at ${town.name}`, 'good');
}
function defect(town, who, o, c) {
  town.workers = town.workers.filter(w => !w.law); town.case = null; town.lawCooldown = world.tick + 200;
  town.people = town.people.filter(p => p !== who);
  if (o && isAlive(o)) { who.role = 'townsfolk'; who.revealed = true; who.story = `came over from ${town.name} in the war with ${c.loot} soldiers at their back`; o.people.push(who); log(`${who.name} reaches ${o.name}'s lines. ${town.name} will not forget it.`, 'war'); }
  deed(who, `deserted ${town.name} for ${o ? o.name : 'the enemy'}`);
}
// Exiles: cast out, they walk the woods, and in time knock at another town's gate. Winter is hard on them.
function exile(town, who, how) {
  const n = world.n, h = hideout(town); if (h < 0) return;
  world.firebugs = world.firebugs || [];
  world.firebugs.push({ kind: 'exile', name: who.name, from: town.id, x: h % n, y: Math.floor(h / n), px: h % n, py: Math.floor(h / n), face: 1, target: -1, next: world.tick + 400 + Math.floor(Math.random() * 1200), town: -1, stuck: 0, story: who.story, role: who.role });
  stat('ev', 'exiles');
  log(`${who.name} ${how}`, 'arson');
}
// Graveyards grow with the dead; notables get a funeral; a dragon gets a statue.
function updateGraves(town) {
  if (town.popLeft < 20 || (town.deaths || 0) < 10) return;
  const want = Math.min(12, Math.floor(town.deaths / 15)), have = countType(town, T.GRAVE);
  if (have >= want || town.mobilized) return;
  const n = world.n;
  let spot = -1;
  if (have) { for (const g of town.buildings) { if (world.type[g] !== T.GRAVE) continue; for (const [ox, oy] of OFFS8) { const x = g % n + ox, y = Math.floor(g / n) + oy; if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) continue; const i = y * n + x; const t = world.type[i]; if ((t === T.GRASS || t === T.SCRUB || t === T.ASH) && !world.road[i] && world.burnLeft[i] <= 0) { spot = i; break; } } if (spot >= 0) break; } }
  if (spot < 0) { spot = placeCivic(town, T.GRAVE, false); if (spot >= 0) { finishSite(town, spot); log(`${town.name} lays out a graveyard on the edge of town`, 'build'); return; } }
  if (spot < 0) return;
  world.type[spot] = T.GRAVE; world.townOf[spot] = town.id; if (!town.buildings.includes(spot)) town.buildings.push(spot); world.buildingsTotal++; world.buildingsLeft++; dirty.add(spot); forgetCounts(town);
}
function funeral(town, p, hanged) {
  const g = town.buildings.find(i => world.type[i] === T.GRAVE);
  if (g === undefined || town.mobilized) return;
  spawnCrowd(town, g, 25, hanged ? 2 : 3 + Math.floor(Math.random() * 3));
  if (!hanged && Math.random() < 0.5) log(`${town.name} buries ${p.name} ${['under a grey sky', 'in the rain', 'on a bright morning', 'as the snow comes down', 'at dusk'][Math.floor(Math.random() * 5)]}. ${p.story[0].toUpperCase() + p.story.slice(1)}.`, 'loss');
}
function raiseMonument(town, text) {
  if (hasType(town, T.MONUMENT)) return;
  const i = placeCivic(town, T.MONUMENT, true);
  if (i >= 0) { finishSite(town, i); log(text, 'build'); spawnCrowd(town, i, 40, 6); }
}
// Harvest festival: the last weeks of autumn, if the stores are full and nobody is at war. A bonfire in the square.
function updateFestival(town) {
  const year = Math.floor(world.tick / YEAR), inYear = world.tick % YEAR;
  if (town.festivalYear === year || inYear < YEAR * 0.7 || inYear > YEAR * 0.75 || town.mobilized || town.famine || !town.fed || town.popLeft < 25) return;
  if (world.towns.some(o => o !== town && atWar(town, o)) || Math.random() > 0.2) return;
  town.festivalYear = year;
  const centre = town.cy * world.n + town.cx;
  spawnCrowd(town, centre, 70, 6 + Math.floor(town.popLeft / 40));
  town.unrest = Math.max(0, (town.unrest || 0) - 5); stat('ev', 'festivals'); remember(town, 'festival');
  if (town.align.moral > 0 && Math.random() < 0.3) amnesty(town, `Festival mercy at ${town.name}`);
  const [px, py] = cellCenter(centre); popups.push({ x: px, y: py - town.R * cellPx - 14, text: 'FESTIVAL', color: '#ffd166', t0: performance.now(), dur: 3000 });
  for (let k = 0; k < 10; k++) particles.push({ x: px + (Math.random() - 0.5) * cellPx * 2, y: py, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 0, max: 600, color: Math.random() < 0.5 ? '#ffe866' : '#ff6a1f', size: Math.max(2, cellPx * 0.3), grav: -10 });
  log(`${town.name} brings in the harvest and lights a bonfire in the square. ${['There is dancing.', 'The elder makes a speech nobody listens to.', 'Someone falls in the river.', 'The healer treats three burns and a broken ankle.', 'The constable has the night off.'][Math.floor(Math.random() * 5)]}`, 'good');
  if (Math.random() < 0.05) { const homes = town.buildings.filter(i => isHome(world.type[i]) && world.burnLeft[i] <= 0); if (homes.length) { ignite(homes[Math.floor(Math.random() * homes.length)]); log(`The bonfire at ${town.name} gets away from them`, 'alarm'); } }
}
// The healer walks house to house while the plague is in town.
function updateRounds(town) {
  const sick = (town.plagueUntil || 0) > world.tick, h = person(town, 'healer');
  const has_ = town.workers.some(w => w.job === 'rounds');
  if (sick && h && !has_ && !town.mobilized) { const home = town.buildings.find(i => world.type[i] === T.HEALER || world.type[i] === T.HOSPITAL); if (home !== undefined) town.workers.push({ x: home % world.n, y: Math.floor(home / world.n), px: home % world.n, py: Math.floor(home / world.n), target: -1, linger: 0, face: 1, job: 'rounds', crowd: true, until: town.plagueUntil, rounds: true, spread: 0 }); }
}
// Envoys and wedding parties walk between towns; what they carry happens when they arrive.
function sendTraveller(a, b, kind, payload) {
  const path = findPath(a.cx, a.cy, b.cx, b.cy); if (!path) return false;
  world.travellers = world.travellers || [];
  world.travellers.push({ id: (world.travellerSeq = (world.travellerSeq || 0) + 1), kind, from: a.id, to: b.id, x: a.cx, y: a.cy, px: a.cx, py: a.cy, face: 1, path, pi: 0, wait: 0, payload });
  return true;
}
function updateTravellers() {
  const list = world.travellers; if (!list || !list.length) return;
  const n = world.n, keep = [];
  for (const v of list) {
    v.px = v.x; v.py = v.y;
    const a = world.towns[v.from], b = world.towns[v.to];
    if (!a || !b || !isAlive(b)) continue;
    if (world.burnLeft[v.y * n + v.x] > 0) { log(v.kind === 'wedding' ? `The wedding party from ${a.name} is caught by the fire on the road to ${b.name}` : `${a.name}'s envoy to ${b.name} is caught by the fire on the road and never arrives`, 'loss'); setRel(a, b, rel(a, b) - 4); continue; }
    if (v.pi < v.path.length) {
      const next = v.path[v.pi];
      if (world.burnLeft[next] > 0 || !passable(world.type[next])) { if (++v.wait > 40) { const alt = findPath(v.x, v.y, b.cx, b.cy); if (alt) { v.path = alt; v.pi = 0; v.wait = 0; } else if (v.wait > 120) continue; } keep.push(v); continue; }
      if (world.tick % 2) { keep.push(v); continue; } // envoys walk, they do not run
      v.wait = 0; const nx = next % n, ny = (next - nx) / n; if (nx !== v.x) v.face = Math.sign(nx - v.x); v.x = nx; v.y = ny; v.pi++;
      keep.push(v); continue;
    }
    // Arrived.
    const p = v.payload || {};
    if (v.kind === 'envoy') { setRel(a, b, rel(a, b) + (p.delta || 0)); log(p.text, 'diplo'); if (p.delta > 0 && Math.random() < 0.4) spawnCrowd(b, b.cy * n + b.cx, 20, 4); }
    else if (v.kind === 'council') { if (world.council && world.council.host === v.to) world.council.arrived++; }
    else if (v.kind === 'wedding') { setRel(a, b, rel(a, b) + (p.delta || 12)); const bride = makePersonIn(a, 'townsfolk', 18 + Math.random() * 10); bride.story = `came from ${a.name} in a wedding party and never went back`; b.people = b.people || []; b.people.push(bride); if (b.people.length > 14) b.people = b.people.filter(q => q.alive).slice(-10).concat(b.people.filter(q => !q.alive).slice(-4)); log(`${a.name}'s wedding party reaches ${b.name}; ${bride.name} is married at the hall and ${b.name} feasts for a day`, 'diplo'); remember(b, 'wedding', { who: bride.name }); spawnCrowd(b, b.cy * n + b.cx, 40, 6); }
  }
  world.travellers = keep;
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
    if (b.kind === 'gang') { if (world.tick % 2 === 0) updateGang(b, keep); else keep.push(b); continue; }
    if (b.kind === 'exile' && (world.snowCover || 0) > 0.8 && Math.random() < 0.0015) { log(`${b.name}, cast out of ${world.towns[b.from] ? world.towns[b.from].name : 'a town'}, is found frozen in the woods when the snow goes`, 'loss'); stat('ev', 'exileDeaths'); continue; }
    if (b.kind === 'exile' && b.town >= 0) {
      const t = world.towns[b.town];
      if (!t || !isAlive(t)) { b.town = -1; b.next = world.tick + 600; keep.push(b); continue; }
      if (Math.hypot(b.x - t.cx, b.y - t.cy) <= t.R + 2) {
        const from = world.towns[b.from];
        if (t.align.moral >= 0 && (!from || rel(t, from) > -20 || t.align.moral > 0)) {
          const p = makePerson(Math.random, 'townsfolk', 25 + Math.random() * 30); p.name = b.name; p.story = `was cast out of ${from ? from.name : 'another valley'} and taken in here, and is grateful for it`; t.people = t.people || []; t.people.push(p);
          log(`${b.name}, cast out of ${from ? from.name : 'the hills'}, is taken in at ${t.name}`, 'good'); stat('ev', 'exilesTakenIn');
        } else { log(`${t.name} turns ${b.name} away at the gate`, 'arson'); b.town = -1; b.next = world.tick + 800; b.tried = (b.tried || []).concat(t.id); keep.push(b); }
        continue;
      }
      stepToward(b, t.cx, t.cy, 1, false);
      if (b.stall > 6 || ++b.stuck > 600) { b.town = -1; b.next = world.tick + 500; b.stuck = 0; b.stall = 0; b.lastCell = -1; }
      keep.push(b); continue;
    }
    if (b.town < 0 && world.tick >= b.next) {
      const pool = world.towns.filter(t => isAlive(t) && t.popLeft >= 10 && t.id !== b.from && !(b.tried || []).includes(t.id));
      const t = pool.length ? pool[Math.floor(Math.random() * pool.length)] : world.towns[b.from];
      if (t && isAlive(t)) { b.town = t.id; b.target = -1; }
      else b.next = world.tick + 1000;
    }
    if (b.town >= 0 && b.kind === 'exile') { keep.push(b); continue; } // the exile's walk is handled above, next tick
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
  const n = world.n, type = world.type;
  if (w.job === 'spy') {
    if (!town.spy || town.spy.who !== w.name) return false;
    // Snoop around the places worth knowing about; every so often, slip out toward the enemy with what was learned, and come back.
    const e = world.towns[town.spy.from];
    if (!w.run && world.tick >= w.runAt && e) { w.run = true; const d = Math.hypot(e.cx - town.cx, e.cy - town.cy) || 1; const k = Math.min(d - 2, town.R + 10); const tx = Math.max(1, Math.min(n - 2, Math.round(town.cx + (e.cx - town.cx) / d * k))), ty = Math.max(1, Math.min(n - 2, Math.round(town.cy + (e.cy - town.cy) / d * k))); w.target = ty * n + tx; w.lastCell = -1; }
    if (w.run) {
      if (w.target < 0) { w.run = false; w.runAt = world.tick + 400 + Math.floor(Math.random() * 400); }
      else if (w.x === w.target % n && w.y === Math.floor(w.target / n)) { if (++w.linger > 6) { w.linger = 0; w.target = -1; stat('ev', 'courierRuns'); } }
      else { stepToward(w, w.target % n, Math.floor(w.target / n), 1, false); if (w.stall > 8) { w.stall = 0; w.target = -1; } }
      if (w.target < 0 && !w.run) { const h = campPoint(town); w.target = h; }
      return true;
    }
    if (w.target < 0 || (w.x === w.target % n && w.y === Math.floor(w.target / n) && ++w.linger > 8 + Math.floor(Math.random() * 12))) {
      const spots = town.buildings.filter(i => { const t = type[i]; return t === T.BARRACKS || t === T.TOWNHALL || t === T.GRANARY || t === T.WALL || t === T.SILO || t === T.FACTORY; });
      const roads = roadCells(town);
      const pick = spots.length && Math.random() < 0.6 ? spots[Math.floor(Math.random() * spots.length)] : roads.length ? roads[Math.floor(Math.random() * roads.length)] : -1;
      w.target = pick; w.linger = 0;
    }
    if (w.target >= 0 && !(w.x === w.target % n && w.y === Math.floor(w.target / n))) { stepToward(w, w.target % n, Math.floor(w.target / n), 1, false); if (w.stall > 4) { w.stall = 0; w.target = -1; w.lastCell = -1; } }
    return true;
  }
  if (!town.case) return false;
  if (w.job === 'convict') { if (w.target >= 0 && !(w.x === w.target % n && w.y === Math.floor(w.target / n))) { stepToward(w, w.target % n, Math.floor(w.target / n), 1, false); if (w.stall > 6) { w.stall = 0; w.lastCell = -1; } } return true; }
  if (w.job === 'constable' && town.case.phase === 'procession') { const t = town.case.dest; if (!(w.x === t % n && w.y === Math.floor(t / n))) { stepToward(w, t % n, Math.floor(t / n), 1, false); if (w.stall > 6) { w.stall = 0; w.lastCell = -1; } } return true; }
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
// Someone who looks right for it: a townsfolk already in the lists, or a new face.
function innocentOf(town) {
  const pool = (town.people || []).filter(p => p.alive && (p.role === 'townsfolk' || p.role === 'thief' && !p.revealed) && !p.innocent);
  if (pool.length && Math.random() < 0.7) return pool[Math.floor(Math.random() * pool.length)];
  const p = makePersonIn(town, 'townsfolk', 18 + Math.random() * 45); p.story = ['has always kept to themselves', 'argued with the constable once at market', 'was seen near the woods that night, carrying wood', 'is new in town and nobody vouches for them'][Math.floor(Math.random() * 4)];
  town.people.push(p); if (town.people.length > 14) town.people = town.people.filter(q => q.alive).slice(-10).concat(town.people.filter(q => !q.alive).slice(-4));
  return p;
}
function capture(town, c, who) {
  const con = person(town, 'constable');
  town.workers = town.workers.filter(w => !w.law);
  // Nobody saw who did it, so the constable takes whoever looks right. Sometimes that is the wrong person, and the fires go on.
  if (!c.witnessed && !c.innocent && c.kind !== 'sedition' && Math.random() < 0.25 * (town.align.order < 0 ? 1.4 : 1) * (has(town, 'tyrant') ? 1.8 : 1) * (hasType(town, T.TOWER) ? 0.7 : 1)) {
    const inn = innocentOf(town); inn.innocent = true; c.innocent = true; c.realWho = c.who; c.who = inn.name; who = inn;
    town.wrongs = (town.wrongs || []).concat({ name: inn.name, kind: c.kind, tick: world.tick, real: c.realWho });
    stat('ev', 'wrongful');
  }
  town.caught = (town.caught || 0) + 1; stat('ev', 'caught');
  who.revealed = true;
  // A merchant's constable can be bought: the thief walks, the elder's purse is heavier, the town notices.
  if ((c.kind === 'smuggling' || c.kind === 'theft' || c.kind === 'embezzle') && has(town, 'merchant') && Math.random() < 0.4) {
    const l = leader(town), purse = 10 + Math.floor(Math.random() * 30); if (l) l.hoard = (l.hoard || 0) + purse; stat('ev', 'bribes'); town.unrest = Math.min(100, (town.unrest || 0) + 2);
    log(`${con ? `Constable ${con.name}` : 'The constable'} takes ${who.name} for ${CRIME_LABEL[c.kind]}, and ${l ? l.name : 'the elder'} takes a purse of ${purse} coin and looks the other way. ${who.name} is home by supper.`, 'arson');
    who.role = who.role === 'thief' ? 'thief' : 'townsfolk'; town.case = null; town.lawCooldown = world.tick + 200; return;
  }
  if (con) deed(con, `caught ${who.name} for ${CRIME_LABEL[c.kind]}`);
  deed(who, `was caught for ${CRIME_LABEL[c.kind]}`);
  if (c.loot && c.kind === 'embezzle') { const back = Math.floor(c.loot * 0.8); town.res.coin += back; log(`${back} of the ${c.loot} coin is found under ${who.name}'s floor`, 'win'); }
  if (c.kind === 'spying') { const e = world.towns[town.spy ? town.spy.from : -1]; if (e) { setRel(town, e, rel(town, e) - 10); deed(who, `was unmasked as ${e.name}'s spy`); } town.spy = null; stat('ev', 'spiesCaught'); }
  const s = decideSentence(town, c, who);
  const [px, py] = cellCenter(town.cy * world.n + town.cx);
  popups.push({ x: px, y: py - town.R * cellPx - 14, text: 'CAUGHT', color: '#a7e36f', t0: performance.now(), dur: 2200 });
  const where = c.kind === 'arson' ? 'in the woods above the town' : 'at the edge of town';
  const l = leader(town);
  log(`${con ? `Constable ${con.name}` : `${town.name}'s militia`} takes ${who.name} ${where} for ${CRIME_LABEL[c.kind]}. ${l ? l.name : 'The elder'}'s word is ${SENTENCE_LABEL[s]}.`, 'win');
  startProcession(town, c, who, s);
}
// Where a sentence is carried out, and the walk there with the constable at the prisoner's elbow.
function sentenceGround(town, s) {
  const n = world.n;
  if (s === 'execution') { let g = town.buildings.find(i => world.type[i] === T.GALLOWS); if (g === undefined) { g = placeCivic(town, T.GALLOWS, true); if (g >= 0) { finishSite(town, g); log(`A gallows goes up in the square at ${town.name}`, 'build'); } } return g >= 0 ? g : town.cy * n + town.cx; }
  if (s === 'mob') { let best = -1, bd = 99; for (let dy = -town.R - 4; dy <= town.R + 4; dy++) for (let dx = -town.R - 4; dx <= town.R + 4; dx++) { const x = town.cx + dx, y = town.cy + dy; if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) continue; const i = y * n + x; if (isTree(world.type[i]) && world.burnLeft[i] <= 0) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = i; } } } return best >= 0 ? best : town.cy * n + town.cx; }
  if (s === 'gaol') { const g = town.buildings.find(i => world.type[i] === T.GAOL); return g !== undefined ? g : (town.buildings.find(i => world.type[i] === T.TOWNHALL) ?? town.cy * n + town.cx); }
  if (s === 'labour') { const q = town.buildings.find(i => world.type[i] === T.QUARRY); return q !== undefined ? q : town.cy * n + town.cx; }
  if (s === 'banish') { const h = hideout(town); return h >= 0 ? h : town.cy * n + town.cx; }
  const hall = town.buildings.find(i => world.type[i] === T.TOWNHALL); return hall !== undefined ? hall : town.cy * n + town.cx;
}
function startProcession(town, c, who, s) {
  const n = world.n;
  c.phase = 'procession'; c.sentence = s; c.dest = sentenceGround(town, s); c.since = world.tick;
  let fug = town.workers.find(w => w.job === 'fugitive');
  if (!fug) { const h = campPoint(town); if (h >= 0) { fug = { x: h % n, y: Math.floor(h / n), px: h % n, py: Math.floor(h / n), target: -1, linger: 0, face: 1, job: 'fugitive', law: true }; town.workers.push(fug); } }
  if (fug) { fug.job = 'convict'; fug.name = who.name; fug.target = c.dest; fug.lastCell = -1; fug.stall = 0; }
  const con = town.workers.find(w => w.job === 'constable'); if (con) { con.target = c.dest; con.lastCell = -1; }
  if (s === 'execution' || s === 'mob' || s === 'pardon' || s === 'warden') spawnCrowd(town, c.dest, 60, 5 + Math.floor(Math.random() * 5));
  if (town.bounty && town.bounty.name === who.name) town.bounty = null;
}
function updateProcession(town) {
  const c = town.case, who = findPerson(town, c.who), n = world.n;
  if (!who) { town.workers = town.workers.filter(w => !w.law); town.case = null; return; }
  const fug = town.workers.find(w => w.job === 'convict');
  const arrived = !fug || Math.max(Math.abs(fug.x - c.dest % n), Math.abs(fug.y - Math.floor(c.dest / n))) <= 1 || world.tick - c.since > 400 || town.mobilized;
  if (!arrived) return;
  town.workers = town.workers.filter(w => !w.law);
  applySentence(town, c, who, c.sentence);
  town.case = null; town.lawCooldown = world.tick + 200;
}
// Crowds: townsfolk who walk to a spot, stand a while, and go home.
function spawnCrowd(town, dest, linger, count) {
  const n = world.n;
  if (town.mobilized || town.popLeft < 10) return;
  for (let k = 0; k < count; k++) { const h = campPoint(town); if (h < 0) break; town.workers.push({ x: h % n, y: Math.floor(h / n), px: h % n, py: Math.floor(h / n), target: dest, linger: 0, face: 1, job: 'gather', crowd: true, until: world.tick + linger + Math.floor(Math.random() * 20), spread: k }); }
}
function updateCrowd(town, w) {
  const n = world.n;
  if (w.job === 'home') { const hx = w.target % n, hy = Math.floor(w.target / n); if (Math.max(Math.abs(w.x - hx), Math.abs(w.y - hy)) <= 1) return false; stepToward(w, hx, hy, 1, false); return w.stall < 12; }
  if (world.tick >= w.until) { const h = campPoint(town); if (h < 0) return false; w.target = h; w.job = 'home'; w.lastCell = -1; w.stall = 0; return true; }
  if (w.rounds && (w.target < 0 || (w.x === w.target % n && w.y === Math.floor(w.target / n) && ++w.linger > 6))) { const homes = town.buildings.filter(i => isHome(world.type[i])); if (!homes.length) return false; w.target = homes[Math.floor(Math.random() * homes.length)]; w.linger = 0; w.lastCell = -1; }
  if (w.target < 0) return false;
  const tx = w.target % n, ty = Math.floor(w.target / n);
  if (Math.max(Math.abs(w.x - tx), Math.abs(w.y - ty)) <= 1 + (w.spread % 3)) { if (Math.random() < 0.08) w.face = -w.face; return true; } // standing about
  stepToward(w, tx, ty, 1, false); if (w.stall > 8) { w.until = world.tick; }
  return true;
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
    case 'labour': {
      who.role = 'convict'; who.until = world.tick + term; who.labour = true; who.wasRole = wasFirebug ? 'firebug' : 'thief';
      const q = town.buildings.find(i => world.type[i] === T.QUARRY), n = world.n, h = campPoint(town);
      if (h >= 0) town.workers.push({ x: h % n, y: Math.floor(h / n), px: h % n, py: Math.floor(h / n), target: -1, linger: 0, face: 1, job: q !== undefined ? 'quarry' : 'log', gather: true, site: q !== undefined ? q : -1, siteType: q !== undefined ? T.QUARRY : 0, home: h, phase: 'out', work: 0, carry: 0, stuck: 0, convict: who.name });
      log(`${who.name} gets ${Math.round(term / YEAR * 12)} months of hard labour ${q !== undefined ? 'at the quarry' : 'in the timber'} for ${kind}`, 'arson');
      break;
    }
    case 'execution': {
      const feared = c.kind === 'arson' && (who.arsons || 0) >= 2;
      who.alive = false; who.died = world.tick; who.cause = 'hanged'; stat('ev', 'hanged');
      town.unrest = Math.max(0, Math.min(100, (town.unrest || 0) + (feared ? -4 : 6))); town.fear = world.tick + 2000;
      log(`${ln} of ${town.name} has ${who.name} hanged ${hasType(town, T.GALLOWS) ? 'on the gallows' : 'in the square'} for ${kind}${town.workers.filter(w => w.crowd).length >= 4 ? ' with the whole town watching' : ''}. ${feared ? 'Nobody weeps.' : 'People mutter that it was too much.'}`, 'loss');
      remember(town, 'hanging', { who: who.name }); if (!feared) grudgeKin(town, who, 'the law', `the hanging of ${who.name}`);
      if (hasType(town, T.GRAVE)) funeral(town, who, true);
      break;
    }
    case 'banish':
      stat('ev', 'banished'); remember(town, 'exile', { who: who.name }); grudgeKin(town, who, 'the law', `the casting out of ${who.name}`);
      town.people = town.people.filter(p => p !== who);
      if (c.kind === 'arson' && Math.random() < 0.6) roam(town, who, `is cast out of ${town.name} for ${kind} and walks into the hills with what they can carry`);
      else exile(town, who, `is cast out of ${town.name} for ${kind} and walks into the hills with what they can carry`);
      break;
    case 'fine': {
      const fine = 10 + Math.floor(Math.random() * 20); town.res.coin += fine; who.role = 'townsfolk';
      log(`${who.name} pays ${town.name} ${fine} coin for ${kind} and goes home`, 'arson');
      break;
    }
    case 'mob':
      if (Math.random() < 0.5) { who.alive = false; who.died = world.tick; who.cause = 'hanged'; stat('ev', 'hanged'); town.unrest = Math.max(0, Math.min(100, (town.unrest || 0) + 3)); log(`A mob in ${town.name} drags ${who.name} to the old oak for ${kind}. The constable looks away.`, 'loss'); remember(town, 'hanging', { who: who.name }); grudgeKin(town, who, 'the mob', `the night the mob took ${who.name}`); }
      else { who.role = 'townsfolk'; log(`A mob in ${town.name} beats ${who.name} for ${kind} and lets them go, and some of them are laughing`, 'arson'); }
      break;
    case 'pressed': {
      const add = world.towns.some(o => o !== town && atWar(town, o)) ? 2 : 1; town.militia += add; who.role = 'soldier';
      log(`${who.name} is given a spear and a place in ${town.name}'s militia for ${kind}. ${add > 1 ? 'There is a war on; nobody asks questions.' : 'It is cheaper than a gaol.'}`, 'arson');
      break;
    }
    case 'pillory': {
      who.role = 'townsfolk'; const centre = town.cy * world.n + town.cx, n = world.n;
      town.workers.push({ x: centre % n, y: Math.floor(centre / n), px: centre % n, py: Math.floor(centre / n), target: centre, linger: 0, face: 1, job: 'gather', crowd: true, until: world.tick + 150, spread: 0, pilloried: true });
      spawnCrowd(town, centre, 40, 3);
      log(`${who.name} stands a day in the pillory at ${town.name} for ${kind}. The children bring rotten apples.`, 'arson');
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
    // Kin break a gaoled convict out at night; the town posts a bounty and the hunt is on again.
    if (!p.labour && !town.case && Math.random() < 0.003 * (kinOf(town, p).some(q => q.alive) ? 3 : 1)) {
      p.role = p.wasRole || 'thief'; p.revealed = true; p.escaped = (p.escaped || 0) + 1;
      const bounty = 20 + Math.floor(Math.random() * 40); town.bounty = { name: p.name, coin: bounty };
      stat('ev', 'breakouts');
      log(`${kinOf(town, p).some(q => q.alive) ? `${p.name}'s kin break them` : `${p.name} breaks`} out of the ${hasType(town, T.GAOL) ? 'gaol' : 'hall cellar'} at ${town.name} in the night. ${town.name} posts a bounty of ${bounty} coin.`, 'arson');
      openCase(town, 'escape', p, hideout(town), { witnessed: true });
      continue;
    }
    if (world.tick >= p.until) {
      town.workers = town.workers.filter(w => w.convict !== p.name);
      const reformed = Math.random() < 0.7, from = p.labour ? 'the quarry' : 'the gaol';
      p.role = reformed ? 'townsfolk' : p.wasRole || 'townsfolk'; p.revealed = !reformed; p.labour = false;
      log(reformed ? `${p.name} comes out of ${from} at ${town.name} a changed person` : `${p.name} is let out of ${from} at ${town.name} and has learned nothing`, 'build');
    }
  }
}
