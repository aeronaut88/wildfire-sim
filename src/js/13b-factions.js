/* ───────────────────────── Factions ─────────────────────────
   Every town is born its own faction. Towns join by conquest (a subject follows its master) or by
   union (allies with a road between them). A faction of two or more towns takes a government from
   its capital's temperament, raises a ruler above the town elders, and holds its towns together:
   they never fight each other and they go to war together. Borders are drawn from each town's
   claim, which grows with its buildings. Rulers age, die, are elected, deposed or succeeded, and
   towns that cannot bear a dictator break away. */
const GOVS = {
  elder: { name: n => n, title: () => 'elder' },
  kingdom: { name: n => `the Kingdom of ${n}`, title: p => (p && p.name && /a$|e$|y$/.test(p.name.split(' ')[0]) ? 'Queen' : 'King') },
  dominion: { name: n => `the ${n} Dominion`, title: () => 'Dictator' },
  republic: { name: n => `the ${n} Republic`, title: () => 'President' },
  horde: { name: n => `the ${n} Horde`, title: () => 'Supreme Leader' },
  theocracy: { name: n => `the Holy ${n}`, title: () => 'High Priest' },
  merchant: { name: n => `the Merchant Republic of ${n}`, title: () => 'Doge' },
};
function factionOf(t) { if (!t) return null; if (!world.factions) world.factions = {}; if (t.faction === undefined || t.faction === null || !world.factions[t.faction]) ensureFaction(t); return world.factions[t.faction]; }
function ensureFaction(t) {
  world.factions = world.factions || {};
  if (t.faction !== undefined && t.faction !== null && world.factions[t.faction] && world.factions[t.faction].towns.includes(t.id)) return world.factions[t.faction];
  let id = t.id; while (world.factions[id] && !world.factions[id].towns.includes(t.id)) id += 1000; // never overwrite someone else's banner
  const f = { id, name: stripName(t.name), color: townColor(t.id), capital: t.id, towns: [t.id], gov: 'elder', ruler: null, founded: world.tick, nextElection: 0, dynasty: null };
  world.factions[id] = f; t.faction = id;
  return f;
}
function factionColor(t) { const f = factionOf(t); return f ? f.color : townColor(t.id); }
function factionName(f) { return GOVS[f.gov].name(f.name); }
function govOf(t) { const f = factionOf(t); return f && f.towns.length > 1 ? f.gov : null; }
function sameFaction(a, b) { return a && b && factionOf(a) === factionOf(b); }
function rulerOf(f) { if (!f.ruler) return null; const t = world.towns[f.ruler.town]; return t && t.people ? t.people.find(p => p.alive && p.name === f.ruler.name) : null; }
function rulerTitle(f) { return GOVS[f.gov].title(rulerOf(f)); }
function factionTowns(f) { return f.towns.map(id => world.towns[id]).filter(t => t && isAlive(t)); }
function factionPop(f) { let p = 0; for (const t of factionTowns(f)) p += t.popLeft; return p; }
function stripName(name) { return name.replace(/\s*\(.*\)$/, ''); }

