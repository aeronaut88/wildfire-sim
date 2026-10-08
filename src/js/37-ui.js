/* ───────────────────────── UI ───────────────────────── */

function bindRange(id, outId, key, fmt, onChange) {
  const el = $(id), out = $(outId);
  const apply = () => {
    const v = parseFloat(el.value);
    if (key) params[key] = v;
    out.innerHTML = fmt(v);
  };
  el.addEventListener('input', apply);
  if (onChange) el.addEventListener('change', onChange);
  apply();
}
bindRange('speed', 'speedOut', 'speed', v => `${v} t/s`);
bindRange('spread', 'spreadOut', 'spread', v => v.toFixed(2));
bindRange('wind', 'windOut', 'windStrength', v => v.toFixed(2));
bindRange('blast', 'blastOut', 'blast', v => v === 0 ? 'point' : `${v}`);
bindRange('regrow', 'regrowOut', 'regrow', v => v === 0 ? 'off' : v.toFixed(1));
bindRange('townCap', 'townCapOut', 'townCap', v => `${v}`);
bindRange('maxTowns', 'maxTownsOut', 'maxTowns', v => `${v}`);
bindRange('density', 'densityOut', 'density', v => v.toFixed(2), () => reset());
bindRange('size', 'sizeOut', null, v => `${v} &times; ${v}`, () => reset(parseInt($('size').value, 10)));

document.querySelectorAll('.seg button[data-nb]').forEach(b => {
  b.addEventListener('click', () => {
    params.neighbors = parseInt(b.dataset.nb, 10);
    document.querySelectorAll('.seg button[data-nb]').forEach(x => x.classList.toggle('on', x === b));
  });
});
document.querySelectorAll('#spotSeg button').forEach(b => {
  b.addEventListener('click', () => {
    params.spotting = b.dataset.spot === '1';
    document.querySelectorAll('#spotSeg button').forEach(x => x.classList.toggle('on', x === b));
  });
});
document.querySelectorAll('#weatherSeg button').forEach(b => {
  b.addEventListener('click', () => {
    params.weatherMode = b.dataset.w;
    document.querySelectorAll('#weatherSeg button').forEach(x => x.classList.toggle('on', x === b));
  });
});
const compassBtns = [...document.querySelectorAll('#compass button')];
const windAutoBtn = $('windAuto');
function setWindManual(x, y) {
  params.windMode = 'manual';
  windAutoBtn.classList.remove('on');
  params.windX = x; params.windY = y;
  compassBtns.forEach(q => { q.classList.remove('auto'); q.classList.toggle('on', q.dataset.dir === `${x},${y}`); });
}
compassBtns.forEach(b => {
  b.addEventListener('click', () => { const [x, y] = b.dataset.dir.split(',').map(Number); setWindManual(x, y); });
});
windAutoBtn.addEventListener('click', () => {
  params.windMode = 'auto';
  windAutoBtn.classList.add('on');
  compassBtns.forEach(q => q.classList.remove('on'));
});
$('wind').addEventListener('input', () => {
  if (params.windMode === 'auto') {
    // Dragging the slider takes manual control of strength but keeps the current heading.
    const a = world.wind.angle;
    const dx = Math.round(Math.cos(a)), dy = Math.round(Math.sin(a));
    setWindManual(dx, dy);
    params.windStrength = parseFloat($('wind').value);
  }
});

// Weather / wind HUD in the map corner, and the compass mirror while on auto.
const hudEls = { weather: $('hudWeather'), vane: $('hudVane'), wind: $('hudWind'), tick: $('hudTick'), seed: $('hudSeed') };
let lastHud = '';
let lastSeasonHud = -1;
function updateHud() {
  const wk = world.weather.kind;
  const s = params.windStrength, calm = s < 0.08 || (params.windX === 0 && params.windY === 0);
  const ang = calm ? 0 : Math.atan2(params.windY, params.windX) * 180 / Math.PI;
  const dir8 = calm ? '0,0' : `${Math.round(Math.cos(ang * Math.PI / 180))},${Math.round(Math.sin(ang * Math.PI / 180))}`;
  const key = `${wk}|${ang.toFixed(0)}|${s.toFixed(2)}|${dir8}|${params.windMode}`;
  if (key !== lastHud) {
    lastHud = key;
    hudEls.weather.textContent = WEATHER[wk].label;
    hudEls.weather.className = 'w ' + wk;
    hudEls.vane.style.transform = `rotate(${ang}deg)`;
    hudEls.vane.classList.toggle('calm', calm);
    hudEls.wind.textContent = calm ? 'calm' : s.toFixed(2);
    if (params.windMode === 'auto') {
      $('wind').value = s; $('windOut').textContent = s.toFixed(2);
      compassBtns.forEach(q => q.classList.toggle('auto', q.dataset.dir === dir8));
    }
  }
  const danger = fireDanger();
  const sea = season();
  if (sea !== lastSeasonHud) { lastSeasonHud = sea; const el = $('hudSeason'); el.textContent = ['Spring', 'Summer', 'Autumn', 'Winter'][sea]; el.className = 'season s' + sea; }
  const cover = world.snowCover || 0;
  hudEls.tick.textContent = `Y${Math.floor(world.tick / YEAR) + 1} · t${world.tick} · fire danger ${danger}${cover >= 0.02 ? ` · snow ${Math.round(cover * 100)}%` : ''}`;
}

