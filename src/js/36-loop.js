/* ───────────────────────── Loop ───────────────────────── */

let running = true, tickAcc = 0, lastT = 0, lastWater = 0, lastFire = 0, lastTownsAt = 0;
const $ = id => document.getElementById(id);
const statEls = {
  tick: $('statTick'), burning: $('statBurning'), burned: $('statBurned'), trees: $('statTrees'),
  buildings: $('statBuildings'), people: $('statPeople'), crews: $('fCrews'), trucks: $('fTrucks'), air: $('fAir'),
  weather: $('statWeather'), weatherTile: $('statWeatherTile'),
};
let lastWeatherShown = '';
let lastStatForce = '';

// Hover a readout tile for the ledger behind the number.
const statTipEl = $('statTip');
let statTipFor = null;
function tipRows(obj, limit, total) {
  const entries = Object.entries(obj || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '<div class="dim">nothing yet</div>';
  return entries.slice(0, limit).map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}${total ? ` <span class="dim">${Math.round(v / total * 100)}%</span>` : ''}</b></div>`).join('') + (entries.length > limit ? `<div class="dim">and ${entries.length - limit} more</div>` : '');
}
function statTipHtml(kind) {
  const st = world.stats || newStats(), ev = st.ev || {};
  const row = (k, v) => `<div class="row"><span>${k}</span><b>${v}</b></div>`;
  if (kind === 'people') return `<h4>${world.deaths} dead, by cause</h4>${tipRows(st.deaths, 10, world.deaths)}<h4>by town</h4>${tipRows(st.deathsTown, 8, world.deaths)}<h4>alive</h4>${row('in the valley', world.popLeft)}${row('ever lived here', world.popTotal)}${world.towns.filter(isAlive).sort((a, b) => b.popLeft - a.popLeft).map(t => row(t.name, `${t.popLeft} <span class="dim">${Math.round(t.popLeft / Math.max(1, world.popLeft) * 100)}% of the living · ${Math.round(t.popLeft / Math.max(1, t.popTotal) * 100)}% of its own</span>`)).join('')}`;
  if (kind === 'buildings') return `<h4>${world.buildingsLost} lost, by cause</h4>${tipRows(st.lost, 8, world.buildingsLost)}<h4>by town</h4>${tipRows(st.lostTown, 8, world.buildingsLost)}<h4>standing</h4>${row('now', world.buildingsLeft)}${row('ever built', world.buildingsTotal)}`;
  if (kind === 'tick') return `<h4>Year ${Math.floor(world.tick / YEAR) + 1}, ${['spring', 'summer', 'autumn', 'winter'][season()]}</h4>${row('ticks', world.tick)}${row('towns founded', world.towns.length)}<h4>the sky and the earth</h4>${row('lightning strikes', `${ev.lightning || 0} <span class="dim">(${ev.lightningNatural || 0} natural, ${Math.max(0, (ev.lightning || 0) - (ev.lightningNatural || 0))} yours)</span>`)}${row('missiles', ev.missiles || 0)}${row('meteors', ev.meteors || 0)}${row('floods', ev.floods || 0)}${row('beaver colonies', ev.beavers || 0)}${row('dragon visits', `${ev.dragons || 0} <span class="dim">(${ev.dragonsSlain || 0} slain, ${ev.dragonsDriven || 0} driven off)</span>`)}${row('stolen by dragons', (ev.dragonLoot || 0) + ' coin')}${row('won from hoards', (ev.dragonHoards || 0) + ' coin')}<h4>the people</h4>${row('fire alarms', ev.alarms || 0)}${row('wars declared', ev.wars || 0)}${row('battles', ev.battles || 0)}${row('towns sacked', ev.sacks || 0)}${row('annexations', ev.annexes || 0)}${row('bombers built', ev.bombersBuilt || 0)}${row('bomber sorties', ev.bombers || 0)}${row('bombers lost', ev.bombersLost || 0)}${row('jets built', `${ev.fightersBuilt || 0} <span class="dim">(${ev.fightersLost || 0} lost, ${ev.dragonsJet || 0} dragons downed)</span>`)}${row('nukes launched', ev.nukes || 0)}${row('meltdowns', ev.meltdowns || 0)}${row('famines', ev.famines || 0)}${row('plagues', ev.plagues || 0)}${row('caravans', `${ev.caravans || 0} <span class="dim">(${ev.markets || 0} markets, ${ev.caravansRobbed || 0} robbed)</span>`)}<h4>the beasts</h4>${row('wild herds', (world.herds || []).length)}${row('animals hunted', ev.hunted || 0)}${row('brought home alive', ev.tamed || 0)}${row('born on pastures', ev.animalsBorn || 0)}${row('lost to fire', ev.animalsBurned || 0)}`;
  if (kind === 'beasts') {
    const byKind = {}; for (const h of world.herds || []) if (h.size > 0) { const k = h.kind === 'fowl' ? 'grouse' : h.kind === 'sheep' ? 'wild sheep' : h.kind === 'boar' ? 'wild boar' : h.kind; byKind[k] = (byKind[k] || 0) + h.size; }
    const kept = {}; for (const t of world.towns) if (t.livestock) for (const k of LIVESTOCK) if (t.livestock[k]) kept[`${t.name}: ${LIVESTOCK.filter(q => t.livestock[q]).map(q => `${t.livestock[q]} ${q}`).join(', ')}`] = 1;
    return `<h4>wild, by kind</h4>${tipRows(byKind, 8)}${row('herds', (world.herds || []).length)}<h4>kept</h4>${Object.keys(kept).length ? Object.keys(kept).map(k => `<div>${k}</div>`).join('') : '<div class="dim">no livestock yet</div>'}<h4>the tally</h4>${row('hunted', ev.hunted || 0)}${row('brought home alive', ev.tamed || 0)}${row('born on pastures', ev.animalsBorn || 0)}${row('lost to fire', ev.animalsBurned || 0)}`;
  }
  if (kind === 'trees') { const share = {}; const N = world.n * world.n; for (let i = 0; i < N; i++) if (world.type[i] !== T.WATER) share[BIOME_NAMES[world.biome[i]]] = (share[BIOME_NAMES[world.biome[i]]] || 0) + 1; return `<h4>the forest</h4>${row('standing', world.treeCount)}${row('felled by loggers', ev.felled || 0)}${row('cells burned', world.burnedCount)}<h4>biomes</h4>${tipRows(share, 5, N)}`; }
  if (kind === 'burned' || kind === 'burning') return `<h4>fire</h4>${row('burning now', world.burning.filter(i => world.burnLeft[i] > 0).length)}${row('cells burned', world.burnedCount)}${row('fire alarms', ev.alarms || 0)}${row('lightning strikes', ev.lightning || 0)}${row('missiles', ev.missiles || 0)}${row('meteors', ev.meteors || 0)}`;
  if (kind === 'weather') return `<h4>${WEATHER[world.weather.kind].label}, ${['spring', 'summer', 'autumn', 'winter'][season()]}</h4>${row('wind', params.windStrength.toFixed(2))}${row('fire danger', fireDanger())}${row('snow cover', Math.round((world.snowCover || 0) * 100) + '%')}${row('floods', ev.floods || 0)}${world.dryWinter && season() === 3 ? '<div class="dim">a hard dry winter</div>' : ''}`;
  return '';
}
function showStatTip(el) {
  const kind = [...el.classList].find(c => c !== 'stat' && !WEATHER[c]) || 'tick';
  statTipFor = kind;
  statTipEl.innerHTML = statTipHtml(kind);
  statTipEl.style.display = 'block';
  statTipEl.style.left = Math.max(0, Math.min(el.offsetLeft, el.offsetParent.clientWidth - 370)) + 'px';
  const above = el.offsetTop - statTipEl.offsetHeight - 4; // the readout sits under the map, so open upward when there is room
  statTipEl.style.top = (above >= -el.offsetParent.offsetTop + 8 ? above : el.offsetTop + el.offsetHeight + 4) + 'px';
}
function hideStatTip() { statTipFor = null; statTipEl.style.display = 'none'; }
for (const el of document.querySelectorAll('.readout .stat')) {
  el.addEventListener('mouseenter', () => showStatTip(el));
  el.addEventListener('mouseleave', hideStatTip);
  el.addEventListener('click', () => { if (statTipFor) hideStatTip(); else showStatTip(el); });
}
let statTipRefresh = 0;
function updateStats() {
  if (statTipFor && ++statTipRefresh % 30 === 0) { const el = document.querySelector('.readout .stat.' + statTipFor); if (el) showStatTip(el); }
  let burningNow = 0;
  for (const i of world.burning) if (world.burnLeft[i] > 0) burningNow++;
  statEls.tick.textContent = world.tick;
  statEls.burning.textContent = burningNow;
  statEls.burned.innerHTML = `${world.burnedCount}<small> cells</small>`;
  statEls.trees.textContent = world.treeCount;
  statEls.buildings.innerHTML = `${world.buildingsLeft}<small> lost ${world.buildingsLost}</small>`;
  statEls.people.innerHTML = `${world.popLeft}<small> dead ${world.deaths}</small>`;
  if (world.tick % 10 === 0 || !statEls.beastsKey) { let wild = 0, tame = 0; for (const h of world.herds || []) wild += Math.max(0, h.size); for (const t of world.towns) if (t.livestock) for (const k of LIVESTOCK) tame += t.livestock[k] || 0; const key = wild + '|' + tame; if (key !== statEls.beastsKey) { statEls.beastsKey = key; $('statBeasts').innerHTML = `${wild}<small> wild · ${tame} kept</small>`; } }
  if (world.weather.kind !== lastWeatherShown) {
    lastWeatherShown = world.weather.kind;
    statEls.weather.textContent = WEATHER[world.weather.kind].label;
    statEls.weatherTile.className = 'stat weather ' + world.weather.kind;
  }
  let crews = 0, trucksAlive = 0, trucksTotal = 0;
  for (const t of world.towns) { crews += t.crews.length; trucksTotal += t.trucks.length; for (const tr of t.trucks) if (tr.alive) trucksAlive++; }
  const force = `${crews}|${trucksAlive}/${trucksTotal}|${world.air ? world.air.sorties + (world.air.plane ? 'f' : '') : '-'}`;
  if (force !== lastStatForce) {
    lastStatForce = force;
    statEls.crews.textContent = crews;
    statEls.trucks.textContent = trucksTotal ? `${trucksAlive}${trucksTotal > trucksAlive ? ` (${trucksTotal - trucksAlive} lost)` : ''}` : 'none';
    statEls.air.textContent = world.air ? `${world.air.sorties}${world.air.plane ? ' (airborne)' : ''}` : 'none';
  }
}

let frameErrors = 0;
function frame(now) {
  // Whatever happens inside a tick, the page must keep animating: an uncaught error here would
  // otherwise end the animation loop and leave the valley frozen at its last tick.
  try {
    if (!lastT) lastT = now;
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;

    if (running) {
      tickAcc += dt * params.speed;
      let steps = Math.floor(tickAcc);
      tickAcc -= steps;
      if (steps > 60) steps = 60;
      for (let k = 0; k < steps; k++) step();
    }
    if (running) { flyPlane(dt); flyDragon(dt); scrambleFighters(world.dragon); flyFighters(dt); flyBombers(dt); } // paused means paused, dragons included

    if (now - lastWater > 700) { lastWater = now; waterFrame ^= 1; redrawWater(); }
    if (now - lastFire > 110) { lastFire = now; fireFrame = (fireFrame + 1) % 3; }

    render(now, Math.min(1, tickAcc));
    updateStats();
    updateHud();
    updateTip();
    refreshCard(now);
    if ((now - lastTownsAt) > 400) { lastTownsAt = now; updateTownsPanel(); if (world.history && world.history.ticks.length !== histLastLen && (histFull || document.querySelector('.tabpane[data-tab="History"].on'))) drawHistory(); }
  } catch (e) {
    console.error(e);
    if (++frameErrors <= 3) log(`A hiccup in the simulation (${(e && e.message || String(e)).slice(0, 80)}); carrying on`, 'loss');
    if (frameErrors > 200) { running = false; frameErrors = 0; log('Too many errors; the valley is paused. Save the world file and send it in.', 'loss'); }
  }
  requestAnimationFrame(frame);
}