// A town joins a faction: its old faction empties (or shrinks), and the new one may need a government.
function joinFaction(t, f, why) {
  const old = factionOf(t);
  if (old === f) return;
  if (old) { old.towns = old.towns.filter(id => id !== t.id); if (!old.towns.length) delete world.factions[old.id]; else { if (old.capital === t.id) old.capital = old.towns[0]; if (old.towns.length === 1) { old.gov = 'elder'; old.ruler = null; } } }
  f.towns.push(t.id); t.faction = f.id;
  for (const o of factionTowns(f)) if (o !== t) { delete o.wars[t.id]; delete t.wars[o.id]; setRel(o, t, 100); }
  if (f.towns.length === 2 && f.gov === 'elder') foundGovernment(f, why);
  else if (f.towns.length > 2) log(`${t.name} joins ${factionName(f)}${why ? ', ' + why : ''}`, 'diplo');
}
function leaveFaction(t, why) {
  const old = factionOf(t); if (!old || old.towns.length < 2) return;
  old.towns = old.towns.filter(id => id !== t.id); if (old.capital === t.id) old.capital = old.towns[0];
  t.faction = undefined; const f = ensureFaction(t); t.master = -1; t.name = stripName(t.name);
  log(`${t.name} breaks away from ${factionName(old)}${why ? ': ' + why : ''}`, 'war');
  stat('ev', 'secessions');
  if (old.towns.length === 1) { const cap = world.towns[old.capital]; log(`${factionName(old)} is no more; ${cap.name} stands alone again`, 'diplo'); old.gov = 'elder'; old.ruler = null; }
  return f;
}
// The government a faction takes when it first holds two towns, from the capital's elder and alignment.
function chooseGov(cap) {
  const l = leader(cap), tr = l && l.trait;
  if (tr === 'prophet') return 'theocracy';
  if (tr === 'merchant') return 'merchant';
  if (cap.align.order > 0) return cap.align.moral > 0 ? 'kingdom' : 'dominion';
  return cap.align.moral < 0 ? 'horde' : 'republic';
}
function foundGovernment(f, why) {
  const cap = world.towns[f.capital]; if (!cap) return;
  f.gov = chooseGov(cap); f.founded = world.tick; stat('ev', 'factions');
  const names = factionTowns(f).map(t => t.name);
  if (f.gov === 'republic' || f.gov === 'merchant') { holdElection(f, true); }
  else crownRuler(f, null, 'first');
  const r = rulerOf(f);
  log(`${names.join(' and ')} are now ${factionName(f)}${why ? ', ' + why : ''}. ${r ? `${rulerTitle(f)} ${r.name} ${f.gov === 'kingdom' ? 'is crowned' : f.gov === 'horde' ? 'is acclaimed by the warbands' : f.gov === 'theocracy' ? 'reads the omens and finds them favourable' : f.gov === 'dominion' ? 'takes the hall with the militia at the door' : 'takes the oath'} in ${cap.name}.` : ''}`, 'diplo');
  const [px, py] = cellCenter(cap.cy * world.n + cap.cx); popups.push({ x: px, y: py - cap.R * cellPx - 14, text: f.gov.toUpperCase(), color: f.color, t0: performance.now(), dur: 3500 });
  for (const o of world.towns) if (isAlive(o) && !f.towns.includes(o.id) && f.gov === 'horde') setRel(cap, o, rel(cap, o) - 10); // a horde on the border is nobody's friend
  recomputeClaims();
}
// A new ruler in the capital. For a kingdom the first ruler is the elder's own house; after that the crown passes to kin.
function crownRuler(f, heir, how) {
  const cap = world.towns[f.capital]; if (!cap || !cap.people) return null;
  let p = heir;
  if (!p) {
    const el = leader(cap);
    p = makePersonIn(cap, 'ruler', 30 + Math.random() * 25, f.gov === 'kingdom' && el ? el : null);
    cap.people.push(p); if (cap.people.length > 16) cap.people = cap.people.filter(q => q.alive).slice(-12).concat(cap.people.filter(q => !q.alive).slice(-4));
  }
  p.role = 'ruler'; p.title = GOVS[f.gov].title(p);
  p.story = { kingdom: 'wears the crown as if born to it, which is more or less the case', dominion: 'keeps a list, and the list keeps growing', horde: 'is spoken of in the other towns in a whisper', theocracy: 'hears the will of heaven mostly at mealtimes', republic: 'won the vote and has not stopped mentioning it', merchant: 'counts the coin before the votes' }[f.gov] || p.story;
  f.ruler = { town: cap.id, name: p.name }; if (f.gov === 'kingdom') f.dynasty = p.name.split(' ').slice(-1)[0];
  deed(p, how === 'first' ? `became the first ${p.title} of ${factionName(f)}` : `became ${p.title} of ${factionName(f)}`);
  return p;
}
// Elections: every member town votes for its own elder, weighted by its people and their spirits (or its coin, in a
// merchant republic); the incumbent carries a fifth of every town. A tyrant or a madman in the capital may steal it.
function holdElection(f, first) {
  const towns = factionTowns(f); if (!towns.length) return;
  const cap = world.towns[f.capital];
  const weight = t => f.gov === 'merchant' ? 10 + (t.res.coin || 0) : t.popLeft * (cheerOf(t) / 50);
  const inc = rulerOf(f);
  const tally = towns.map(t => { const el = leader(t); let v = weight(t) * (0.6 + Math.random() * 0.8); if (inc && inc.name === (el && el.name)) v *= 1.2; return { t, el, v }; }).filter(c => c.el);
  if (!tally.length) return;
  tally.sort((a, b) => b.v - a.v);
  let win = tally[0], stolen = false;
  const capEl = leader(cap);
  if (!first && inc && capEl && (capEl.trait === 'tyrant' || capEl.trait === 'madman') && win.el !== inc && Math.random() < 0.5) { stolen = true; win = tally.find(c => c.el === inc) || win; }
  // the winner's elder becomes ruler and stays elder of their town
  if (inc && inc !== win.el) { inc.title = undefined; if (inc.role === 'ruler') inc.role = 'townsfolk'; }
  win.el.title = GOVS[f.gov].title(win.el); f.ruler = { town: win.t.id, name: win.el.name }; f.nextElection = world.tick + 2 * YEAR;
  const total = tally.reduce((a, c) => a + c.v, 0), share = Math.round(100 * win.v / Math.max(1, total));
  stat('ev', 'elections');
  if (first) { deed(win.el, `was elected the first ${win.el.title} of ${factionName(f)}`); return; }
  deed(win.el, stolen ? `held on as ${win.el.title} in a vote nobody believed` : `was elected ${win.el.title} with ${share}% of the vote`);
  if (stolen) { log(`${factionName(f)} goes to the polls and ${win.el.name} of ${win.t.name} is declared the winner. Nobody believes it; ${tally[0].el.name} of ${tally[0].t.name} had the towns behind them. ${moodWord(tally[0].t)[0].toUpperCase() + moodWord(tally[0].t).slice(1)}.`, 'war'); for (const t of towns) { t.cheer = Math.max(0, cheerOf(t) - 5); t.unrest = Math.min(100, (t.unrest || 0) + 8); } stat('ev', 'stolenElections'); }
  else { log(`${factionName(f)} goes to the polls: ${win.el.name} of ${win.t.name} takes it with ${share}% over ${tally[1] ? tally[1].el.name + ' of ' + tally[1].t.name : 'nobody'}. ${pick(['There is dancing in the capital.', 'The losers concede with reasonable grace.', 'The count takes three days and a fistfight.', 'Beer is poured in every member town.'])}`, 'diplo'); for (const t of towns) t.cheer = Math.min(100, cheerOf(t) + 3); }
}
// Succession when a ruler dies, by government.
function succeedRuler(f, dead) {
  const cap = world.towns[f.capital]; if (!cap || !cap.people) return;
  const name = dead ? dead.name : 'the ruler', title = GOVS[f.gov].title(dead);
  if (f.gov === 'republic' || f.gov === 'merchant') { log(`${title} ${name} of ${factionName(f)} is dead. The towns will vote.`, 'diplo'); f.nextElection = world.tick + 100; f.ruler = null; return; }
  if (f.gov === 'kingdom') {
    const sur = f.dynasty || (dead ? dead.name.split(' ').slice(-1)[0] : null);
    const heir = cap.people.filter(p => p.alive && p.role !== 'ruler' && personAge(p) >= 16 && (p.name.split(' ').slice(-1)[0] === sur || p.kin === name || p.parent === name)).sort((a, b) => a.born - b.born)[0];
    if (heir) { const h = crownRuler(f, heir, 'heir'); log(`${title} ${name} is dead. ${h.title} ${h.name}, ${pick(['the eldest', 'the only one left', 'a cousin nobody had thought of', 'still a child by the look of them'])}, takes the throne of ${factionName(f)} in ${cap.name}.`, 'diplo'); return; }
    // No heir: a crisis. Towns go their own way, or a new house takes the crown.
    stat('ev', 'successionCrises');
    const others = factionTowns(f).filter(t => t.id !== f.capital);
    const gone = others.filter(() => Math.random() < 0.5);
    log(`${title} ${name} dies without an heir. ${gone.length ? `${gone.map(t => t.name).join(' and ')} will not kneel to a stranger. ` : ''}${factionName(f)} ${gone.length === others.length && others.length ? 'is broken up' : 'finds a new house for the crown'}.`, 'war');
    for (const t of gone) leaveFaction(t, 'the succession');
    if (world.factions[f.id] && f.towns.length > 1) { f.dynasty = null; const p = crownRuler(f, null, 'crisis'); if (p) log(`${p.title} ${p.name} of a new house is crowned in ${cap.name}`, 'diplo'); }
    return;
  }
  if (f.gov === 'horde') {
    const strong = factionTowns(f).sort((a, b) => (b.militia + (b.soldiers || 0)) - (a.militia + (a.soldiers || 0)))[0];
    const p = crownRuler(f, null, 'seized'); if (!p) return; p.story = `came out of ${strong.name} with the warbands at ${pick(['his', 'her', 'their'])} back`;
    log(`${title} ${name} is dead and the warbands of ${strong.name} ride into ${cap.name} before the body is cold. ${p.name} is Supreme Leader now. ${pick(['Nobody argues.', 'Those who argued are not seen again.', 'The old guard is sent to the mines.'])}`, 'war');
    return;
  }
  if (f.gov === 'theocracy') { const p = crownRuler(f, null, 'omen'); if (p) log(`${title} ${name} goes to the gods. The omens name ${p.name} ${p.title} of ${factionName(f)}: ${pick(['a crow on the hall roof', 'a fish with two tails', 'a dream three people had on the same night', 'the way the smoke went'])}.`, 'diplo'); return; }
  // dominion: the captain of the militia takes it
  const p = crownRuler(f, null, 'seized'); if (p) log(`${title} ${name} is dead. ${p.name} of the militia takes the hall in ${cap.name} and does not call it a coup.`, 'war');
}
function depose(f, how) {
  const cap = world.towns[f.capital], old = rulerOf(f);
  const angry = factionTowns(f).sort((a, b) => (b.unrest || 0) - (a.unrest || 0))[0];
  if (old) { old.role = 'ousted'; old.title = undefined; if (how === 'coup' && Math.random() < 0.6) { old.alive = false; old.cause = 'shot in the coup'; } else if (how === 'assassin') { old.alive = false; old.cause = 'assassinated'; } }
  const p = crownRuler(f, null, how); if (!p) return;
  if (how === 'coup') { p.story = `led the coup from ${angry.name} and trusts nobody from there`; log(`COUP in ${cap.name}: the militia of ${angry.name} march on the hall. ${old ? `${GOVS[f.gov].title(old)} ${old.name} ${old.alive ? 'is put over the wall in a nightshirt' : 'is shot on the steps'}.` : ''} ${p.name} is ${p.title} of ${factionName(f)} by nightfall.`, 'war'); for (const t of factionTowns(f)) t.unrest = Math.max(0, (t.unrest || 0) - 20); stat('ev', 'coups'); }
  else { log(`${GOVS[f.gov].title(old)} ${old ? old.name : ''} of ${factionName(f)} is found dead ${daypart()}. ${pick(['A knife.', 'Poison, says the healer.', 'A fall from a window that does not open.'])} ${p.name} takes the hall before anyone asks questions.`, 'war'); stat('ev', 'assassinations'); }
}
// Purges: a horde calms its towns by thinning them.
function purge(f) {
  const cap = world.towns[f.capital], r = rulerOf(f); let dead = 0;
  for (const t of factionTowns(f)) { const k = Math.max(1, Math.round(t.popLeft * 0.01)); applyLosses(t, k, 'purged'); dead += k; t.unrest = Math.max(0, (t.unrest || 0) - 15); t.cheer = Math.max(0, cheerOf(t) - 4); }
  stat('ev', 'purges', dead); if (r) deed(r, `purged ${dead} across the horde`);
  log(`${r ? 'Supreme Leader ' + r.name : 'The horde'} purges the towns of ${factionName(f)}: ${dead} taken ${daypart()} and not seen again. ${pick(['The streets are quiet after.', 'Nobody speaks of it.', 'The lists were long this year.'])}`, 'war');
}
// Unions: two allied towns with a road between them and no war unite under the bigger.
function maybeUnions() {
  const towns = world.towns.filter(isAlive);
  for (let i = 0; i < towns.length; i++) for (let j = i + 1; j < towns.length; j++) {
    const a = towns[i], b = towns[j];
    if (sameFaction(a, b) || rel(a, b) < 80 || atWar(a, b) || a.popLeft < 30 || b.popLeft < 30) continue;
    if (has(a, 'hermit') || has(b, 'hermit')) continue;
    const key = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id, road = world.tradeRoads && world.tradeRoads[key];
    if (!road || road.building) continue;
    if (world.towns.some(o => o !== a && o !== b && (atWar(o, a) !== atWar(o, b)) && isAlive(o)) && Math.random() < 0.7) continue; // one is at war and the other is not: not yet
    if (Math.random() > 0.015) continue;
    const fa = factionOf(a), fb = factionOf(b);
    const [big, small] = factionPop(fa) >= factionPop(fb) ? [fa, fb] : [fb, fa];
    const ea = leader(a), eb = leader(b);
    const members = factionTowns(small);
    log(`${a.name} and ${b.name} unite under one banner${ea && eb ? `; ${ea.name} and ${eb.name} shake on it at the ${Math.random() < 0.5 ? 'ford' : 'market'}` : ''}`, 'diplo');
    stat('ev', 'unions');
    for (const t of members) joinFaction(t, big, 'by the union');
    recomputeClaims();
    return;
  }
}
function updateFactions() {
  if (world.tick % 50 !== 17) return;
  world.factions = world.factions || {};
  for (const t of world.towns) ensureFaction(t);
  // dead capitals: the faction falls apart
  for (const id in world.factions) {
    const f = world.factions[id]; if (f.towns.length < 2) continue;
    const cap = world.towns[f.capital];
    if (!cap || !isAlive(cap)) { log(`${factionName(f)} falls with ${cap ? cap.name : 'its capital'}. Its towns go their own ways.`, 'war'); for (const t of factionTowns(f)) if (t.id !== f.capital) leaveFaction(t, null); continue; }
    const towns = factionTowns(f);
    // the family holds together: no wars inside, friends inside, wars shared
    for (const a of towns) for (const b of towns) if (a !== b) { if (atWar(a, b)) { delete a.wars[b.id]; delete b.wars[a.id]; } if (rel(a, b) < 100) setRel(a, b, 100); if (a.master >= 0 && b.id === a.master && f.capital !== b.id) {} }
    for (const a of towns) for (const o of world.towns) if (isAlive(o) && !f.towns.includes(o.id) && atWar(a, o)) for (const b of towns) if (b !== a && !atWar(b, o) && !has(b, 'peacemaker')) declareWar(b, o, `with ${factionName(f)}`);
    // the ruler
    const r = rulerOf(f);
    if (!r && f.ruler) { f.ruler = null; succeedRuler(f, { name: 'the ruler' }); }
    else if (!r && !f.ruler && (f.gov === 'republic' || f.gov === 'merchant') && world.tick >= f.nextElection) holdElection(f, false);
    if (f.ruler && (f.gov === 'republic' || f.gov === 'merchant') && world.tick >= f.nextElection) holdElection(f, false);
    if (r && (f.gov === 'dominion' || f.gov === 'horde')) {
      const unrest = towns.reduce((a, t) => a + (t.unrest || 0), 0) / towns.length;
      if (f.gov === 'dominion' && unrest > 60 && Math.random() < 0.03) depose(f, 'coup');
      else if (Math.random() < 0.0008) depose(f, 'assassin');
      if (f.gov === 'horde' && world.tick - (f.lastPurge || f.founded) > 3 * YEAR && Math.random() < 0.05) { f.lastPurge = world.tick; purge(f); }
    }
    // towns that cannot bear it break away
    if (f.gov === 'dominion' || f.gov === 'horde') for (const t of towns) if (t.id !== f.capital && (t.unrest || 0) >= 80 && Math.random() < 0.03) { const nf = leaveFaction(t, 'the people have had enough'); if (nf) { declareWar(cap, t, 'to bring it back'); break; } }
    // government flavour
    for (const t of towns) {
      if (f.gov === 'dominion') t.unrest = Math.min(100, (t.unrest || 0) + 0.15);
    }
  }
  maybeUnions();
  if (world.tick - (world.claimTick || -1000) >= 200) recomputeClaims();
}
// Deaths that reach a ruler: killNotable and agePeople take anyone; the next check notices the empty seat.
function rulerDied(town, p) { for (const id in world.factions || {}) { const f = world.factions[id]; if (f.ruler && f.ruler.town === town.id && f.ruler.name === p.name) { f.ruler = null; succeedRuler(f, p); } } }