function civicSummary(t) {
  const parts = [];
  for (const [ty, nm] of [[T.TOWNHALL, 'hall'], [T.BARRACKS, 'barracks'], [T.FORGE, 'forge'], [T.FACTORY, 'factory'], [T.UNIVERSITY, 'university'], [T.TOWER, 'tower'], [T.SILO, 'silo'], [T.TENEMENT, 'tenement'], [T.LUMBERYARD, 'lumberyard'], [T.QUARRY, 'quarry'], [T.MINE, 'mine'], [T.WELL, 'well'], [T.WHEEL, 'water wheel'], [T.PLANT, 'coal plant'], [T.SOLAR, 'solar array'], [T.HYDRO, 'hydro dam'], [T.NUCLEAR, 'reactor'], [T.DERRICK, 'derrick'], [T.SHAFT, 'shaft'], [T.PASTURE, 'pasture'], [T.GRANARY, 'granary'], [T.FISHERY, "fisher's hut"], [T.SMOKEHOUSE, 'smokehouse'], [T.BAKERY, 'bakery'], [T.MILL, 'mill'], [T.BREWERY, 'brewery'], [T.INN, 'inn'], [T.CELLAR, 'root cellar']]) {
    const c = countType(t, ty); if (c) parts.push(c > 1 ? `${c} ${nm}${nm.endsWith('s') ? '' : 's'}` : nm);
  }
  return parts.length ? ' · ' + parts.join(', ') : '';
}

