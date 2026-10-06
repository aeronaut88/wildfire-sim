/* ───────────────────────── Log, chronicles, achievements ───────────────────────── */

const logEntries = [];
const logEl = document.getElementById('log');
function log(text, kind) {
  logEntries.unshift({ tick: world.tick, text, kind: kind || '' });
  if (logEntries.length > 60) logEntries.length = 60;
  renderLog();
  // Chronicle: every town named in the line remembers it.
  for (const t of world.towns) if (text.includes(t.name)) { t.chronicle = t.chronicle || []; t.chronicle.unshift({ tick: world.tick, text }); if (t.chronicle.length > 40) t.chronicle.length = 40; }
  checkAchievementText(text);
}

// Achievements live in this browser's local storage, across valleys.
const ACHIEVEMENTS = [
  ['first-fire', '🔥', 'First Light', 'Start a fire', /sounds the alarm|Fire reaches|Lightning strike/],
  ['missile', '🚀', 'Fire Mission', 'Hit something with a missile', /killed by the blast|Fire reaches/],
  ['dragon-seen', '🐉', 'There Be Dragons', 'See a dragon', /dragon, has been sighted|dragon, returns/],
  ['dragon-slain', '⚔️', 'Dragonslayer', 'A town slays a dragon', /SLAYS/],
  ['dragon-driven', '🏹', 'Not Today', 'A militia drives a dragon off', /drives the dragon off/],
  ['town-lost', '💀', 'Ashes', 'Watch a town die', /is gone$|is razed|is empty\. The land is poisoned/],
  ['war', '🛡️', 'To Arms', 'A war is declared', /declares war/],
  ['sacked', '🏚️', 'Sacked', 'A town is sacked', /sacks/],
  ['annex', '👑', 'Conquest', 'A town annexes another', /annexes/],
  ['walls', '🧱', 'Stonework', 'A town raises a wall', /raises a stone wall/],
  ['bomb', '☢️', 'The Bomb', 'Someone builds the bomb', /has built a bomb/],
  ['nuked', '🍄', 'The Ground Will Not Forget', 'The bomb falls', /The bomb falls/],
  ['meteor', '☄️', 'Sky Fall', 'A meteor strikes', /METEOR STRIKE/],
  ['beaver', '🦫', 'Busy Beavers', 'Beavers finish a dam', /finish their dam/],
  ['flood', '🌊', 'High Water', 'The river bursts its banks', /bursts its banks/],
  ['famine', '🌾', 'Lean Years', 'A town goes hungry', /^Famine in/],
  ['bridge', '🌉', 'Span', 'A bridge is built', /throws a bridge|bridging the river/],
  ['trade', '🛒', 'Open Road', 'Two towns build a trade road', /build a road between them/],
  ['airstrip', '✈️', 'Air Attack', 'A town opens an airstrip', /opens an airstrip/],
  ['tanker', '💧', 'Retardant', 'The tanker makes a drop', /Tanker drops retardant/],
  ['settlers', '🛖', 'New Ground', 'Settlers found a town', /settlers found/],
  ['university', '🎓', 'Enlightenment', 'A university is founded', /founds a university/],
  ['factory', '🏭', 'Industry', 'A factory opens', /opens a factory/],
  ['plague', '🤒', 'Pestilence', 'Plague strikes a crowded city', /^Plague/],
  ['justice', '⚖️', 'Law and Order', 'A constable catches a criminal', /^Constable .* takes |militia takes .* for /],
  ['gallows', '🪢', 'Rough Justice', 'A town hangs someone', /hanged in the square|drags .* to the old oak/],
  ['healer', '🌿', 'Physician', 'A healer hangs out a sign', /hangs out a healer's sign/],
  ['hospital', '🏥', 'Ward', 'A town opens a hospital', /opens a hospital/],
  ['spy', '🕵️', 'Counter-Intelligence', 'A spy is unmasked', /was unmasked|for spying for the enemy/],
  ['deserter', '🏃', 'Over the Wall', 'Soldiers desert to the enemy', /goes over to/],
  ['firebug', '🔥', 'The Torch Returns', 'A banished arsonist strikes again', /the firebug driven out of/],
  ['crown', '🌲', 'Crown Fire', 'Fire crowns in the timber', /crowning in the timber/],
  ['snow', '❄️', 'First Snow', 'Winter comes', /Snow falls on the valley/],
  ['fireboat', '🚤', 'Harbourmaster', 'A town launches a fireboat', /launches a fireboat/],
  ['refugees', '🧳', 'Exodus', 'Refugees take to the road', /refugees leave the ruins/],
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
  ['caravan', '🐪', 'Open for Business', 'A trader comes in from beyond the hills', /caravan appears/], ['robbed', '🗡️', 'Highwaymen', 'A town seizes a caravan', /seizes the caravan/],
  ['oil', '🛢️', 'Black Gold', 'Geologists find oil', /find oil/], ['gold', '💰', 'Gold Rush', 'A town digs a gold mine', /digs a gold mine/], ['mint', '🪙', 'The Mint', 'A town mints its own coin', /mints its first coin/], ['tamed', '🐖', 'Husbandry', 'Hunters bring a wild animal home alive', /home alive, to raise/], ['pasture', '🐄', 'Rancher', 'A town fences a pasture', /fences a pasture/], ['grounded', '🛩️', 'Dry Tanks', 'The tanker is grounded for want of fuel', /Tanker grounded/]);
renderAchievements();
function renderLog() {
  if (!logEntries.length) { logEl.innerHTML = '<li class="empty">all quiet</li>'; return; }
  logEl.innerHTML = logEntries.map(e => `<li class="${e.kind}"><span class="t">t${e.tick}</span><span>${e.text}</span></li>`).join('');
}

