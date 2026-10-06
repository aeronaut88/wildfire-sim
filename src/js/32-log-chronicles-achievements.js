/* ───────────────────────── Log, chronicles, achievements ───────────────────────── */

const logEntries = [];
const logEl = document.getElementById('log');
// Every line carries a place (the first town it names, or a cell the caller gives) and, where the
// line is about something moving, what to follow. Click the line to go there; the arrow follows.
function whereOf(text, at) {
  let town = null; for (const t of world.towns) if (text.includes(t.name)) { town = t; break; }
  const where = { at: at !== undefined && at >= 0 ? at : town ? town.cy * world.n + town.cx : -1, follow: null };
  const f = (kind, id) => { where.follow = { kind, id }; };
  if (/dragon/i.test(text) && world.dragon && !world.dragon.slain) f('dragon', 0);
  else if (/caravan/.test(text) && world.trader) f('trader', 0);
  else if (/marches|raiding party|meet .* at the wall|column/.test(text) && world.warbands.length) { const b = world.warbands[world.warbands.length - 1]; f('warband', b.from + ':' + b.to); }
  else if (/bomber lifts off/.test(text) && world.bombers.length) f('bomber', world.bombers[world.bombers.length - 1].from);
  else if (/scrambles a jet/.test(text) && world.fighters.length) f('fighter', world.fighters[world.fighters.length - 1].from);
  else if (/firebug driven out|slips away into the hills|walks into the hills/.test(text) && (world.firebugs || []).length) f('firebug', world.firebugs[world.firebugs.length - 1].name);
  else if (/settlers|refugees/.test(text) && world.settlers) f('settlers', 0);
  else if (/envoy sets out|wedding party sets out/.test(text) && (world.travellers || []).length) f('traveller', world.travellers[world.travellers.length - 1].id);
  else if (/cast out of|takes to the woods|'s gang/.test(text) && (world.firebugs || []).length) { const g = /'s gang/.test(text) ? (world.firebugs || []).find(q => q.kind === 'gang' && text.startsWith(q.name)) : null; f('firebug', g ? g.name : world.firebugs[world.firebugs.length - 1].name); }
  else if (/^Wolves come down|The bear|bear in the deep/.test(text) && (world.packs || []).length) f('pack', world.packs[world.packs.length - 1].t0);
  else if (/calls a council/.test(text) && (world.travellers || []).length) f('traveller', world.travellers[world.travellers.length - 1].id);
  else if (/posse/.test(text) && world.warbands.some(b => b.posse)) { const b = world.warbands.filter(q => q.posse).slice(-1)[0]; f('warband', b.from + ':' + b.to); }
  else if (/^Constable|slips out of|walks out of|goes looking for|starts asking/.test(text) && town) f('law', town.id);
  else if (/fireboat|fishing boat/.test(text) && world.boats.length) f('boat', world.boats[world.boats.length - 1].town);
  else if (/wagons|Wagons/.test(text) && (world.wagons || []).length) f('wagon', 0);
  return where;
}
function log(text, kind, at) {
  const where = whereOf(text, at);
  logEntries.unshift({ tick: world.tick, text, kind: kind || '', at: where.at, follow: where.follow });
  if (logEntries.length > 60) logEntries.length = 60;
  renderLog();
  // Chronicle: every town named in the line remembers it.
  for (const t of world.towns) if (text.includes(t.name)) { t.chronicle = t.chronicle || []; t.chronicle.unshift({ tick: world.tick, text, at: where.at }); if (t.chronicle.length > 40) t.chronicle.length = 40; }
  checkAchievementText(text);
}
// Where a followed thing is right now, in cells, or null when it is gone.
function followPos(f) {
  if (!f) return null;
  const w = world;
  switch (f.kind) {
    case 'dragon': return w.dragon ? [w.dragon.x, w.dragon.y] : null;
    case 'trader': return w.trader ? [w.trader.x, w.trader.y] : null;
    case 'warband': { const [a, b] = f.id.split(':').map(Number); const band = w.warbands.find(q => q.from === a && q.to === b); if (band) return [band.x, band.y]; const bt = w.battles.find(q => q.from === a && q.to === b); return bt && bt.attAgents && bt.attAgents.length ? [bt.attAgents[0].x, bt.attAgents[0].y] : null; }
    case 'bomber': { const p = w.bombers.find(q => q.from === f.id); return p ? [p.x, p.y] : null; }
    case 'fighter': { const p = w.fighters.find(q => q.from === f.id); return p ? [p.x, p.y] : null; }
    case 'firebug': { const b = (w.firebugs || []).find(q => q.name === f.id); return b ? [b.x, b.y] : null; }
    case 'settlers': return w.settlers ? [w.settlers.x, w.settlers.y] : null;
    case 'traveller': { const v = (w.travellers || []).find(q => q.id === f.id); return v ? [v.x, v.y] : null; }
    case 'pack': { const p = (w.packs || []).find(q => q.t0 === f.id) || (w.packs || [])[0]; return p ? [p.x, p.y] : null; }
    case 'law': { const t = w.towns[f.id]; if (!t) return null; const x = t.workers.find(q => q.job === 'fugitive') || t.workers.find(q => q.job === 'constable'); return x ? [x.x, x.y] : null; }
    case 'boat': { const b = w.boats.find(q => q.town === f.id); return b ? [b.x, b.y] : null; }
    case 'wagon': { const g = (w.wagons || [])[0]; return g ? [g.x, g.y] : null; }
  }
  return null;
}
let following = null, followLabel = '';
function followName(f) {
  const w = world;
  switch (f.kind) {
    case 'dragon': return w.dragon ? w.dragon.name || 'the dragon' : 'the dragon';
    case 'trader': return 'the caravan';
    case 'warband': { const [a, b] = f.id.split(':').map(Number); return `${w.towns[a] ? w.towns[a].name : 'a'} column`; }
    case 'bomber': return `${w.towns[f.id] ? w.towns[f.id].name + "'s" : 'a'} bomber`;
    case 'fighter': return `${w.towns[f.id] ? w.towns[f.id].name + "'s" : 'a'} jet`;
    case 'firebug': return f.id;
    case 'settlers': return 'the settlers';
    case 'traveller': { const v = (w.travellers || []).find(q => q.id === f.id); return v ? (v.kind === 'wedding' ? 'the wedding party' : v.kind === 'council' ? 'the envoys' : 'the envoy') : 'the envoy'; }
    case 'pack': { const p = (w.packs || []).find(q => q.t0 === f.id); return p && p.kind === 'bear' ? 'the bear' : 'the wolves'; }
    case 'law': { const t = w.towns[f.id]; return t && t.case ? t.case.who : 'the fugitive'; }
    case 'boat': return 'the boat';
    case 'wagon': return 'the wagons';
  }
  return 'it';
}
const markers = [];
// Centre the view on a cell at a close zoom and flash a ring there.
function goTo(cell, zoom) {
  if (cell < 0) return;
  const n = world.n, x = cell % n, y = Math.floor(cell / n);
  view.zoom = Math.max(view.zoom, zoom || 3);
  const span = canvas.width / view.zoom;
  view.x = (x + 0.5) * cellPx - span / 2; view.y = (y + 0.5) * cellPx - span / 2;
  clampView(); updateZoomHud();
  markers.push({ cell, t0: performance.now(), dur: 2600 });
}
function follow(f, label) {
  following = f; followLabel = label || '';
  const el = $('hudFollow'); if (el) { el.textContent = f ? `following: ${followLabel} · Esc` : ''; el.style.display = f ? '' : 'none'; }
  if (f) { const p = followPos(f); if (p) goTo(Math.round(p[1]) * world.n + Math.round(p[0]), 4); }
}
function stopFollowing() { if (following) follow(null); }
function updateFollow() {
  if (!following) return;
  const p = followPos(following);
  if (!p) { follow(null); return; }
  const span = canvas.width / view.zoom;
  view.x = (p[0] + 0.5) * cellPx - span / 2; view.y = (p[1] + 0.5) * cellPx - span / 2; clampView();
}
function logEntryHtml(e, k) {
  const go = e.at >= 0 ? ' go' : '', fol = e.follow ? `<button class="fol" data-k="${k}" title="follow">➤</button>` : '';
  return `<li class="${e.kind}${go}" data-k="${k}"><span class="t">t${e.tick}</span><span>${e.text}</span>${fol}</li>`;
}
logEl.addEventListener('click', ev => {
  const b = ev.target.closest('button.fol'); const li = ev.target.closest('li');
  if (!li || li.dataset.k === undefined) return;
  const e = logEntries[+li.dataset.k]; if (!e) return;
  if (b) { follow(e.follow, followName(e.follow)); return; }
  if (e.at >= 0) { stopFollowing(); goTo(e.at); }
});