// ── Claims and borders ──
// A town's claim is the ground around what it has built: every building, field and work site holds the cells
// within a few of it, a little more for a town with a hall or a great many buildings. The nearest building
// wins where claims overlap. A faction's land need not be one piece: an outlying quarry holds its own patch.
function claimPad(t) { return 2 + (hasType(t, T.TOWNHALL) ? 1 : 0) + Math.min(2, Math.floor(t.buildings.length / 80)); }
function recomputeClaims() {
  const n = world.n, N = n * n;
  if (!world.claim || world.claim.length !== N) world.claim = new Int16Array(N);
  world.claim.fill(-1);
  const best = new Float32Array(N).fill(Infinity);
  for (const t of world.towns) {
    if (!isAlive(t)) continue;
    const pad = claimPad(t), cells = t.buildings.concat(Object.keys(t.sites || {}).map(Number));
    for (const bcell of cells) {
      const bx = bcell % n, by = (bcell - bx) / n; const ty = world.type[bcell];
      if (!(isBuilding(ty) || ty === T.FARM || ty === T.PASTURE || ty === T.SITE || ty === T.SHELL)) continue;
      for (let dy = -pad; dy <= pad; dy++) { const y = by + dy; if (y < 0 || y >= n) continue; for (let dx = -pad; dx <= pad; dx++) { const x = bx + dx; if (x < 0 || x >= n) continue; const d = Math.hypot(dx, dy); if (d > pad + 0.5) continue; const i = y * n + x; if (d < best[i]) { best[i] = d; world.claim[i] = t.id; } } }
    }
  }
  world.claimTick = world.tick; borderDirty = true;
}
function claimedByOther(town, i) { if (!world.claim) return false; const c = world.claim[i]; if (c < 0 || c === town.id) return false; const o = world.towns[c]; return o && isAlive(o) && !sameFaction(o, town); }
let borderCanvas = null, borderDirty = true, borderPx = 0;
function drawBorders(ctx) {
  if (!world.claim) return;
  const n = world.n, size = n * cellPx;
  if (!borderCanvas) borderCanvas = document.createElement('canvas');
  if (borderDirty || borderPx !== cellPx || borderCanvas.width !== size) {
    borderPx = cellPx; borderCanvas.width = size; borderCanvas.height = size; borderDirty = false;
    const b = borderCanvas.getContext('2d'); b.clearRect(0, 0, size, size);
    b.lineWidth = Math.max(1.5, cellPx * 0.3); b.globalAlpha = 0.9; b.lineCap = 'square';
    const claim = world.claim, colorOf = {}, facOf = {};
    for (const t of world.towns) { facOf[t.id] = factionOf(t) ? factionOf(t).id : t.id; colorOf[t.id] = factionColor(t); }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, c = claim[i]; if (c < 0) continue;
      const fc = facOf[c];
      const px = x * cellPx, py = y * cellPx;
      b.strokeStyle = colorOf[c]; b.beginPath();
      if (x === n - 1 || claim[i + 1] < 0 || facOf[claim[i + 1]] !== fc) { b.moveTo(px + cellPx, py); b.lineTo(px + cellPx, py + cellPx); }
      if (x === 0 || claim[i - 1] < 0 || facOf[claim[i - 1]] !== fc) { b.moveTo(px, py); b.lineTo(px, py + cellPx); }
      if (y === n - 1 || claim[i + n] < 0 || facOf[claim[i + n]] !== fc) { b.moveTo(px, py + cellPx); b.lineTo(px + cellPx, py + cellPx); }
      if (y === 0 || claim[i - n] < 0 || facOf[claim[i - n]] !== fc) { b.moveTo(px, py); b.lineTo(px + cellPx, py); }
      b.stroke();
    }
  }
  ctx.drawImage(borderCanvas, 0, 0);
}

