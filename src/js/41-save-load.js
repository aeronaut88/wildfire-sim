/* ───────────────────────── Save / Load ───────────────────────── */

const SAVE_VERSION = 1;
const SLOTS = [['auto', 'Autosave'], ['1', 'Slot 1'], ['2', 'Slot 2'], ['3', 'Slot 3']];

function bytesToB64(u8) { let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(bin); }
function b64ToBytes(b64) { const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
const packArr = a => bytesToB64(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
const unpackArr = (b64, Ctor) => { const u8 = b64ToBytes(b64); const copy = new Uint8Array(u8.length); copy.set(u8); return new Ctor(copy.buffer); };

function snapshot() {
  const townToId = t => (t ? t.id : -1);
  return {
    v: SAVE_VERSION, savedAt: Date.now(), n: world.n, seed: world.seed, tick: world.tick,
    arrays: {
      type: packArr(world.type), variant: packArr(world.variant), burnLeft: packArr(world.burnLeft), glow: packArr(world.glow),
      wet: packArr(world.wet), wetKind: packArr(world.wetKind), townOf: packArr(world.townOf), road: packArr(world.road),
      fert: packArr(world.fert), since: packArr(world.since), intensity: packArr(world.intensity), fallout: packArr(world.fallout),
      elev: packArr(world.elev), flow: packArr(world.flow), snow: packArr(world.snow), look: packArr(world.look), oreKind: packArr(world.oreKind), ore: packArr(world.ore),
      deep: packArr(world.deep), deepAmt: packArr(world.deepAmt), surveyed: packArr(world.surveyed), biome: packArr(world.biome), crop: packArr(world.crop),
    },
    river: world.river, flooded: world.flooded, floodOrig: [...world.floodOrig], floodUntil: world.floodUntil,
    beavers: world.beavers ? { ...world.beavers, pond: [...world.beavers.pond] } : null,
    tradeRoads: world.tradeRoads || {}, wagons: world.wagons || [], lastSeason: world.lastSeason, climate: world.climate || null, trader: world.trader || null, nextTrader: world.nextTrader || 0, traderWary: world.traderWary || 0, roadProjects: world.roadProjects || [], stats: world.stats || newStats(), herds: world.herds || [], history: world.history || { ticks: [], towns: {} },
    falloutList: world.falloutList,
    burning: world.burning, glowing: world.glowing, wetList: world.wetList,
    totalFuel: world.totalFuel, burnedCount: world.burnedCount, treeCount: world.treeCount,
    buildingsTotal: world.buildingsTotal, buildingsLeft: world.buildingsLeft, popTotal: world.popTotal, popLeft: world.popLeft,
    buildingsLost: world.buildingsLost, deaths: world.deaths,
    weather: world.weather, wind: world.wind, sweepPos: world.sweepPos, sweepStep: world.sweepStep, sweepOffset: world.sweepOffset || 0, lastCrownLog: world.lastCrownLog,
    towns: world.towns.map(t => ({ ...t, ring: undefined, claimed: [...t.claimed] })),
    air: world.air ? { ...world.air, plane: null } : null,
    settlers: world.settlers ? { ...world.settlers, town: townToId(world.settlers.town) } : null,
    warbands: world.warbands, battles: world.battles.map(b => ({ ...b, proj: [] })), bombers: world.bombers, fighters: world.fighters || [], firebugs: world.firebugs || [], boats: world.boats, dragonGrudge: world.dragonGrudge || null, diploTimer: world.diploTimer,
    dragon: world.dragon ? { ...world.dragon, town: townToId(world.dragon.town), frames: undefined } : null,
    params: { ...params },
    log: logEntries.slice(),
  };
}

// Strings from a save file are shown with innerHTML in places, so anything that could be markup is stripped.
function cleanStr(v, max) { return typeof v === 'string' ? v.replace(/[<>&"'`]/g, '').slice(0, max || 200) : ''; }
function cleanKeys(obj, max) { const out = {}; if (obj && typeof obj === 'object') for (const k of Object.keys(obj).slice(0, 500)) { const v = obj[k]; if (typeof v === 'number' && Number.isFinite(v)) out[cleanStr(k, 80)] = v; } return out; }
function validateSave(d) {
  if (!d || typeof d !== 'object' || d.v !== SAVE_VERSION || !d.arrays || typeof d.arrays !== 'object') throw new Error('not a Wildfire save');
  const n = d.n;
  if (!Number.isInteger(n) || n < 30 || n > 300) throw new Error('bad map size');
  if (!Array.isArray(d.towns) || d.towns.length > 200) throw new Error('bad town list');
  if (!Number.isFinite(d.tick) || d.tick < 0) throw new Error('bad tick');
  for (const [k, bytes] of [['type', 1], ['variant', 1], ['burnLeft', 2], ['glow', 1], ['wet', 2], ['wetKind', 1], ['townOf', 1], ['road', 1], ['fert', 1], ['since', 4], ['intensity', 1]]) {
    const a = d.arrays[k]; if (typeof a !== 'string') throw new Error('missing ' + k);
    const len = Math.floor(a.replace(/=+$/, '').length * 3 / 4); if (len !== n * n * bytes) throw new Error('bad array ' + k);
  }
  // Scrub every string that will be shown.
  d.log = (Array.isArray(d.log) ? d.log : []).slice(0, 60).map(e => ({ tick: Number.isFinite(e && e.tick) ? e.tick : 0, text: cleanStr(e && e.text, 300), kind: cleanStr(e && e.kind, 20) }));
  for (const t of d.towns) {
    if (!t || typeof t !== 'object') throw new Error('bad town');
    t.name = cleanStr(t.name, 60) || 'Nameless';
    t.chronicle = (Array.isArray(t.chronicle) ? t.chronicle : []).slice(0, 40).map(e => ({ tick: Number.isFinite(e && e.tick) ? e.tick : 0, text: cleanStr(e && e.text, 300) }));
    t.people = (Array.isArray(t.people) ? t.people : []).slice(0, 20).map(p => ({ ...p, name: cleanStr(p && p.name, 60), story: cleanStr(p && p.story, 200), cause: cleanStr(p && p.cause, 60), role: cleanStr(p && p.role, 20), trait: p && TRAITS[p.trait] ? p.trait : undefined, deeds: (Array.isArray(p && p.deeds) ? p.deeds : []).slice(0, 6).map(dd => ({ tick: Number.isFinite(dd && dd.tick) ? dd.tick : 0, text: cleanStr(dd && dd.text, 200) })) }));
    if (t.res && typeof t.res === 'object') for (const k of Object.keys(t.res)) if (!RES_KINDS.includes(k)) delete t.res[k];
  }
  if (d.trader && d.trader.stock) d.trader.stock = cleanKeys(d.trader.stock, 20);
  if (d.dragon) d.dragon.name = cleanStr(d.dragon.name, 60);
  if (d.dragonGrudge) d.dragonGrudge.name = cleanStr(d.dragonGrudge.name, 60);
  if (d.history && d.history.towns) for (const id in d.history.towns) { const r = d.history.towns[id]; if (r) r.name = cleanStr(r.name, 60); }
  if (d.stats) { for (const g of ['deaths', 'deathsTown', 'lost', 'lostTown', 'ev', 'dragons']) if (d.stats[g]) d.stats[g] = cleanKeys(d.stats[g], 80); if (d.stats.max) d.stats.max.name = cleanStr(d.stats.max.name, 60); }
  if (d.climate) d.climate.name = cleanStr(d.climate.name, 20);
  if (d.weather) d.weather.kind = WEATHER[d.weather.kind] ? d.weather.kind : 'clear';
  return d;
}
const PARAM_LIMITS = { speed: [1, 240], spread: [0, 1], neighbors: [4, 8], windStrength: [0, 1], density: [0, 1], blast: [0, 12], regrow: [0, 5], townCap: [3, 16], maxTowns: [1, 12], windX: [-1, 1], windY: [-1, 1] };
function applySavedParams(src) {
  if (!src || typeof src !== 'object') return;
  for (const k of Object.keys(params)) {
    if (!(k in src) || typeof src[k] !== typeof params[k]) continue;
    let v = src[k];
    if (typeof v === 'number') { if (!Number.isFinite(v)) continue; const lim = PARAM_LIMITS[k]; if (lim) v = Math.max(lim[0], Math.min(lim[1], v)); }
    if (typeof v === 'string') { if (k === 'weatherMode' && !(v === 'auto' || WEATHER[v])) continue; if (k === 'windMode' && v !== 'auto' && v !== 'manual') continue; v = v.slice(0, 20); }
    params[k] = v;
  }
}
function restore(d) {
  d = validateSave(d);
  const n = d.n, N = n * n;
  missiles.length = 0; explosions.length = 0; bolts.length = 0; particles.length = 0; popups.length = 0;
  world.n = n; world.seed = d.seed; world.tick = d.tick;
  world.type = unpackArr(d.arrays.type, Uint8Array); world.variant = unpackArr(d.arrays.variant, Uint8Array);
  world.burnLeft = unpackArr(d.arrays.burnLeft, Int16Array); world.glow = unpackArr(d.arrays.glow, Uint8Array);
  world.wet = unpackArr(d.arrays.wet, Int16Array); world.wetKind = unpackArr(d.arrays.wetKind, Uint8Array);
  world.townOf = unpackArr(d.arrays.townOf, Int8Array); world.road = unpackArr(d.arrays.road, Uint8Array);
  world.fert = unpackArr(d.arrays.fert, Uint8Array); world.since = unpackArr(d.arrays.since, Int32Array);
  world.intensity = unpackArr(d.arrays.intensity, Uint8Array);
  world.fallout = d.arrays.fallout ? unpackArr(d.arrays.fallout, Uint8Array) : new Uint8Array(N);
  world.falloutList = (d.falloutList || []).slice();
  world.elev = d.arrays.elev ? unpackArr(d.arrays.elev, Float32Array) : new Float32Array(N).fill(0.5);
  world.flow = d.arrays.flow ? unpackArr(d.arrays.flow, Int32Array) : new Int32Array(N).fill(-1);
  world.river = (d.river || []).slice(); world.flooded = (d.flooded || []).slice(); world.floodOrig = new Map(d.floodOrig || []); world.floodUntil = d.floodUntil || 0;
  world.beavers = d.beavers ? { ...d.beavers, pond: new Set(d.beavers.pond || []) } : null;
  world.tradeRoads = d.tradeRoads || {}; world.wagons = (d.wagons || []).slice(); world.lastSeason = d.lastSeason;
  world.snow = d.arrays.snow ? unpackArr(d.arrays.snow, Uint8Array) : new Uint8Array(N);
  world.oreKind = d.arrays.oreKind ? unpackArr(d.arrays.oreKind, Uint8Array) : new Uint8Array(N);
  world.ore = d.arrays.ore ? unpackArr(d.arrays.ore, Uint16Array) : new Uint16Array(N);
  world.deep = d.arrays.deep ? unpackArr(d.arrays.deep, Uint8Array) : new Uint8Array(N);
  world.deepAmt = d.arrays.deepAmt ? unpackArr(d.arrays.deepAmt, Uint16Array) : new Uint16Array(N);
  world.surveyed = d.arrays.surveyed ? unpackArr(d.arrays.surveyed, Uint8Array) : new Uint8Array(N);
  world.biome = d.arrays.biome ? unpackArr(d.arrays.biome, Uint8Array) : new Uint8Array(N);
  world.crop = d.arrays.crop ? unpackArr(d.arrays.crop, Uint8Array) : new Uint8Array(N).fill(60);
  world.climate = d.climate || { name: 'temperate', moist: 0, cold: 0 }; world.trader = d.trader || null; world.nextTrader = d.nextTrader || 0; world.traderWary = d.traderWary || 0; world.roadProjects = (d.roadProjects || []).slice(); world.stats = d.stats || newStats(); world.herds = (d.herds || []).slice(); world.history = d.history || { ticks: [], towns: {} }; histLastLen = -1;
  for (const id in world.history.towns) { const r = world.history.towns[id]; for (const m of ['pop', 'homes', 'militia', 'coin', 'food', 'stock']) if (r[m]) for (let k = 0; k < r[m].length; k++) if (!Number.isFinite(r[m][k])) r[m][k] = 0; }
  world.snowLv = new Uint8Array(N); world.snowCells = 0;
  for (let i = 0; i < N; i++) { world.snowLv[i] = snowLevel(world.snow[i]); if (world.snow[i]) world.snowCells++; }
  world.snowCover = 0;
  world.look = d.arrays.look ? unpackArr(d.arrays.look, Uint8Array) : new Uint8Array(N).fill(season());
  world.lookSeason = -1; world.lookLeft = 0; world.lookPos = 0; // updateLook recounts on the next tick
  world.residents = new Uint8Array(N);
  world.burning = d.burning.slice(); world.glowing = d.glowing.slice(); world.wetList = d.wetList.slice();
  world.water = []; for (let i = 0; i < N; i++) if (world.type[i] === T.WATER) world.water.push(i);
  Object.assign(world, { totalFuel: d.totalFuel, burnedCount: d.burnedCount, treeCount: d.treeCount, buildingsTotal: d.buildingsTotal, buildingsLeft: d.buildingsLeft,
    popTotal: d.popTotal, popLeft: d.popLeft, buildingsLost: d.buildingsLost, deaths: d.deaths, weather: d.weather, wind: d.wind, sweepPos: d.sweepPos, sweepStep: d.sweepStep,
    sweepOffset: d.sweepOffset, lastCrownLog: d.lastCrownLog });
  world.towns = d.towns.map(t => { const tt = { ...t, claimed: new Set(t.claimed) }; return tt; });
  for (const t of world.towns) recomputeRing(t);
  world.air = d.air ? { ...d.air, plane: null } : null;
  world.settlers = d.settlers ? { ...d.settlers, town: d.settlers.town >= 0 ? world.towns[d.settlers.town] : null } : null;
  world.warbands = (d.warbands || []).slice(); world.battles = (d.battles || []).slice(); world.bombers = (d.bombers || []).slice(); world.fighters = (d.fighters || []).slice(); world.firebugs = (d.firebugs || []).slice(); world.boats = (d.boats || []).slice(); world.dragonGrudge = d.dragonGrudge || null; world.diploTimer = d.diploTimer || 60;
  for (const t of world.towns) { t.res = t.res || { wood: 24, stone: 10 }; t.gathered = t.gathered || {}; for (const k of RES_KINDS) { if (!Number.isFinite(t.res[k])) t.res[k] = k === 'coin' ? 30 : k === 'water' ? 30 : k === 'grain' ? 20 : 0; if (!Number.isFinite(t.gathered[k])) t.gathered[k] = 0; } t.wells = t.wells || {}; t.sites = t.sites || {}; if (t.fed === undefined) t.fed = true; t.hunger = t.hunger || 0; t.temper = t.temper || { wood: 1, stone: 1, food: 1, build: 1, trade: 1 };
    if (t.livestock) for (const k of LIVESTOCK) if (!Number.isFinite(t.livestock[k])) t.livestock[k] = 0; t.deepSite = t.deepSite || {}; t.livestock = t.livestock || { cattle: 0, pigs: 0, sheep: 0, chickens: 0 }; if (!t.people) seedPeople(t, Math.random); if (t.master === undefined) t.master = -1; t.mineKind = t.mineKind || {}; t.spent = t.spent || {}; if (t.powerRatio === undefined) t.powerRatio = 1; }
  for (const t of world.towns) { t.align = t.align || rollAlignment(Math.random); t.relations = t.relations || {}; t.wars = t.wars || {}; t.militia = t.militia || 0; t.wallR = t.wallR || 0; t.raidCooldown = t.raidCooldown || 0; t.mil = t.mil || 0; t.civ = t.civ || 0; t.nukes = t.nukes || 0; t.bombers = t.bombers || 0; t.fighters = t.fighters || 0; t.research = t.research || 0; t.shellCooldown = t.shellCooldown || 0; t.nukeCooldown = t.nukeCooldown || 0; t.sick = t.sick || 0; }
  world.dragon = d.dragon ? { ...d.dragon, town: world.towns[d.dragon.town] } : null;
  if (world.dragon && !world.dragon.town) world.dragon = null;
  applySavedParams(d.params);
  logEntries.length = 0; logEntries.push(...d.log); renderLog();
  applyParamsToUi();
  $('size').value = n; $('sizeOut').innerHTML = `${n} &times; ${n}`;
  layout();
  syncSeedUi();
  lastHud = ''; lastTownsKey = ''; lastWeatherShown = ''; lastStatForce = '';
  setRunning(false);
}

function applyParamsToUi() {
  const setRange = (id, outId, v, fmt) => { $(id).value = v; $(outId).innerHTML = fmt(v); };
  setRange('speed', 'speedOut', params.speed, v => `${v} t/s`);
  setRange('spread', 'spreadOut', params.spread, v => (+v).toFixed(2));
  setRange('wind', 'windOut', params.windStrength, v => (+v).toFixed(2));
  setRange('blast', 'blastOut', params.blast, v => v === 0 ? 'point' : `${v}`);
  setRange('density', 'densityOut', params.density, v => (+v).toFixed(2));
  setRange('regrow', 'regrowOut', params.regrow, v => v === 0 ? 'off' : (+v).toFixed(1));
  setRange('townCap', 'townCapOut', params.townCap, v => `${v}`);
  setRange('maxTowns', 'maxTownsOut', params.maxTowns || 5, v => `${v}`);
  document.querySelectorAll('.seg button[data-nb]').forEach(x => x.classList.toggle('on', +x.dataset.nb === params.neighbors));
  document.querySelectorAll('#spotSeg button').forEach(x => x.classList.toggle('on', (x.dataset.spot === '1') === !!params.spotting));
  document.querySelectorAll('#weatherSeg button').forEach(x => x.classList.toggle('on', x.dataset.w === params.weatherMode));
  windAutoBtn.classList.toggle('on', params.windMode === 'auto');
  compassBtns.forEach(q => { q.classList.remove('auto'); q.classList.toggle('on', params.windMode !== 'auto' && q.dataset.dir === `${params.windX},${params.windY}`); });
}

// Compressed text form: "gz:" + base64(gzip(json)) when the browser can, else "raw:" + json.
async function encodeSave(obj) {
  const json = JSON.stringify(obj);
  if (typeof CompressionStream === 'function') {
    try {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const buf = await new Response(stream).arrayBuffer();
      return 'gz:' + bytesToB64(new Uint8Array(buf));
    } catch (e) { /* fall through */ }
  }
  return 'raw:' + json;
}
async function decodeSave(text) {
  text = String(text).trim();
  if (text.startsWith('gz:')) {
    const stream = new Blob([b64ToBytes(text.slice(3))]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  if (text.startsWith('raw:')) return JSON.parse(text.slice(4));
  return JSON.parse(text);
}

const slotsEl = $('slots');
const slotKey = id => 'wildfire.save.' + id;
const metaKey = id => 'wildfire.meta.' + id;
// Saves live in IndexedDB: far more room than localStorage and less likely to be swept out. Older
// localStorage saves are migrated in on first run, and localStorage stays as the fallback.
const idb = {
  db: undefined,
  open() {
    if (this.db !== undefined) return Promise.resolve(this.db);
    return new Promise(res => {
      if (!('indexedDB' in window)) { this.db = null; return res(null); }
      let r; try { r = indexedDB.open('wildfire', 1); } catch (e) { this.db = null; return res(null); }
      r.onupgradeneeded = () => r.result.createObjectStore('saves');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = r.onblocked = () => { this.db = null; res(null); };
    });
  },
  async get(k) { const db = await this.open(); if (!db) return undefined; return new Promise(res => { const q = db.transaction('saves').objectStore('saves').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); },
  async set(k, v) { const db = await this.open(); if (!db) return false; return new Promise(res => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(v, k); tx.oncomplete = () => res(true); tx.onerror = tx.onabort = () => res(false); }); },
};
const slotMetas = {};
function slotMeta(id) { return slotMetas[id] || null; }
async function loadSlotMetas() {
  for (const [id] of SLOTS) {
    let m = await idb.get(metaKey(id));
    if (!m) { try { const ls = localStorage.getItem(metaKey(id)), text = localStorage.getItem(slotKey(id)); if (ls && text) { m = JSON.parse(ls); await idb.set(slotKey(id), text); await idb.set(metaKey(id), m); } } catch (e) { /* ignore */ } }
    if (m) slotMetas[id] = m;
  }
  renderSlots();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); // ask the browser not to sweep our saves
}
function ago(ms) { const s = Math.round((Date.now() - ms) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago'; }
function renderSlots() {
  slotsEl.innerHTML = SLOTS.map(([id, name]) => {
    const m = slotMeta(id);
    const meta = m ? `t${m.tick} · ${m.towns} town${m.towns === 1 ? '' : 's'} · ${m.n}² · ${ago(m.savedAt)}` : 'empty';
    return `<div class="slot" data-slot="${id}"><div><div class="nm">${name}</div><div class="meta ${m ? '' : 'empty'}">${meta}</div></div>` +
      `<button data-act="save" ${id === 'auto' ? 'disabled title="Autosave writes itself every minute"' : ''}>Save</button><button data-act="load" ${m ? '' : 'disabled'}>Load</button></div>`;
  }).join('');
}
async function saveToSlot(id) {
  const snap = snapshot();
  const text = await encodeSave(snap);
  const meta = { savedAt: snap.savedAt, tick: snap.tick, towns: snap.towns.length, n: snap.n };
  let ok = (await idb.set(slotKey(id), text)) && (await idb.set(metaKey(id), meta));
  if (!ok) { try { localStorage.setItem(slotKey(id), text); localStorage.setItem(metaKey(id), JSON.stringify(meta)); ok = true; } catch (e) { /* full or blocked */ } }
  if (!ok) { log('Could not save: browser storage is full or blocked. Export a file instead.', 'loss'); return false; }
  slotMetas[id] = meta;
  renderSlots();
  return true;
}
async function loadFromSlot(id) {
  let text = await idb.get(slotKey(id));
  if (!text) { try { text = localStorage.getItem(slotKey(id)); } catch (e) { text = null; } }
  if (!text) return false;
  try { restore(await decodeSave(text)); } catch (e) { log('That save could not be read', 'loss'); return false; }
  log(`Loaded ${SLOTS.find(s => s[0] === id)[1].toLowerCase()} at tick ${world.tick}. Paused.`, 'good');
  return true;
}
loadSlotMetas();
slotsEl.addEventListener('click', async ev => {
  const b = ev.target.closest('button'); if (!b || b.disabled) return;
  const id = b.closest('.slot').dataset.slot;
  if (b.dataset.act === 'save') { if (await saveToSlot(id)) { b.textContent = 'Saved'; b.classList.add('flash'); setTimeout(renderSlots, 900); } }
  else await loadFromSlot(id);
});
// Files are plain gzip-compressed JSON (.json.gz): readable with any gunzip, small on disk.
async function encodeFile(obj) {
  const json = JSON.stringify(obj);
  if (typeof CompressionStream === 'function') {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Blob([await new Response(stream).arrayBuffer()], { type: 'application/gzip' });
  }
  return new Blob([json], { type: 'application/json' });
}
async function decodeFile(buf) {
  const u8 = new Uint8Array(buf);
  if (u8[0] === 0x1f && u8[1] === 0x8b) {
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  return decodeSave(new TextDecoder().decode(u8));
}
$('exportBtn').addEventListener('click', async () => {
  const blob = await encodeFile(snapshot());
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wildfire-${world.seed}-t${world.tick}.json${blob.type === 'application/gzip' ? '.gz' : ''}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  log(`Exported ${a.download}`, 'good');
});
$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async ev => {
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  try { restore(await decodeFile(await f.arrayBuffer())); log(`Loaded ${f.name} at tick ${world.tick}. Paused.`, 'good'); }
  catch (e) { log('That file is not a Wildfire save', 'loss'); }
  ev.target.value = '';
});
renderSlots();
// Autosave once a minute while running.
setInterval(() => { if (running && world.tick > 0) saveToSlot('auto'); }, 60000);

// Debug handle for automated tests and tinkering in the console.
// Debug: time the pieces of a tick over N ticks, for finding what costs what.
function profileTicks(ticks) {
  const fns = { updateSnow, updateLook, regrowSweep, updateHydrology, updateHerds, updateBoats, updateWarbands, updateBattles, updateFallout, updateDiplomacy, updateWagons, updateRoadProjects, updateTrader, updateSettlers, flushDirty, updateCrews, updateTrucks, updateWorkers, growTown, maybeArson };
  const t0 = performance.now(); for (let k = 0; k < ticks; k++) step(); const total = performance.now() - t0;
  const out = { totalMsPerTick: +(total / ticks).toFixed(3) };
  for (const nm of ['updateSnow', 'updateLook', 'regrowSweep', 'updateHydrology', 'updateHerds', 'updateBoats', 'updateWarbands', 'updateBattles', 'updateFallout', 'updateDiplomacy', 'updateWagons', 'updateRoadProjects', 'updateTrader', 'updateSettlers', 'flushDirty']) { const a = performance.now(); for (let k = 0; k < 200; k++) { world.tick++; fns[nm](); } out[nm] = +((performance.now() - a) / 200).toFixed(3); }
  for (const nm of ['updateCrews', 'updateTrucks', 'updateWorkers', 'growTown', 'maybeArson']) { const a = performance.now(); for (let k = 0; k < 50; k++) { world.tick++; for (const t of world.towns) fns[nm](t); } out[nm + ' (all towns)'] = +((performance.now() - a) / 50).toFixed(3); }
  { const a = performance.now(); for (let k = 0; k < 50; k++) { world.tick++; updateTowns(); } out['updateTowns (whole)'] = +((performance.now() - a) / 50).toFixed(3); }
  { const a = performance.now(); for (let k = 0; k < 100; k++) render(performance.now(), 0); out.render = +((performance.now() - a) / 100).toFixed(3); }
  return out;
}
window.__wildfire = { world, params, reset, step, profileTicks, terrain, render, stepToward, launchMissile, lightning, setRunning, log, T, ignite, isFuel, waterStep, setWeather, updateSnow, updateLook, view, cellFromPoint, zoomAt, resetView, missiles, forceSettlers: () => updateSettlers(true), debugDragon: () => maybeDragon(true), debugWar: (a, b) => declareWar(world.towns[a], world.towns[b], '(forced)'), debugNuke: (a, b) => launchNuke(world.towns[a], world.towns[b]), debugBomber: (a, b) => launchBomber(world.towns[a], world.towns[b]), debugBeavers: () => { world.beavers = null; let k = 0; while (!world.beavers && k++ < 2000) { world.tick = Math.max(world.tick, 300); updateBeavers(); } return !!world.beavers; }, debugFlood: () => floodArea(world.river, 0.018, 3, false, 'Flood (forced)'), debugMeteor: () => { const i = randomFuelCell(); const [tx, ty] = cellCenter(i); missiles.push({ sx: tx - 200, sy: -60, tx, ty, target: i, t0: performance.now(), dur: 900, arc: 0, lastSmoke: 0, radius: 4, nuke: false, meteor: true }); }, debugTech: (a, m, c) => { world.towns[a].mil = m; world.towns[a].civ = c; if (m >= 6) world.towns[a].nukes = 1; }, seed: () => world.seed, snapshot, restore, encodeSave, decodeSave, encodeFile, decodeFile, saveToSlot, loadFromSlot };

// Boot: a shared link carries the valley.
let bootSeed, bootSize = 200;
try {
  const q = new URL(location.href).searchParams;
  if (q.has('seed')) { const v = q.get('seed'); bootSeed = /^\d+$/.test(v) ? Number(v) >>> 0 : undefined; if (bootSeed === undefined) { let h = 2166136261; for (let k = 0; k < v.length; k++) { h ^= v.charCodeAt(k); h = Math.imul(h, 16777619); } bootSeed = h >>> 0; } }
  if (q.has('size')) { const z = parseInt(q.get('size'), 10); if (z >= 30 && z <= 300) { bootSize = Math.round(z / 10) * 10; $('size').value = bootSize; $('size').dispatchEvent(new Event('input')); } }
} catch (e) { /* ignore */ }
reset(bootSize, bootSeed);
try { if (location.search) history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
setTimeout(() => launchMissile(randomFuelCell()), 600);
requestAnimationFrame(frame);

