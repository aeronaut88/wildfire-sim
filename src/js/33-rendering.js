/* ───────────────────────── Rendering ───────────────────────── */

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
let cellPx = 8;
const terrain = document.createElement('canvas');
const tctx = terrain.getContext('2d');
const dirty = new Set();
let waterFrame = 0, fireFrame = 0, hover = -1, shake = 0;

function spriteKey(i) {
  const t = world.type[i];
  switch (t) {
    case T.WATER: return waterFrame ? 'water1' : 'water0';
    case T.ROCK: return world.oreKind && world.oreKind[i] ? ORE_KEYS[world.oreKind[i]] : 'rock';
    case T.GRASS: return world.variant[i] ? 'grass1' : 'grass0';
    case T.PINE: return 'pine';
    case T.OAK: return 'oak';
    case T.ASH: return world.glow[i] ? 'ashGlow' : 'ash';
    case T.STUMP: return world.glow[i] ? 'stumpGlow' : 'stump';
    case T.HOUSE: return (world.variant[i] ? 'house1' : 'house0') + (world.mat[i] ? '_s' : '');
    case T.STATION: return world.mat[i] ? 'station_s' : 'station';
    case T.RUBBLE: return 'rubble';
    case T.SHELL: return 'shell';
    case T.DIRT: return world.road[i] ? 'road' : 'dirt';
    case T.BIGPINE: return 'bigpine';
    case T.BIRCH: return 'birch';
    case T.SCRUB: return 'scrub';
    case T.SNAG: return 'snag';
    case T.FARM: return world.crop ? (world.crop[i] < 35 ? 'farm0' : world.crop[i] < 75 ? 'farm1' : 'farm') : 'farm';
    case T.SITE: return 'site';
    case T.GRANARY: return world.mat[i] ? 'granary_s' : 'granary';
    case T.FELLED: return 'felled';
    case T.BRIDGE: return 'bridge';
    case T.DAM: return 'dam';
    case T.MUD: return 'mud';
    case T.WALL: return 'wall';
    case T.TENEMENT: return world.mat[i] ? 'tenement_s' : 'tenement';
    case T.BARRACKS: return world.mat[i] ? 'barracks_s' : 'barracks';
    case T.FORGE: return 'forge';
    case T.FACTORY: return 'factory';
    case T.UNIVERSITY: return world.mat[i] ? 'university_s' : 'university';
    case T.TOWER: return 'tower';
    case T.SILO: return 'silo';
    case T.TOWNHALL: return world.mat[i] ? 'townhall_s' : 'townhall';
    case T.LUMBERYARD: return 'lumberyard';
    case T.MINE: return 'mine';
    case T.QUARRY: return 'quarry';
    case T.WELL: return 'well';
    case T.WHEEL: return 'wheel';
    case T.PLANT: return 'plant';
    case T.SOLAR: return 'solar';
    case T.HYDRO: return 'hydro';
    case T.NUCLEAR: return 'nuclear';
    case T.DERRICK: return 'derrick';
    case T.SHAFT: return 'shaft';
    case T.PASTURE: return 'pasture';
    case T.REEDS: return 'reeds';
    case T.SAND: return 'sand';
    case T.JUNGLE: return 'jungle';
    case T.CACTUS: return 'cactus';
    case T.PAD: return 'pad';
    case T.HANGAR: return 'hangar';
    case T.AIRBASE: return 'airbase';
    case T.GAOL: return world.mat[i] ? 'gaol_s' : 'gaol';
    case T.CISTERN: return 'cistern';
    case T.TOWER_W: return 'watertower';
    case T.HEALER: return world.mat[i] ? 'healer_s' : 'healer';
    case T.HOSPITAL: return world.mat[i] ? 'hospital_s' : 'hospital';
    case T.GALLOWS: return 'gallows';
    case T.GRAVE: return 'grave';
    case T.MONUMENT: return 'monument';
  }
  return 'ash';
}
function spriteFor(i) { return (SPRS[world.look ? world.look[i] : 1] || SPRS[1])[spriteKey(i)]; }

function layout() {
  const rect = viewport.getBoundingClientRect();
  const avail = Math.max(200, Math.min(rect.width, rect.height) - 16);
  const fit = Math.max(2, Math.floor(avail / world.n));
  const budget = rect.width < 600 ? 1500 : 2400; // canvas edge in device pixels we are willing to push every frame
  cellPx = Math.max(fit, Math.min(8, Math.floor(budget / world.n)));
  const size = cellPx * world.n, css = Math.min(avail, size);
  canvas.width = size; canvas.height = size;
  canvas.style.width = css + 'px'; canvas.style.height = css + 'px';
  canvas.style.imageRendering = size > css ? 'auto' : 'pixelated'; // smooth when shrunk to fit, crisp when 1:1
  terrain.width = size; terrain.height = size;
  ctx.imageSmoothingEnabled = false;
  tctx.imageSmoothingEnabled = false;
  rescaleSprites(cellPx);
  redrawTerrain();
  resetView();
}

// Hillshade: high ground a touch paler, hollows a touch darker, so the lie of the land reads.
function blitCell(i) {
  const n = world.n, x = i % n, y = (i - x) / n;
  const t = world.type[i];
  const lv = world.snowLv ? world.snowLv[i] : 0;
  if (t === T.WATER) {
    const frozen = world.snow && world.snow[i] >= ICE_AT;
    tctx.drawImage(frozen ? SPR.ice : spriteFor(i), x * cellPx, y * cellPx);
    if (frozen && lv > 4) tctx.drawImage(SNOW[lv - 5][(x ^ y) & 1], x * cellPx, y * cellPx); // drifts on the ice
    return;
  }
  // Snow is drawn as the tile itself: caps at a dusting, patchy ground, mostly white, all white.
  tctx.drawImage(lv ? SNOWED[Math.min(3, lv - 1)][spriteKey(i)] : spriteFor(i), x * cellPx, y * cellPx);
  if (world.biome && world.biome[i] && lv < 4) { tctx.fillStyle = BIOME_TINT[world.biome[i]]; tctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx); } // the region's cast
  if (world.surveyed && world.surveyed[i] && world.deep[i] && !isBuilding(t)) tctx.drawImage(SPR.survey, x * cellPx, y * cellPx);
  if (world.elev) {
    const e = world.elev[i];
    if (e > 0.52) { tctx.fillStyle = `rgba(255,250,235,${Math.min(0.28, (e - 0.52) * 0.7)})`; tctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx); }
    else if (e < 0.4) { tctx.fillStyle = `rgba(0,10,20,${Math.min(0.22, (0.4 - e) * 0.9)})`; tctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx); }
  }
}
function redrawTerrain() {
  const n = world.n;
  for (let i = 0; i < n * n; i++) blitCell(i);
  dirty.clear();
}
function flushDirty() {
  if (!dirty.size) return;
  for (const i of dirty) blitCell(i);
  dirty.clear();
}
function redrawWater() {
  const n = world.n;
  const s = SPR[waterFrame ? 'water1' : 'water0'];
  for (const i of world.water) {
    if (world.type[i] !== T.WATER || world.snow[i] >= ICE_AT) continue; // ice does not ripple
    const x = i % n, y = (i - x) / n;
    tctx.drawImage(s, x * cellPx, y * cellPx);
  }
}

function cellCenter(i) {
  const n = world.n;
  return [((i % n) + 0.5) * cellPx, (Math.floor(i / n) + 0.5) * cellPx];
}

