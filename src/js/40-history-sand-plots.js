/* ───────────────────────── History: sand plots ─────────────────────────
   Every fifty ticks each town's numbers are sampled. The chart stacks the towns as layers from
   each one's founding to its end, so a dead town shows as a band that narrows to nothing. */
const HIST_METRICS = [['pop', 'population'], ['homes', 'homes'], ['militia', 'militia'], ['coin', 'coin'], ['food', 'food'], ['stock', 'stockpile']];
const histState = { metric: 'pop', hidden: new Set(), hideDead: false, hover: -1 };
let histLastLen = -1, histControlsKey = '';
function sampleHistory() {
  const H = world.history || (world.history = { ticks: [], towns: {} });
  H.ticks.push(world.tick);
  const idx = H.ticks.length - 1;
  for (const t of world.towns) {
    let r = H.towns[t.id];
    if (!r) r = H.towns[t.id] = { name: t.name, from: idx, pop: [], homes: [], militia: [], coin: [], food: [], stock: [] };
    r.name = t.name;
    const st = world.stats || newStats(); if (!st.max || t.popLeft > st.max.pop) st.max = { name: t.name, pop: t.popLeft, tick: world.tick };
    r.pop.push(t.popLeft); r.homes.push(t.housesLeft); r.militia.push(t.militia); r.coin.push(t.res ? t.res.coin : 0); r.food.push(foodSupply(t));
    r.stock.push(t.res ? (t.res.wood + t.res.stone + t.res.iron + t.res.copper + t.res.coal + (t.res.oil || 0) + (t.res.uranium || 0)) : 0);
  }
}
function townColor(id) { const h = (id * 137.508 + 20) % 360; return `hsl(${h}, 68%, 56%)`; }
function histTownIds() {
  const H = world.history; if (!H) return [];
  return Object.keys(H.towns).map(Number).filter(id => !histState.hidden.has(id)).filter(id => !histState.hideDead || (world.towns[id] && isAlive(world.towns[id])));
}
function drawHistory() {
  const c = $('histChart'); if (!c) return;
  const g = c.getContext('2d'), W = c.width, Hh = c.height;
  g.fillStyle = '#0b0807'; g.fillRect(0, 0, W, Hh);
  const H = world.history;
  if (!H || H.ticks.length < 2) { g.fillStyle = '#6a5c4e'; g.font = '11px IBM Plex Mono, monospace'; g.fillText('not enough history yet', 12, 24); renderHistControls(); return; }
  const n = H.ticks.length, m = histState.metric, ids = histTownIds();
  const totals = new Float64Array(n);
  for (const id of ids) { const r = H.towns[id], v = r[m] || []; for (let k = 0; k < v.length; k++) totals[r.from + k] += Number.isFinite(v[k]) ? v[k] : 0; }
  let max = 1; for (let k = 0; k < n; k++) max = Math.max(max, totals[k]);
  const padL = 36, padB = 16, padT = 6, padR = 4;
  const x = k => padL + (W - padL - padR) * (n === 1 ? 0 : k / (n - 1)), y = v => padT + (Hh - padT - padB) * (1 - v / max);
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let yr = YEAR; yr <= H.ticks[n - 1]; yr += YEAR) { const k = H.ticks.findIndex(t => t >= yr); if (k < 0) break; g.beginPath(); g.moveTo(x(k), padT); g.lineTo(x(k), Hh - padB); g.stroke(); }
  const base = new Float64Array(n);
  for (const id of ids) {
    const r = H.towns[id], v = r[m] || []; if (!v.length) continue;
    g.beginPath();
    const val = k => (Number.isFinite(v[k]) ? v[k] : 0);
    for (let k = 0; k < v.length; k++) g.lineTo(x(r.from + k), y(base[r.from + k] + val(k)));
    for (let k = v.length - 1; k >= 0; k--) g.lineTo(x(r.from + k), y(base[r.from + k]));
    g.closePath(); g.fillStyle = townColor(id); g.globalAlpha = histState.hover === id ? 1 : 0.8; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke();
    for (let k = 0; k < v.length; k++) base[r.from + k] += val(k);
  }
  g.strokeStyle = '#3a2e27'; g.beginPath(); g.moveTo(padL, padT); g.lineTo(padL, Hh - padB); g.lineTo(W - padR, Hh - padB); g.stroke();
  g.fillStyle = '#9a8a78'; g.font = `${W > 600 ? 12 : 9}px IBM Plex Mono, monospace`; g.textAlign = 'right';
  g.fillText(String(Math.round(max)), padL - 3, padT + 8); g.fillText('0', padL - 3, Hh - padB);
  if (W > 600) { // room for a few more rungs and the year marks
    g.textAlign = 'right'; for (let q = 1; q < 4; q++) { const v = max * q / 4; g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(padL, y(v), W - padL - padR, 1); g.fillStyle = '#9a8a78'; g.fillText(String(Math.round(v)), padL - 3, y(v) + 4); }
    g.textAlign = 'center'; for (let yr = YEAR; yr <= H.ticks[n - 1]; yr += YEAR) { const k = H.ticks.findIndex(t => t >= yr); if (k < 0) break; g.fillText('Y' + (yr / YEAR + 1), x(k), Hh - 4); }
  }
  g.textAlign = 'left'; g.fillText('t' + H.ticks[0], padL, Hh - 4);
  g.textAlign = 'right'; g.fillText(`t${H.ticks[n - 1]} · Y${Math.floor(H.ticks[n - 1] / YEAR) + 1}`, W - padR, Hh - 4);
  histLastLen = n;
  renderHistControls();
}
function renderHistFacts() {
  const el = $('histFacts'); if (!el) return;
  const st = world.stats || newStats(), ev = st.ev || {};
  const row = (k, v, wide) => `<div class="row${wide ? ' wide' : ''}"><span>${k}</span><b>${v}</b></div>`;
  const alive = world.towns.filter(isAlive);
  const oldestTown = alive.slice().sort((a, b) => a.founded - b.founded)[0];
  const richest = alive.slice().sort((a, b) => (b.res ? b.res.coin : 0) - (a.res ? a.res.coin : 0))[0];
  const mostFires = world.towns.slice().sort((a, b) => (b.fires || 0) - (a.fires || 0))[0];
  const old = oldestResident();
  const dragons = Object.keys(st.dragons || {});
  const deadliest = Object.entries(st.deaths || {}).sort((a, b) => b[1] - a[1])[0];
  let livestock = 0; for (const t of world.towns) if (t.livestock) for (const k of LIVESTOCK) livestock += t.livestock[k] || 0;
  const yrs = Math.floor(world.tick / YEAR);
  el.innerHTML = `<h4>the valley</h4>` +
    row('climate', world.climate ? world.climate.name : 'temperate') + row('years', yrs) + row('towns founded', world.towns.length) + row('standing', alive.length) +
    (oldestTown ? row('oldest standing', `${oldestTown.name}, ${Math.floor((world.tick - oldestTown.founded) / YEAR)}y`) : '') +
    (st.max ? row('biggest ever', `${st.max.name}, ${st.max.pop}`) : '') + (richest && richest.res ? row('wealthiest', `${richest.name}, ${richest.res.coin} coin`) : '') +
    (mostFires && mostFires.fires ? row('most fires', `${mostFires.name}, ${mostFires.fires}`) : '') +
    (old ? `<div class="row wide"><span>oldest resident</span><b>${old.p.name} of ${old.town.name}, ${personAge(old.p)}</b></div><div class="wide">${old.p.name} ${old.p.story}.</div>` : '') +
    `<h4>the sky and the earth</h4>` +
    row('dragon visits', ev.dragons || 0) + row('unique dragons', dragons.length) + (dragons.length ? `<div class="wide">${dragons.join(' · ')}</div>` : '') +
    row('slain / driven off', `${ev.dragonsSlain || 0} / ${ev.dragonsDriven || 0}`) + row('beaver dams', ev.beavers || 0) + row('floods', ev.floods || 0) + row('meteors', ev.meteors || 0) +
    row('lightning strikes', ev.lightning || 0) + row('missiles', ev.missiles || 0) + row('cells burned', world.burnedCount) + row('trees felled', ev.felled || 0) +
    `<h4>the beasts</h4>` +
    row('animals hunted', ev.hunted || 0) + row('brought home alive', ev.tamed || 0) + row('born on pastures', ev.animalsBorn || 0) + row('lost to fire', ev.animalsBurned || 0) + row('wild herds now', (world.herds || []).length) + row('livestock now', livestock) +
    `<h4>the people</h4>` +
    row('dead', world.deaths) + (deadliest ? row('deadliest cause', `${deadliest[0]}, ${deadliest[1]}`) : '') + row('notable deaths', ev.notableDeaths || 0) + row('fire alarms', ev.alarms || 0) +
    row('wars / battles', `${ev.wars || 0} / ${ev.battles || 0}`) + row('sacks / annexations', `${ev.sacks || 0} / ${ev.annexes || 0}`) + row('nukes / meltdowns', `${ev.nukes || 0} / ${ev.meltdowns || 0}`) +
    row('famines / plagues', `${ev.famines || 0} / ${ev.plagues || 0}`) + row('fields withered', ev.fieldsWithered || 0) + row('revolts', ev.overthrows || 0) + row('crimes', `${ev.crimes || 0} <span class="dim">(${ev.caught || 0} caught, ${ev.hanged || 0} hanged, ${ev.banished || 0} banished)</span>`) + row('spies / deserters', `${ev.spies || 0} <span class="dim">(${ev.spiesCaught || 0} caught)</span> / ${ev.desertions || 0}`) + row('smuggled goods', ev.smuggled || 0) + row('saved by healers', `${ev.healed || 0} <span class="dim">(${ev.foraged || 0} herbs gathered)</span>`) + row('firebugs loose', `${ev.firebugsLoose || 0} <span class="dim">(${ev.firebugFires || 0} fires set)</span>`) + row('work roads laid', ev.workRoads || 0) + row('wells run dry', ev.wellsDry || 0) + row('buildings raised', ev.built || 0) + row('harvests', ev.harvests || 0) + row('caravans / markets', `${ev.caravans || 0} / ${ev.markets || 0}`) + row('caravans robbed', ev.caravansRobbed || 0) + row('coin minted from gold', ev.minted || 0) + row('coin paid between towns', ev.tradeCoin || 0);
}
function renderHistControls() {
  renderHistFacts();
  const H = world.history || { towns: {} };
  const ids = Object.keys(H.towns).map(Number);
  const key = histState.metric + '|' + ids.map(id => id + ':' + (histState.hidden.has(id) ? 0 : 1) + ':' + (world.towns[id] && isAlive(world.towns[id]) ? 1 : 0) + ':' + H.towns[id].name).join(',') + '|' + histState.hideDead;
  if (key === histControlsKey) return; histControlsKey = key;
  $('histMetrics').innerHTML = HIST_METRICS.map(([k, label]) => `<button data-m="${k}" class="${histState.metric === k ? 'on' : ''}">${label}</button>`).join('');
  for (const b of $('histMetrics').children) b.addEventListener('click', () => { histState.metric = b.dataset.m; drawHistory(); });
  $('histTowns').innerHTML = ids.map(id => { const alive = world.towns[id] && isAlive(world.towns[id]); return `<button data-id="${id}" class="${histState.hidden.has(id) ? 'off' : ''} ${alive ? '' : 'dead'}" title="click to hide, double-click to see alone"><span class="sw" style="background:${townColor(id)}"></span>${H.towns[id].name}</button>`; }).join('');
  for (const b of $('histTowns').children) {
    const id = +b.dataset.id;
    b.addEventListener('click', () => { if (histState.hidden.has(id)) histState.hidden.delete(id); else histState.hidden.add(id); drawHistory(); });
    b.addEventListener('dblclick', () => { const solo = ids.every(o => o === id || histState.hidden.has(o)); histState.hidden = new Set(solo ? [] : ids.filter(o => o !== id)); drawHistory(); });
    b.addEventListener('mouseenter', () => { histState.hover = id; drawHistory(); });
    b.addEventListener('mouseleave', () => { histState.hover = -1; drawHistory(); });
  }
}
$('histHideDead').addEventListener('change', ev => { histState.hideDead = ev.target.checked; drawHistory(); });
$('histChart').addEventListener('mousemove', ev => {
  const H = world.history; if (!H || H.ticks.length < 2) return;
  const c = $('histChart'), r = c.getBoundingClientRect(), W = c.width, padL = 36, padR = 4;
  const k = Math.round(((ev.clientX - r.left) / r.width * W - padL) / (W - padL - padR) * (H.ticks.length - 1));
  if (!Number.isFinite(k) || k < 0 || k >= H.ticks.length) return;
  const m = histState.metric, parts = [];
  for (const id of histTownIds()) { const t = H.towns[id]; const i = k - t.from; if (i >= 0 && i < t[m].length) parts.push(`${t.name} ${t[m][i]}`); }
  $('histRead').textContent = `t${H.ticks[k]} · Y${Math.floor(H.ticks[k] / YEAR) + 1} · ${parts.join(' · ') || 'no towns yet'}`;
});
$('histChart').addEventListener('mouseleave', () => { $('histRead').textContent = ''; });