// Settlements panel.
const townsEl = $('towns');
let lastTownsKey = '';
function updateTownsPanel() {
  if (!world.towns.length) { if (lastTownsKey !== 'none') { lastTownsKey = 'none'; townsEl.innerHTML = '<div class="empty">no towns in this wilderness</div>'; } return; }
  const rows = world.towns.map(t => {
    const dead = t.housesLeft === 0 || t.popLeft <= 0;
    const eng = t.trucks.filter(q => q.alive).length;
    const burningHere = t.mobilized && t.fireDist < t.R + 1.5;
    const cls = dead ? 'dead' : burningHere ? 'burning' : t.mobilized ? 'rallied' : '';
    const status = dead ? (t.popLeft > 0 ? `${t.popLeft} survivors` : 'abandoned') : burningHere ? 'burning' : t.mobilized ? `rallied, ${t.crews.length} crews out` : 'calm';
    const air = world.air && world.air.owner === t.name ? ` · airstrip ${world.air.sorties}/${world.air.max}` : '';
    const al = alignName(t.align), alCls = t.align.moral > 0 ? 'good' : t.align.moral < 0 ? 'evil' : '';
    const wars = world.towns.filter(o => o !== t && atWar(t, o)).map(o => o.name);
    const allies = world.towns.filter(o => o !== t && isAlive(o) && rel(t, o) >= 60).map(o => o.name);
    const foes = world.towns.filter(o => o !== t && isAlive(o) && rel(t, o) < -20 && !atWar(t, o)).map(o => o.name);
    const relLine = (wars.length ? ` · <span class="d">war: ${wars.join(', ')}</span>` : '') + (allies.length ? ` · allies: ${allies.join(', ')}` : '') + (foes.length ? ` · feuding: ${foes.join(', ')}` : '');
    const folk = world.openChron === t.id && t.people ? `<div class="folk">${t.people.slice().sort((a, b) => (b.alive - a.alive) || a.born - b.born).map(p => `<div class="${p.alive ? '' : 'dead'}"><b>${p.name}</b> · ${roleLabel(p)}${p.trait ? ', ' + TRAITS[p.trait].label : ''}${p.alive ? `, ${personAge(p)}` : ` † ${p.cause || ''}`} · ${p.story}${p.deeds.length ? ` · <span class="deed">${p.deeds[p.deeds.length - 1].text}</span>` : ''}</div>`).join('')}</div>` : '';
    const chron = world.openChron === t.id && t.chronicle ? folk + `<div class="chron">${t.chronicle.map(e => `<div><span class="t">t${e.tick}</span><span>${e.text}</span></div>`).join('')}</div>` : '';
    return `<div class="row ${cls}" data-town="${t.id}"><span class="dot"></span><span class="name">${t.name}<span class="al ${alCls}">${al}</span></span><span class="st">${status}</span>` +
      `<span class="sub">pop <b>${t.popLeft}</b> · homes <b>${t.housesLeft}</b> · r${t.R}` + (t.hasStation ? ` · <b>${eng}</b> eng` : '') + ` · food <b>${foodSupply(t)}</b>` + (t.famine ? ' <span class="d">famine</span>' : t.fed === false ? ' <span class="d">hungry</span>' : '') + (leader(t) ? ` · elder <b>${leader(t).name}</b>, ${traitLabel(leader(t))}` : '') + (t.unrest >= 70 ? ' · <span class="d">unrest ' + Math.round(t.unrest) + '%</span>' : t.unrest >= 40 ? ` · unrest ${Math.round(t.unrest)}%` : '') + ` · militia <b>${t.militia}</b>` + (t.soldiers ? ` · soldiers <b>${t.soldiers}</b>` : '') + (t.jobs ? ` · working <b>${workingPop(t) - jobCount(t, 'idle')}</b>` + (jobCount(t, 'idle') ? ` · <span class="${idleShare(t) > 0.15 ? 'd' : ''}">idle ${jobCount(t, 'idle')}</span>` : '') : '') + (cheerOf(t) >= 70 ? ' · <span class="g">high spirits</span>' : cheerOf(t) < 30 ? ' · <span class="d">low spirits</span>' : '') + (t.wallR ? ' · walled' : '') + (t.R > Math.max(params.townCap, t.R0) ? ' · <span class="d">sprawling</span>' : '') + air + relLine + `<br><span class="tech">${MIL_TECH[t.mil]}${t.nukes ? ' (' + t.nukes + ' bomb' + (t.nukes > 1 ? 's' : '') + ')' : ''} · ${CIV_TECH[t.civ]} · ${CRAFT_TECH[t.craft || 0]}${civicSummary(t)}</span>` +
      (t.deaths || t.homesLost ? ` · <span class="d">${t.deaths} dead, ${t.homesLost} homes lost</span>` : '') + (t.fires ? ` · ${t.fires} fire${t.fires === 1 ? '' : 's'}` : '') + (t.dragons ? ` · <span class="d">dragon x${t.dragons}</span>` : '') + `</span>` +
      (t.res ? `<span class="sub">` + RES_KINDS.filter(k => t.res[k] > 0).map(k => `${k} <b>${t.res[k]}</b>`).join(' · ') + (RES_KINDS.every(k => !t.res[k]) ? 'empty stores' : '') + (t.powerNeed ? ` · power <b>${t.power}</b>/${t.powerNeed}` : '') + (t.water === false ? ' · <span class="d">no water</span>' : '') + (t.covets && world.towns[t.covets.town] ? ` · <span class="d">covets ${world.towns[t.covets.town].name}'s ${t.covets.res}</span>` : '') + (t.master >= 0 && world.towns[t.master] ? ` · tribute to ${world.towns[t.master].name}` : '') + (t.livestock && LIVESTOCK.some(k => t.livestock[k]) ? ' · ' + LIVESTOCK.filter(k => t.livestock[k]).map(k => `${k} <b>${t.livestock[k]}</b>`).join(' · ') : '') + `</span>` : '') + `${chron}</div>`;
  });
  const html = rows.join('');
  if (html !== lastTownsKey) { lastTownsKey = html; townsEl.innerHTML = html; }
}

townsEl.addEventListener('click', ev => {
  const row = ev.target.closest('.row'); if (!row) return;
  const id = +row.dataset.town; world.openChron = world.openChron === id ? -1 : id; lastTownsKey = ''; updateTownsPanel(); if (world.towns[id]) openCard(world.towns[id]);
});