// ── Through-trade: wagons that cross a neighbour's roads to reach a town further on. ──
function updateThroughTrade() {
  if (world.tick % 400 !== 123 || !world.tradeRoads) return;
  const adj = {}; const roads = [];
  for (const k in world.tradeRoads) { const r = world.tradeRoads[k]; if (r.building) continue; (adj[r.a] = adj[r.a] || []).push({ to: r.b, path: r.path }); (adj[r.b] = adj[r.b] || []).push({ to: r.a, path: r.path.slice().reverse() }); roads.push(r); }
  const towns = world.towns.filter(t => isAlive(t) && adj[t.id]);
  let sent = 0;
  for (const a of towns) {
    if (sent >= 2) break;
    // breadth-first over the road graph from a, remembering the way
    const seen = { [a.id]: null }, queue = [a.id], via = { [a.id]: [] };
    while (queue.length) { const id = queue.shift(); for (const e of adj[id] || []) if (seen[e.to] === undefined) { seen[e.to] = id; via[e.to] = via[id].concat(id); queue.push(e.to); } }
    for (const idStr in seen) {
      const id = +idStr, b = world.towns[id]; if (b === a || !b || !isAlive(b)) continue;
      const hops = via[id].length; if (hops < 2) continue; // a direct road has its own wagons
      const key = 'long-' + Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
      if (world.wagons.some(w => w.key === key) || atWar(a, b) || (a.plagueUntil || 0) > world.tick || (b.plagueUntil || 0) > world.tick) continue;
      if (jobCount(a, 'trader') < 1 && jobCount(b, 'trader') < 1) continue; // somebody has to drive it
      // anything worth carrying?
      let worth = false; for (const k of RES_KINDS) { if (k === 'water' || k === 'coin' || k === 'meals') continue; if (resCap(b, k) - (b.res[k] || 0) > 6 && (a.res[k] || 0) - resCap(a, k) * 0.4 > 6) { worth = true; break; } }
      if (!worth) continue;
      // join the road paths
      const chain = via[id].concat(id); let path = [];
      for (let k = 0; k + 1 < chain.length; k++) { const e = adj[chain[k]].find(q => q.to === chain[k + 1]); path = path.concat(k ? e.path.slice(1) : e.path); }
      if (path.length > 240) continue;
      world.wagons.push({ key, path, pi: 0, x: a.cx, y: a.cy, px: a.cx, py: a.cy, face: 1, from: a.id, to: b.id, via: chain.slice(1, -1), long: true });
      stat('ev', 'longWagons'); sent++;
      if (Math.random() < 0.5) log(`A wagon sets out from ${a.name} for ${b.name} by way of ${chain.slice(1, -1).map(i => world.towns[i].name).join(' and ')}`, 'build');
      break;
    }
  }
}