// Full-screen history: the same panel, moved into an overlay and drawn big.
let histFull = false;
function toggleHistFull() {
  const group = $('histChart').closest('.group'), overlay = $('histFull');
  histFull = !histFull;
  if (histFull) { group.dataset.home = ''; group.parentElement.dataset.histHome = '1'; histHome = group.parentElement; overlay.appendChild(group); overlay.classList.add('on'); $('histFullBtn').textContent = 'close'; const c = $('histChart'); c.width = Math.min(1600, window.innerWidth - 60); c.height = Math.max(300, window.innerHeight - 230); }
  else { overlay.classList.remove('on'); histHome.appendChild(group); $('histFullBtn').textContent = 'full screen'; const c = $('histChart'); c.width = 340; c.height = 200; }
  histLastLen = -1; drawHistory();
}
let histHome = null;
$('histFullBtn').addEventListener('click', toggleHistFull);
window.addEventListener('resize', () => { if (histFull) { const c = $('histChart'); c.width = Math.min(1600, window.innerWidth - 60); c.height = Math.max(300, window.innerHeight - 230); histLastLen = -1; drawHistory(); } });
const SPEEDS = [1, 2, 4, 8, 15, 30, 60, 120, 240];
function nudgeSpeed(dir) {
  const cur = params.speed; let k = SPEEDS.findIndex(v => v >= cur); if (k < 0) k = SPEEDS.length - 1;
  if (dir > 0) k = Math.min(SPEEDS.length - 1, SPEEDS[k] > cur ? k : k + 1); else k = Math.max(0, SPEEDS[k] >= cur ? k - 1 : k);
  params.speed = SPEEDS[k]; $('speed').value = params.speed; $('speedOut').textContent = `${params.speed} t/s`;
  popups.push({ x: canvas.width / 2 / view.zoom + view.x, y: 30 / view.zoom + view.y, text: `${params.speed} T/S`, color: '#ffb627', t0: performance.now(), dur: 900 });
}
window.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT') return;
  switch (ev.key) {
    case '[': nudgeSpeed(-1); break;
    case ']': nudgeSpeed(1); break;
    case '-': case '_': zoomAt(1 / 1.5, canvas.width / 2, canvas.height / 2); break;
    case '=': case '+': zoomAt(1.5, canvas.width / 2, canvas.height / 2); break;
    case '0': resetView(); break;
    case 'ArrowLeft': case 'a': case 'A': ev.preventDefault(); panBy(canvas.width * 0.08, 0); break;
    case 'ArrowRight': case 'd': case 'D': ev.preventDefault(); panBy(-canvas.width * 0.08, 0); break;
    case 'ArrowUp': case 'w': case 'W': ev.preventDefault(); panBy(0, canvas.height * 0.08); break;
    case 'ArrowDown': case 's': case 'S': ev.preventDefault(); panBy(0, -canvas.height * 0.08); break;
    case 'h': case 'H': showTab('History'); break;
    case 'Escape': if (histFull) toggleHistFull(); else if (cardTown >= 0) closeCard(); break;
    case 'Control': if (!ev.repeat) toggleClickMode(); break;
    case ' ': ev.preventDefault(); setRunning(!running); break;
    case 'm': case 'M': launchMissile(randomFuelCell()); break;
    case 'l': case 'L': lightning(randomFuelCell()); break;
    case 'n': case 'N': reset(); break;
    case '.': setRunning(false); step(); break;
  }
});