// Shift + hover inspector.
const tipEl = $('tip');
let shiftDown = false, tipPos = [0, 0];
window.addEventListener('keydown', ev => { if (ev.key === 'Shift') shiftDown = true; });
window.addEventListener('keyup', ev => { if (ev.key === 'Shift') shiftDown = false; });
window.addEventListener('blur', () => { shiftDown = false; });
canvas.addEventListener('mousemove', ev => {
  shiftDown = ev.shiftKey;
  const r = viewport.getBoundingClientRect();
  tipPos = [ev.clientX - r.left, ev.clientY - r.top];
});
const TYPE_NAMES = { [T.WATER]: 'Water', [T.ROCK]: 'Rock', [T.GRASS]: 'Grass', [T.PINE]: 'Pine', [T.OAK]: 'Oak', [T.ASH]: 'Ash',
  [T.STUMP]: 'Burnt tree', [T.HOUSE]: 'House', [T.STATION]: 'Fire station', [T.RUBBLE]: 'Rubble', [T.DIRT]: 'Bare dirt',
  [T.PAD]: 'Airstrip', [T.HANGAR]: 'Hangar', [T.BIGPINE]: 'Big pine', [T.WALL]: 'Stone wall', [T.BIRCH]: 'Birch', [T.SCRUB]: 'Dry scrub', [T.SNAG]: 'Dead snag', [T.FARM]: 'Farm', [T.BRIDGE]: 'Wooden bridge', [T.DAM]: 'Beaver dam', [T.MUD]: 'Mud flat', [T.TENEMENT]: 'Tenement', [T.BARRACKS]: 'Barracks', [T.FORGE]: 'Forge', [T.FACTORY]: 'Factory', [T.UNIVERSITY]: 'University', [T.TOWER]: 'Watchtower', [T.SILO]: 'Missile silo', [T.TOWNHALL]: 'Town hall' };