// Achievements live in this browser's local storage, across valleys.
const ACHIEVEMENTS = [
  ['first-fire', '🔥', 'First Light', 'Start a fire', /sounds the alarm|Fire reaches|Lightning|rally|is burning|turn out/],
  ['missile', '🚀', 'Fire Mission', 'Hit something with a missile', /killed by the blast|Fire reaches/],
  ['dragon-seen', '🐉', 'There Be Dragons', 'See a dragon', /has been sighted|is in the valley|shape in the sky|dragon, returns/],
  ['dragon-slain', '⚔️', 'Dragonslayer', 'A town slays a dragon', /SLAYS/],
  ['dragon-driven', '🏹', 'Not Today', 'A militia drives a dragon off', /It will remember/],
  ['town-lost', '💀', 'Ashes', 'Watch a town die', /is gone$|is razed|is empty\. The land is poisoned/],
  ['war', '🛡️', 'To Arms', 'A war is declared', /declares war|marches on|^War\. |declaration of war/],
  ['sacked', '🏚️', 'Sacked', 'A town is sacked', /sacks/],
  ['annex', '👑', 'Conquest', 'A town annexes another', /annexes/],
  ['walls', '🧱', 'Stonework', 'A town raises a wall', /raises a stone wall/],
  ['bomb', '☢️', 'The Bomb', 'Someone builds the bomb', /has built a bomb/],
  ['nuked', '🍄', 'The Ground Will Not Forget', 'The bomb falls', /The bomb falls/],
  ['meteor', '☄️', 'Sky Fall', 'A meteor strikes', /METEOR STRIKE/],
  ['beaver', '🦫', 'Busy Beavers', 'Beavers finish a dam', /finish their dam/],
  ['flood', '🌊', 'High Water', 'The river bursts its banks', /bursts its banks/],
  ['famine', '🌾', 'Lean Years', 'A town goes hungry', /^Famine|scraped bare|goes hungry|No bread in/],
  ['bridge', '🌉', 'Span', 'A bridge is built', /throws a bridge|bridging the river/],
  ['trade', '🛒', 'Open Road', 'Two towns build a trade road', /build a road between them/],
  ['airstrip', '✈️', 'Air Attack', 'A town opens an airstrip', /opens an airstrip/],
  ['tanker', '💧', 'Retardant', 'The tanker makes a drop', /Tanker drops retardant/],
  ['settlers', '🛖', 'New Ground', 'Settlers found a town', /settlers found|is founded by|^A new town:/],
  ['university', '🎓', 'Enlightenment', 'A university is founded', /founds a university/],
  ['factory', '🏭', 'Industry', 'A factory opens', /opens a factory/],
  ['plague', '🤒', 'Pestilence', 'Plague strikes a crowded city', /^Plague|Sickness runs|of plague/],
  ['justice', '⚖️', 'Law and Order', 'A constable catches a criminal', /^Constable .* takes |militia takes .* for /],
  ['gallows', '🪢', 'Rough Justice', 'A town hangs someone', /hanged in the square|hanged on the gallows|drags .* to the old oak/],
  ['wrong', '😶', 'Miscarriage', 'A town punishes the wrong person', /the wrong person/],
  ['quake', '🌋', 'Fault Line', 'An earthquake changes the land', /THE GROUND SHAKES/],
  ['comet', '☄️', 'Second Sun', 'A comet falls', /A SECOND SUN/],
  ['wolves', '🐺', 'Hard Winter', 'Wolves come down', /^Wolves come down/],
  ['council', '🏛️', 'The Council', 'The towns hold a council', /calls a council/],
  ['dynasty', '👑', 'Blood Will Tell', 'An elder\'s kin takes the chair', /takes the chair at/],
  ['civilwar', '🔥', 'House Divided', 'A town fights itself', /^CIVIL WAR/],
  ['posse', '🐎', 'Posse', 'A posse rides out after a gang', /^A posse of/],
  ['healer', '🌿', 'Physician', 'A healer hangs out a sign', /hangs out a healer's sign/],
  ['hospital', '🏥', 'Ward', 'A town opens a hospital', /opens a hospital/],
  ['spy', '🕵️', 'Counter-Intelligence', 'A spy is unmasked', /was unmasked|for spying for the enemy/],
  ['deserter', '🏃', 'Over the Wall', 'Soldiers desert to the enemy', /goes over to/],
  ['firebug', '🔥', 'The Torch Returns', 'A banished arsonist strikes again', /the firebug driven out of/],
  ['crown', '🌲', 'Crown Fire', 'Fire crowns in the timber', /crowning in the timber/],
  ['snow', '❄️', 'First Snow', 'Winter comes', /Snow falls on the valley/],
  ['fireboat', '🚤', 'Harbourmaster', 'A town launches a fireboat', /launches a fireboat/],
  ['refugees', '🧳', 'Exodus', 'Refugees take to the road', /refugees|walk out of what is left/],
];
let achDone = {};
try { achDone = JSON.parse(localStorage.getItem('wildfire.achievements') || '{}'); } catch (e) { achDone = {}; }
const achEl = document.getElementById('ach'), achCountEl = document.getElementById('achCount');
const toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl);
function renderAchievements() {
  const shown = [];
  for (const a of ACHIEVEMENTS) {
    if (a[5]) { // tiered: one badge per family, showing the highest tier reached and the next mark
      const fam = ACHIEVEMENTS.filter(b => b[5] === a[5]); if (fam[0] !== a) continue;
      const got = fam.filter(b => achDone[b[0]]); const top = got[got.length - 1], next = fam[got.length];
      const title = (top ? `${top[2]}: ${top[3]}` : `${a[2].replace(/ I$/, '')}: not yet`) + (next ? ` · next: ${next[3]}` : ' · the top') + (top ? ' (unlocked ' + new Date(achDone[top[0]]).toLocaleDateString() + ')' : '');
      shown.push(`<div class="badge tier ${top ? 'on' : ''}" title="${title}">${a[1]}<small>${top ? ROMAN[top[6] - 1] : ''}</small></div>`);
    } else shown.push(`<div class="badge ${achDone[a[0]] ? 'on' : ''}" title="${a[2]}: ${a[3]}${achDone[a[0]] ? ' (unlocked ' + new Date(achDone[a[0]]).toLocaleDateString() + ')' : ''}">${a[1]}</div>`);
  }
  achEl.innerHTML = shown.join('');
  const n = Object.keys(achDone).filter(k => ACHIEVEMENTS.some(a => a[0] === k)).length;
  achCountEl.textContent = `${n} of ${ACHIEVEMENTS.length} unlocked · stored in this browser`;
}
function unlock(id) {
  if (achDone[id]) return;
  const a = ACHIEVEMENTS.find(x => x[0] === id); if (!a) return;
  achDone[id] = Date.now();
  try { localStorage.setItem('wildfire.achievements', JSON.stringify(achDone)); } catch (e) { /* ignore */ }
  renderAchievements();
  while (toastEl.children.length >= 4) toastEl.firstChild.remove();
  const d = document.createElement('div'); d.innerHTML = `<b>Achievement</b>${a[1]} ${a[2]} <span style="color:var(--ink-dim)">· ${a[3]}</span>`; toastEl.appendChild(d); setTimeout(() => d.remove(), 5200);
}
function checkAchievementText(text) {
  for (const a of ACHIEVEMENTS) if (!achDone[a[0]] && a[4].test(text)) unlock(a[0]);
}
// Tiers: the same badge, earned again at each mark. The badge shows the highest tier reached.
const TIERS = [
  ['burned', '🌳', 'Scorched Earth', 'trees burned', 'treesBurned', [1000, 10000, 100000, 1000000]],
  ['boomtown', '🏙️', 'Boomtown', 'biggest town', 'peakTown', [250, 500, 1000, 2500]],
  ['dynasty', '📜', 'Dynasty', 'years run', 'years', [10, 25, 50, 100]],
  ['dragonbane', '⚔️', 'Dragonbane', 'dragons slain', 'dragonsSlain', [1, 3, 10]],
  ['longarm', '⚖️', 'The Long Arm', 'criminals caught', 'caught', [10, 50, 200]],
  ['silkroad', '🐪', 'Silk Road', 'caravans', 'caravans', [10, 100, 500]],
  ['timber', '🪓', 'Timber!', 'trees felled', 'felled', [100, 1000, 10000]],
  ['breadbasket', '🌾', 'Breadbasket', 'harvests', 'harvests', [100, 1000, 10000]],
  ['builder', '🏗️', 'Master Builder', 'buildings raised', 'built', [100, 1000, 10000]],
  ['stormchaser', '⚡', 'Storm Chaser', 'lightning strikes', 'lightning', [10, 100, 1000]],
  ['uprising', '✊', 'Uprisings', 'elders overthrown', 'overthrows', [1, 5, 20]],
  ['doomsday', '🍄', 'Doomsday', 'bombs dropped', 'nukes', [1, 3, 10]],
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
for (const [id, icon, name, what, , marks] of TIERS) marks.forEach((m, k) => ACHIEVEMENTS.push([`${id}-${k + 1}`, icon, `${name} ${ROMAN[k]}`, `${m.toLocaleString()} ${what}`, /$^/, id, k + 1]));
function tierValue(key) {
  const ev = (world.stats || newStats()).ev;
  if (key === 'years') return world.tick / YEAR;
  return ev[key] || 0;
}
function checkAchievementStats() {
  if (world.tick % 50 !== 0) return;
  { let peak = 0; for (const t of world.towns) if (t.popLeft > peak) peak = t.popLeft; const ev = (world.stats || (world.stats = newStats())).ev; if (peak > (ev.peakTown || 0)) ev.peakTown = peak; }
  for (const [id, , , , key, marks] of TIERS) { const v = tierValue(key); marks.forEach((m, k) => { if (v >= m) unlock(`${id}-${k + 1}`); }); }
  if (world.tick >= 10 * YEAR && !achDone['decade']) unlock('decade');
  if (world.popLeft >= 1000) unlock('thousand');
  if ((world.snowCover || 0) >= 0.95) unlock('whiteout');
}
ACHIEVEMENTS.push(['decade', '📜', 'Ten Years', 'Run a valley for ten years', /$^/], ['thousand', '🏙️', 'Metropolis', 'A thousand people alive at once', /$^/], ['whiteout', '🏔️', 'Whiteout', 'The whole valley under snow', /$^/],
  ['mine', '⛏️', 'Prospector', 'A town digs a mine', /digs an? \w+ mine/], ['uranium', '☢️', 'Glow', 'Somebody digs for uranium', /digs a uranium mine/],
  ['covet', '⚔️', 'Resource War', 'A war declared over a seam', /over the \w+ seams/], ['power', '⚡', 'Lights On', 'A town makes its own power', /water wheel|coal plant|solar array/],
  ['workedout', '🕳️', 'Worked Out', 'A seam is dug to nothing', /is worked out/],
  ['hydro', '💧', 'White Coal', 'A town dams the river for power', /hydroelectric/], ['reactor', '☢️', 'Atoms for Peace', 'A reactor comes online', /brings a reactor online/],
  ['meltdown', '💀', 'Meltdown', 'A reactor burns open', /MELTDOWN/], ['revolt', '✊', 'Revolution', 'The people throw out their elder', /REVOLT in/],
  ['caravan', '🐪', 'Open for Business', 'A trader comes in from beyond the hills', /caravan|traders, heading/], ['robbed', '🗡️', 'Highwaymen', 'A town seizes a caravan', /seizes the caravan/],
  ['oil', '🛢️', 'Black Gold', 'Geologists find oil', /find oil/], ['gold', '💰', 'Gold Rush', 'A town digs a gold mine', /digs a gold mine/], ['mint', '🪙', 'The Mint', 'A town mints its own coin', /mints its first coin/], ['tamed', '🐖', 'Husbandry', 'Hunters bring a wild animal home alive', /home alive, to raise/], ['pasture', '🐄', 'Rancher', 'A town fences a pasture', /fences a pasture/], ['grounded', '🛩️', 'Dry Tanks', 'The tanker is grounded for want of fuel', /Tanker grounded/]);
renderAchievements();
function renderLog() {
  if (!logEntries.length) { logEl.innerHTML = '<li class="empty">all quiet</li>'; return; }
  logEl.innerHTML = logEntries.map((e, k) => logEntryHtml(e, k)).join('');
}