function reset(n, seed) {
  n = n || world.n;
  missiles.length = 0; explosions.length = 0; bolts.length = 0; particles.length = 0; popups.length = 0;
  generate(n, seed);
  layout();
  syncSeedUi();
  const parts = [];
  for (const t of world.towns) parts.push(`${t.name}, ${alignName(t.align)} (pop ${t.popTotal}${t.hasStation ? `, ${t.trucks.length} engine${t.trucks.length > 1 ? 's' : ''}` : ''})`);
  log(world.towns.length ? parts.join(' · ') : 'No towns in this wilderness');
  log(`Valley #${world.seed}, ${world.n} x ${world.n}`);
  setRunning(true);
}

// Seed field, Load / Copy link, and the address bar.
const seedEl = $('seed'), seedCopyBtn = $('seedCopy');
function syncSeedUi() {
  seedEl.value = String(world.seed);
  hudEls.seed.textContent = '#' + world.seed;
}
function loadSeedFromField() {
  const raw = seedEl.value.trim();
  if (!raw) return;
  let seed;
  if (/^\d+$/.test(raw)) seed = Number(raw) >>> 0;
  else { seed = 2166136261; for (let k = 0; k < raw.length; k++) { seed ^= raw.charCodeAt(k); seed = Math.imul(seed, 16777619); } seed >>>= 0; } // words work too
  reset(world.n, seed);
}
$('seedApply').addEventListener('click', loadSeedFromField);
seedEl.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); loadSeedFromField(); seedEl.blur(); } ev.stopPropagation(); });
seedCopyBtn.addEventListener('click', async () => {
  const u = new URL(location.href);
  u.searchParams.set('seed', String(world.seed)); u.searchParams.set('size', String(world.n));
  const text = u.toString();
  try { await navigator.clipboard.writeText(text); } catch (e) { seedEl.value = text; seedEl.select(); }
  seedCopyBtn.textContent = 'Copied'; seedCopyBtn.classList.add('ok');
  setTimeout(() => { seedCopyBtn.textContent = 'Copy link'; seedCopyBtn.classList.remove('ok'); }, 1400);
});