Object.assign(TYPE_NAMES, { [T.AIRBASE]: 'Air base', [T.GAOL]: 'Gaol', [T.CISTERN]: 'Cistern', [T.TOWER_W]: 'Water tower', [T.HEALER]: "Healer's house", [T.HOSPITAL]: 'Hospital', [T.GALLOWS]: 'Gallows', [T.GRAVE]: 'Graveyard', [T.MONUMENT]: 'Monument', [T.LUMBERYARD]: 'Lumberyard', [T.MINE]: 'Mine', [T.QUARRY]: 'Quarry', [T.WELL]: 'Well', [T.WHEEL]: 'Water wheel', [T.PLANT]: 'Coal plant', [T.SOLAR]: 'Solar array', [T.HYDRO]: 'Hydroelectric dam', [T.NUCLEAR]: 'Reactor', [T.DERRICK]: 'Oil derrick', [T.SHAFT]: 'Mine shaft', [T.PASTURE]: 'Pasture', [T.REEDS]: 'Reeds', [T.SAND]: 'Sand', [T.JUNGLE]: 'Jungle tree', [T.CACTUS]: 'Cactus', [T.SITE]: 'Building site', [T.GRANARY]: 'Granary', [T.FELLED]: 'Fresh stump', [T.SHELL]: 'Burnt-out stone shell', [T.SPRING]: 'Spring', [T.FISHERY]: "Fisher's hut", [T.BAKERY]: 'Bakery', [T.SMOKEHOUSE]: 'Smokehouse', [T.INN]: 'Inn', [T.MILL]: 'Mill', [T.BREWERY]: 'Brewery', [T.CELLAR]: 'Root cellar' });
function updateTip() {
  const show = shiftDown && hover >= 0 && hover < world.n * world.n;
  tipEl.classList.toggle('show', show);
  if (!show) return;
  const n = world.n, i = hover, x = i % n, y = (i - x) / n, t = world.type[i];
  const lines = [];
  let name = TYPE_NAMES[t] || '?';
  if (t === T.DIRT) name = world.road[i] ? 'Road' : 'Firebreak';
  lines.push(`<div class="h">${name} <span class="k">(${x}, ${y})</span></div>`);
  if (world.burnLeft[i] > 0) lines.push(`<div class="fire">${world.intensity[i] ? 'CROWN FIRE, spreading hard and throwing embers far' : 'Burning'}, ${world.burnLeft[i]} tick${world.burnLeft[i] === 1 ? '' : 's'} left</div>`);
  else if (world.glow[i] > 0) lines.push(`<div class="fire">Smoldering embers</div>`);
  if (world.elev) lines.push(`<div><span class="k">elevation:</span> ${Math.round(world.elev[i] * 100)}${world.flow && world.flow[i] >= 0 ? (world.flow[i] === i ? ', river mouth' : ', river, flows ' + (() => { const j = world.flow[i]; const dx = j % n - x, dy = Math.floor(j / n) - y; return dy < 0 ? 'north' : dy > 0 ? 'south' : dx > 0 ? 'east' : 'west'; })()) : ''}${world.flooded.includes(i) ? ', flood water' : ''}</div>`);
  if (t === T.FARM && world.townOf[i] >= 0) lines.push(`<div class="town">Fields of ${world.towns[world.townOf[i]].name}, feeds 12</div>`);
  if (world.fallout[i] > 0) lines.push(`<div class="fire">Fallout ${Math.round(world.fallout[i] / 2.55)}%${world.fallout[i] > 40 ? ', nothing grows or builds here' : ', fading'}</div>`);
  { const sp = terrainSpeed(i); if (sp !== 1) lines.push(`<div class="dim">${sp > 1 ? 'fast going: a road' : sp >= 0.7 ? 'slow going' : 'hard going'}</div>`); }
  if (world.biome) lines.push(`<div class="dim">${BIOME_NAMES[world.biome[i]]}${world.biome[i] === 5 ? (nearWater(i, 4) ? ', irrigable' : ', nothing will grow here') : ''}</div>`);
  if (world.type[i] === T.ROCK && world.oreKind[i]) lines.push(`<div>${ORE_NAMES[world.oreKind[i]][0].toUpperCase() + ORE_NAMES[world.oreKind[i]].slice(1)} seam · ${world.ore[i]} left</div>`);
  if (world.surveyed[i] && world.deep[i]) lines.push(`<div>${world.deep[i] === 5 ? 'Oil field' : 'Deep ' + ORE_NAMES[world.deep[i]] + ' seam'} (surveyed) · ${world.deepAmt[i]} left</div>`);
  if (world.type[i] === T.SITE) { const tn = world.towns[world.townOf[i]]; const st = tn && tn.sites ? tn.sites[i] : null; if (st) lines.push(`<div>${(BUILDING_NAMES[st.type] || TYPE_NAMES[st.type] || 'building').toLowerCase()} under construction, ${Math.round(st.progress / st.need * 100)}%</div>`); }
  if (world.type[i] === T.FARM && world.crop) lines.push(`<div>${world.crop[i] >= 100 ? 'ripe, waiting for the farmhands' : 'crop ' + world.crop[i] + '% grown'}</div>`);
  if (world.type[i] === T.WELL) { const tn = world.towns[world.townOf[i]]; if (tn && tn.wells) lines.push(`<div>${tn.wells[i] === undefined ? 'a new well' : tn.wells[i] > 0 ? tn.wells[i] + ' left in the aquifer' : 'run dry'}</div>`); }
  for (const p of world.packs || []) if (Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1) lines.push(`<div class="town">${p.kind === 'bear' ? 'a bear' : `a pack of ${p.size} wolves`}${p.hunger > 40 ? ', hungry' : ''}</div>`);
  if (world.type[i] === T.MINE) { const tn = world.towns[world.townOf[i]]; if (tn && tn.mineKind) lines.push(`<div>${ORE_NAMES[tn.mineKind[i] || 0] || 'ore'} mine${tn.spent && tn.spent[i] ? ', worked out' : ''}</div>`); }
  if (world.snow[i] > 0) lines.push(`<div class="wet">${world.type[i] === T.WATER && world.snow[i] >= ICE_AT ? 'Frozen over' : world.snow[i] < SNOW_LV[1] ? 'A dusting of snow' : world.snow[i] < SNOW_LV[3] ? 'Snow cover' : 'Deep snow'}</div>`);
  if (world.wet[i] > 0) lines.push(world.wetKind[i] === 2 ? `<div class="ret">Retardant, ${world.wet[i]} ticks</div>` : world.wetKind[i] === 3 ? `<div class="wet">Damp from the thaw, ${world.wet[i]} ticks</div>` : `<div class="wet">Wet, ${world.wet[i]} ticks</div>`);
  const f = FUEL[t];
  if (f) lines.push(`<div><span class="k">fuel:</span> ignites x${f.ignite}, burns ${f.burn[0]}-${f.burn[1]} ticks${f.spots ? ', throws embers' : ''}</div>`);
  else lines.push(`<div><span class="k">fuel:</span> none</div>`);
  if (t === T.ASH || t === T.STUMP || (t === T.DIRT && !world.road[i])) {
    const wait = Math.round(regrowWait(i));
    const left = wait - (world.tick - world.since[i]);
    lines.push(`<div><span class="k">regrowth:</span> ${left > 0 ? `dormant for ${left} more ticks` : 'recovering'}</div>`);
  }
  if (t === T.GRASS || t === T.ASH || t === T.DIRT) {
    const fert = world.fert ? world.fert[i] : 1;
    lines.push(`<div><span class="k">ground:</span> ${fert === 0 ? 'meadow, trees never seed' : fert === 1 ? 'thin soil, slow regrowth' : 'forest soil'}</div>`);
  }
  const owner = world.townOf[i] >= 0 ? world.towns[world.townOf[i]] : null;
  let within = null;
  for (const tw of world.towns) if (Math.hypot(tw.cx - x, tw.cy - y) <= tw.R + 0.5) { within = tw; break; }
  const tw = owner || within;
  if (tw) {
    let extra = '';
    if (isHome(t) && owner) extra = `, about ${occupants(owner)} people inside`;
    if (t === T.RUBBLE && owner) extra = ', waiting to be rebuilt';
    lines.push(`<div class="town">${tw.name} (${alignName(tw.align)}, ${MIL_TECH[tw.mil]} / ${CIV_TECH[tw.civ]}): pop ${tw.popLeft}, ${tw.housesLeft} homes, militia ${tw.militia}${tw.hasStation ? ', station' : ''}${tw.wallR ? ', walled' : ''}${tw.mobilized ? ', RALLIED' : ''}${extra}</div>`);
  }
  if (world.air && Math.abs(world.air.x - x) <= 1 && Math.abs(world.air.y - y) <= 1 && (t === T.PAD || t === T.HANGAR)) {
    lines.push(`<div class="town">${world.air.owner} airstrip: ${world.air.sorties}/${world.air.max} sorties${world.air.plane ? ', tanker airborne' : ''}</div>`);
  }
  const here = [];
  for (const town of world.towns) {
    const crews = town.crews.filter(c => c.x === x && c.y === y);
    if (crews.length) here.push(`${crews.length} ${town.name} crew${crews.length > 1 ? 's' : ''} (${crews.map(c => c.mode === 'douse' ? 'beating flames' : (c.target >= 0 && c.target === i ? 'digging' : 'moving')).join(', ')})`);
    for (const tr of town.trucks) if (tr.alive && tr.x === x && tr.y === y) here.push(`${town.name} engine ${tr.id}, water ${tr.water}/${tr.cap}, ${tr.state}`);
    if (town.workers) { const w = town.workers.filter(w => w.x === x && w.y === y); if (w.length) { const jobs = { log: 'logger', mine: 'miner', quarry: 'quarrier', hunt: 'hunter', water: 'water carrier', build: 'builder', harvest: 'farmhand', rebuild: 'rebuilding', farm: 'farmhand', tend: 'farmer', haul: 'hauler', craft: 'at the workshop', fish: 'fisher', icefish: 'ice fishing', carouse: 'at the inn', drill: 'drilling', home: 'heading home', stroll: 'out walking' }; here.push(`${town.name}: ` + w.map(q => (q.soldier ? 'soldier drilling' : jobs[q.job] || 'townsfolk') + (q.carry ? ` carrying ${q.carry} ${q.job === 'log' ? 'wood' : q.job === 'quarry' ? 'stone' : q.job === 'hunt' ? 'game' : q.job === 'harvest' ? 'grain' : q.kind || ''}` : '') + (q.animal ? ` leading a ${q.animal === 'cattle' ? 'calf' : q.animal === 'pigs' ? 'piglet' : q.animal === 'chickens' ? 'grouse' : 'lamb'}` : '')).join(', ')); } }
  }
  for (const bt of world.battles) if (Math.hypot(world.towns[bt.to].cx - x, world.towns[bt.to].cy - y) <= world.towns[bt.to].R + 5) here.push(`battle: ${world.towns[bt.from].name} ${bt.att} vs ${world.towns[bt.to].name} ${bt.def} (${WEAPON[world.towns[bt.from].mil]} against ${WEAPON[world.towns[bt.to].mil]})`);
  for (const b of world.boats) if (b.x === x && b.y === y) here.push(b.fire ? `${world.towns[b.town] ? world.towns[b.town].name : ''} fireboat` : 'fishing boat');
  for (const h of world.herds || []) if (h.size > 0 && Math.abs(h.x - x) <= 1 && Math.abs(h.y - y) <= 1) here.push(`a herd of ${h.size} ${HERD_NAME[h.kind] || h.kind}`);
  if (world.type[i] === T.PASTURE) { const tn = world.towns[world.townOf[i]]; if (tn && tn.livestock) { const parts = LIVESTOCK.filter(k => tn.livestock[k]).map(k => `${tn.livestock[k]} ${k}`); here.push(parts.length ? `${tn.name}'s pasture: ${parts.join(', ')}` : `${tn.name}'s pasture, empty`); } }
  if (world.trader && Math.abs(world.trader.x - x) <= 0 && world.trader.y === y) here.push(`a trade caravan bound for ${world.towns[world.trader.town] ? world.towns[world.trader.town].name : 'town'}: ${Object.entries(world.trader.stock).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ') || 'empty'}`);
  for (const pr of world.roadProjects || []) if (pr.x === x && pr.y === y) here.push(`road crew from ${world.towns[pr.a].name}, ${pr.halted ? 'waiting for stone' : 'laying road'}`);
  for (const b of world.warbands) if (b.x === x && b.y === y) here.push(`${b.size} soldiers from ${world.towns[b.from].name} marching on ${world.towns[b.to].name}`);
  if (world.settlers && world.settlers.x === x && world.settlers.y === y) here.push(`settler wagon, ${world.settlers.size} people, bound for ${world.settlers.mode === 'found' ? 'new ground' : world.settlers.town.name}`);
  if (here.length) lines.push(`<div><span class="k">here:</span> ${here.join('; ')}</div>`);
  tipEl.innerHTML = lines.join('');
  // Place beside the cursor, flipping to stay inside the viewport.
  const vr = viewport.getBoundingClientRect();
  let left = tipPos[0] + 16, top = tipPos[1] + 16;
  if (left + 250 > vr.width) left = tipPos[0] - 16 - 240;
  if (top + 140 > vr.height) top = tipPos[1] - 16 - 120;
  tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
}

const btnPlay = $('btnPlay');
function setRunning(r) {
  running = r;
  btnPlay.textContent = running ? 'Pause' : 'Play';
  btnPlay.classList.toggle('primary', running);
}
btnPlay.addEventListener('click', () => setRunning(!running));
$('btnStep').addEventListener('click', () => { setRunning(false); step(); });
$('btnReset').addEventListener('click', () => reset());
$('btnMissile').addEventListener('click', () => launchMissile(randomFuelCell()));
$('btnLightning').addEventListener('click', () => lightning(randomFuelCell()));

function randomFuelCell() {
  const N = world.n * world.n;
  for (let k = 0; k < 200; k++) {
    const i = Math.floor(Math.random() * N);
    if (isFuel(world.type[i]) && !isBuilding(world.type[i]) && !world.burnLeft[i]) return i;
  }
  return Math.floor(Math.random() * N);
}
function cellFromPoint(clientX, clientY) {
  const [sx, sy] = canvasPoint(clientX, clientY);
  const x = Math.floor((view.x + sx / view.zoom) / cellPx), y = Math.floor((view.y + sy / view.zoom) / cellPx);
  if (x < 0 || y < 0 || x >= world.n || y >= world.n) return -1;
  return y * world.n + x;
}
function cellFromEvent(ev) { return cellFromPoint(ev.clientX, ev.clientY); }
// Mouse: wheel zooms at the cursor, left-drag pans, a click that did not drag fires a missile.
let drag = null, dragged = false;
canvas.addEventListener('wheel', ev => { ev.preventDefault(); const [sx, sy] = canvasPoint(ev.clientX, ev.clientY); zoomAt(ev.deltaY < 0 ? 1.25 : 1 / 1.25, sx, sy); hover = cellFromEvent(ev); }, { passive: false });
canvas.addEventListener('mousedown', ev => { if (ev.button !== 0) return; drag = [ev.clientX, ev.clientY]; dragged = false; });
window.addEventListener('mousemove', ev => {
  if (!drag) return;
  const dx = ev.clientX - drag[0], dy = ev.clientY - drag[1];
  if (!dragged && Math.hypot(dx, dy) < 4) return;
  dragged = true; canvas.classList.add('panning');
  const r = canvas.getBoundingClientRect(), k = canvas.width / r.width;
  panBy(dx * k, dy * k); drag = [ev.clientX, ev.clientY];
});
window.addEventListener('mouseup', () => { drag = null; canvas.classList.remove('panning'); });
canvas.addEventListener('mousemove', ev => { hover = cellFromEvent(ev); });
canvas.addEventListener('mouseleave', () => { hover = -1; });
let clickMode = 'missile';
function toggleClickMode() { clickMode = clickMode === 'missile' ? 'lightning' : 'missile'; $('hudMode').textContent = 'click: ' + clickMode; popups.push({ x: canvas.width / 2 / view.zoom + view.x, y: 30 / view.zoom + view.y, text: clickMode.toUpperCase() + ' MODE', color: clickMode === 'missile' ? '#ff6a1f' : '#a8c8ff', t0: performance.now(), dur: 900 }); }
function townAtCell(i) { const n = world.n, x = i % n, y = (i - x) / n; for (const t of world.towns) if (Math.hypot(t.cx - x, t.cy - y) <= t.R + 1.5 && (t.popLeft > 0 || t.housesLeft > 0)) return t; return null; }
canvas.addEventListener('click', ev => { if (dragged) { dragged = false; return; } const i = cellFromEvent(ev); if (i < 0) return; const t = townAtCell(i); if (t) { openCard(t); return; } if (clickMode === 'lightning') lightning(i); else launchMissile(i); });
canvas.addEventListener('contextmenu', ev => { ev.preventDefault(); if (dragged) return; const i = cellFromEvent(ev); if (i >= 0) lightning(i); });
// Touch: one finger pans, two pinch, a quick tap that did not move fires a missile.
let touches = null, tapStart = null;
canvas.addEventListener('touchstart', ev => {
  ev.preventDefault();
  const t = [...ev.touches].map(q => [q.clientX, q.clientY]);
  touches = t;
  tapStart = t.length === 1 ? { x: t[0][0], y: t[0][1], at: performance.now(), moved: false } : null;
}, { passive: false });
canvas.addEventListener('touchmove', ev => {
  ev.preventDefault();
  const t = [...ev.touches].map(q => [q.clientX, q.clientY]);
  if (!touches) { touches = t; return; }
  const r = canvas.getBoundingClientRect(), k = canvas.width / r.width;
  if (t.length === 1 && touches.length === 1) {
    const dx = t[0][0] - touches[0][0], dy = t[0][1] - touches[0][1];
    if (tapStart && Math.hypot(t[0][0] - tapStart.x, t[0][1] - tapStart.y) > 8) tapStart.moved = true;
    panBy(dx * k, dy * k);
  } else if (t.length >= 2 && touches.length >= 2) {
    const d0 = Math.hypot(touches[1][0] - touches[0][0], touches[1][1] - touches[0][1]), d1 = Math.hypot(t[1][0] - t[0][0], t[1][1] - t[0][1]);
    const mx = (t[0][0] + t[1][0]) / 2, my = (t[0][1] + t[1][1]) / 2, mx0 = (touches[0][0] + touches[1][0]) / 2, my0 = (touches[0][1] + touches[1][1]) / 2;
    const [sx, sy] = canvasPoint(mx, my);
    if (d0 > 0) zoomAt(d1 / d0, sx, sy);
    panBy((mx - mx0) * k, (my - my0) * k);
    if (tapStart) tapStart.moved = true;
  }
  touches = t;
}, { passive: false });
canvas.addEventListener('touchend', ev => {
  ev.preventDefault();
  if (tapStart && !tapStart.moved && ev.touches.length === 0 && performance.now() - tapStart.at < 350) { const i = cellFromPoint(tapStart.x, tapStart.y); if (i >= 0) { const t = townAtCell(i); if (t) openCard(t); else if (clickMode === 'lightning') lightning(i); else launchMissile(i); } }
  touches = ev.touches.length ? [...ev.touches].map(q => [q.clientX, q.clientY]) : null;
  tapStart = null;
}, { passive: false });
$('zoomIn').addEventListener('click', () => zoomAt(1.5, canvas.width / 2, canvas.height / 2));
$('zoomOut').addEventListener('click', () => zoomAt(1 / 1.5, canvas.width / 2, canvas.height / 2));
$('zoomReset').addEventListener('click', resetView);
$('hudMode').addEventListener('click', toggleClickMode);