let resizeTimer = 0;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });

(function buildLegend() {
  const items = [
    ['grass0', 'grass'], ['pine', 'pine (small)'], ['oak', 'oak (large)'], ['water0', 'water'],
    ['rock', 'rock'], ['fire1', 'burning'], ['crown1', 'crown fire'], ['ash', 'ash'], ['stump', 'burnt tree'],
    ['house0', 'house'], ['station', 'fire station'], ['rubble', 'rubble'], ['dirt', 'firebreak / road'],
    ['crew', 'fire crew'], ['truck', 'engine'], ['hangar', 'airbase'], ['plane', 'air tanker'],
    ['bigpine', 'big pine'], ['road', 'road'], ['wagon', 'settlers'], ['worker', 'townsfolk'], ['soldier', 'militia'], ['wall', 'stone wall'],
    ['raider', 'raiders'], ['tank', 'tank'], ['cannon', 'field gun'], ['bomber', 'bomber'], ['boat', 'fishing boat'], ['fireboat', 'fireboat'],
    ['oreIron', 'iron seam'], ['oreCopper', 'copper seam'], ['oreCoal', 'coal seam'], ['oreUranium', 'uranium seam'], ['oreGold', 'gold seam'], ['lumberyard', 'lumberyard'], ['quarry', 'quarry'], ['mine', 'mine'], ['well', 'well'], ['wheel', 'water wheel'], ['plant', 'coal plant'], ['solar', 'solar array'], ['hydro', 'hydro dam'], ['nuclear', 'reactor'], ['derrick', 'oil derrick'], ['shaft', 'mine shaft'], ['survey', 'surveyed deposit'], ['trader', 'trade caravan'], ['logger', 'logger'], ['miner', 'miner'], ['hunter', 'hunter'], ['carrier', 'water carrier'], ['deer', 'deer'], ['boar', 'wild boar'], ['sheep', 'sheep'], ['cow', 'cattle'], ['pig', 'pig'], ['chicken', 'chicken'], ['pasture', 'pasture'], ['reeds', 'marsh reeds'], ['sand', 'desert sand'], ['cactus', 'cactus'], ['jungle', 'jungle tree'], ['site', 'building site'], ['farm1', 'growing field'], ['granary', 'granary'], ['felled', 'fresh stump'],
    ['birch', 'birch'], ['scrub', 'dry scrub'], ['snag', 'dead snag'], ['farm', 'farm'], ['bridge', 'bridge'], ['dam', 'beaver dam'], ['mud', 'mud flat'], ['beaver', 'beavers'], ['tenement', 'tenement'], ['barracks', 'barracks'], ['forge', 'forge'], ['factory', 'factory'], ['university', 'university'], ['tower', 'watchtower'], ['silo', 'silo'], ['townhall', 'town hall'], ['dragon0', '...'],
  ];
  const leg = $('legend');
  for (const [k, label] of items) {
    const s = document.createElement('span');
    const c = SPR16[k].cloneNode();
    c.getContext('2d').drawImage(SPR16[k], 0, 0);
    s.appendChild(c);
    s.appendChild(document.createTextNode(label));
    leg.appendChild(s);
  }
})();

