/* ───────────────────────── World ───────────────────────── */

const T = { WATER: 0, ROCK: 1, GRASS: 2, PINE: 3, OAK: 4, ASH: 5, STUMP: 6, HOUSE: 7, STATION: 8, RUBBLE: 9, DIRT: 10, PAD: 11, HANGAR: 12, BIGPINE: 13, WALL: 14, BIRCH: 23, SCRUB: 24, SNAG: 25, FARM: 26, BRIDGE: 27, DAM: 28, MUD: 29,
  TENEMENT: 15, BARRACKS: 16, FORGE: 17, FACTORY: 18, UNIVERSITY: 19, TOWER: 20, SILO: 21, TOWNHALL: 22,
  LUMBERYARD: 30, MINE: 31, QUARRY: 32, WELL: 33, WHEEL: 34, PLANT: 35, SOLAR: 36, HYDRO: 37, NUCLEAR: 38, DERRICK: 39, SHAFT: 40, PASTURE: 41, REEDS: 42, SAND: 43, JUNGLE: 44, CACTUS: 45, SITE: 46, GRANARY: 47, FELLED: 48, AIRBASE: 49, GAOL: 50, CISTERN: 51, TOWER_W: 52, HEALER: 53, HOSPITAL: 54, GALLOWS: 55, GRAVE: 56, MONUMENT: 57 };
const FUEL = {
  [T.GRASS]:   { ignite: 1.0,  burn: [2, 4],   after: T.ASH,    spots: false },
  [T.PINE]:    { ignite: 0.75, burn: [6, 10],  after: T.STUMP,  spots: true },
  [T.OAK]:     { ignite: 0.55, burn: [12, 20], after: T.STUMP,  spots: true },
  [T.BIGPINE]: { ignite: 0.65, burn: [10, 16], after: T.STUMP,  spots: true },
  [T.BIRCH]:   { ignite: 0.85, burn: [4, 7],   after: T.STUMP,  spots: false },
  [T.SCRUB]:   { ignite: 1.1,  burn: [2, 3],   after: T.ASH,    spots: false },
  [T.SNAG]:    { ignite: 1.2,  burn: [6, 9],   after: T.STUMP,  spots: true },
  [T.FARM]:    { ignite: 0.9,  burn: [2, 3],   after: T.ASH,    spots: false },
  [T.BRIDGE]:  { ignite: 0.5,  burn: [4, 7],   after: T.WATER,  spots: false },
  [T.DAM]:     { ignite: 0.6,  burn: [5, 8],   after: T.WATER,  spots: false },
  [T.HOUSE]:   { ignite: 0.6,  burn: [6, 10],  after: T.RUBBLE, spots: true },
  [T.STATION]: { ignite: 0.5,  burn: [8, 12],  after: T.RUBBLE, spots: true },
  [T.HANGAR]:  { ignite: 0.45, burn: [8, 12],  after: T.RUBBLE, spots: true },
  [T.AIRBASE]: { ignite: 0.4,  burn: [8, 12],  after: T.RUBBLE, spots: true },
  [T.GAOL]:    { ignite: 0.15, burn: [4, 7],   after: T.RUBBLE, spots: false },
  [T.CISTERN]: { ignite: 0.1,  burn: [3, 5],   after: T.RUBBLE, spots: false },
  [T.TOWER_W]: { ignite: 0.25, burn: [5, 8],   after: T.RUBBLE, spots: false },
  [T.HEALER]:  { ignite: 0.35, burn: [5, 8],   after: T.RUBBLE, spots: false },
  [T.HOSPITAL]: { ignite: 0.25, burn: [6, 10],  after: T.RUBBLE, spots: false },
  [T.GALLOWS]: { ignite: 0.4,  burn: [3, 5],   after: T.ASH, spots: false },
  [T.GRAVE]:   { ignite: 0.08, burn: [2, 3],   after: T.GRAVE, spots: false },
  [T.MONUMENT]: { ignite: 0.02, burn: [2, 3],  after: T.MONUMENT, spots: false },
  [T.TENEMENT]:   { ignite: 0.55, burn: [10, 16], after: T.RUBBLE, spots: true },
  [T.BARRACKS]:   { ignite: 0.5,  burn: [8, 12],  after: T.RUBBLE, spots: true },
  [T.FORGE]:      { ignite: 0.6,  burn: [8, 14],  after: T.RUBBLE, spots: true },
  [T.FACTORY]:    { ignite: 0.65, burn: [12, 20], after: T.RUBBLE, spots: true },
  [T.UNIVERSITY]: { ignite: 0.5,  burn: [10, 14], after: T.RUBBLE, spots: true },
  [T.TOWER]:      { ignite: 0.3,  burn: [6, 10],  after: T.RUBBLE, spots: false },
  [T.LUMBERYARD]: { ignite: 0.85, burn: [8, 14],  after: T.RUBBLE, spots: true },
  [T.MINE]:       { ignite: 0.3,  burn: [4, 8],   after: T.RUBBLE, spots: false },
  [T.QUARRY]:     { ignite: 0.2,  burn: [3, 5],   after: T.RUBBLE, spots: false },
  [T.WELL]:       { ignite: 0.15, burn: [3, 5],   after: T.RUBBLE, spots: false },
  [T.WHEEL]:      { ignite: 0.6,  burn: [6, 10],  after: T.RUBBLE, spots: false },
  [T.PLANT]:      { ignite: 0.5,  burn: [10, 16], after: T.RUBBLE, spots: true },
  [T.SOLAR]:      { ignite: 0.3,  burn: [4, 8],   after: T.RUBBLE, spots: false },
  [T.HYDRO]:      { ignite: 0.1,  burn: [3, 5],   after: T.RUBBLE, spots: false },
  [T.NUCLEAR]:    { ignite: 0.35, burn: [10, 16], after: T.RUBBLE, spots: false },
  [T.DERRICK]:    { ignite: 0.9,  burn: [10, 18], after: T.RUBBLE, spots: true },
  [T.SHAFT]:      { ignite: 0.4,  burn: [5, 9],   after: T.RUBBLE, spots: false },
  [T.PASTURE]:    { ignite: 0.9,  burn: [2, 4],   after: T.ASH,    spots: false },
  [T.REEDS]:      { ignite: 0.85, burn: [2, 3],   after: T.ASH,    spots: false },
  [T.SITE]:       { ignite: 0.8,  burn: [3, 5],   after: T.RUBBLE, spots: false }, // timber frames burn easily
  [T.GRANARY]:    { ignite: 0.8,  burn: [8, 14],  after: T.RUBBLE, spots: true }, // dry grain goes up like a torch
  [T.FELLED]:     { ignite: 0.35, burn: [3, 5],   after: T.ASH,    spots: false }, // a cut stump and its slash
  [T.JUNGLE]:     { ignite: 0.3,  burn: [12, 22], after: T.STUMP,  spots: true }, // wet and hard to light; once it goes, it goes big
  [T.SILO]:       { ignite: 0.2,  burn: [6, 10],  after: T.RUBBLE, spots: false },
  [T.TOWNHALL]:   { ignite: 0.5,  burn: [10, 16], after: T.RUBBLE, spots: true },
};
const isFuel = t => FUEL[t] !== undefined;
const isBuilding = t => t === T.HOUSE || t === T.STATION || (t >= T.TENEMENT && t <= T.TOWNHALL) || (t >= T.LUMBERYARD && t <= T.PASTURE) || t === T.GRANARY || t === T.AIRBASE || t === T.GAOL || t === T.CISTERN || t === T.TOWER_W || t === T.HEALER || t === T.HOSPITAL || t === T.GALLOWS || t === T.GRAVE || t === T.MONUMENT;
const isHome = t => t === T.HOUSE || t === T.TENEMENT;
const CAPACITY = { [T.HOUSE]: 6, [T.TENEMENT]: 20 };
const BUILDING_NAMES = { [T.TENEMENT]: 'Tenement', [T.BARRACKS]: 'Barracks', [T.FORGE]: 'Forge', [T.FACTORY]: 'Factory', [T.UNIVERSITY]: 'University', [T.TOWER]: 'Watchtower', [T.SILO]: 'Missile silo', [T.TOWNHALL]: 'Town hall',
  [T.LUMBERYARD]: 'Lumberyard', [T.MINE]: 'Mine', [T.QUARRY]: 'Quarry', [T.WELL]: 'Well', [T.WHEEL]: 'Water wheel', [T.PLANT]: 'Coal plant', [T.SOLAR]: 'Solar array', [T.HYDRO]: 'Hydroelectric dam', [T.NUCLEAR]: 'Reactor', [T.DERRICK]: 'Oil derrick', [T.SHAFT]: 'Mine shaft', [T.PASTURE]: 'Pasture', [T.GRANARY]: 'Granary', [T.AIRBASE]: 'Air base', [T.GAOL]: 'Gaol', [T.CISTERN]: 'Cistern', [T.TOWER_W]: 'Water tower', [T.HEALER]: "Healer's house", [T.HOSPITAL]: 'Hospital', [T.GALLOWS]: 'Gallows', [T.GRAVE]: 'Graveyard', [T.MONUMENT]: 'Monument' };
const isTree = t => t === T.PINE || t === T.OAK || t === T.BIGPINE || t === T.BIRCH || t === T.SNAG || t === T.JUNGLE;
const passable = t => t !== T.WATER && t !== T.ROCK && t !== T.WALL && t !== T.DAM;

const WEATHER = {
  clear:   { label: 'Clear',   spread: 1.0,  spot: 1.0, regrow: 1.0,  rainOut: 0,    lightning: 0,     tint: null },
  drought: { label: 'Drought', spread: 1.45, spot: 2.2, regrow: 0.25, rainOut: 0,    lightning: 0,     tint: 'rgba(230,170,40,0.14)' },
  rain:    { label: 'Rain',    spread: 0.35, spot: 0,   regrow: 3.0,  rainOut: 0.06, lightning: 0,     tint: 'rgba(40,70,140,0.22)' },
  storm:   { label: 'Storm',   spread: 0.55, spot: 0.5, regrow: 2.0,  rainOut: 0.04, lightning: 0.02,  tint: 'rgba(20,30,70,0.32)' },
  ashfall: { label: 'Ashfall', spread: 0.8,  spot: 0.3, regrow: 0.15, rainOut: 0,    lightning: 0,     tint: 'rgba(60,60,65,0.45)' },
  snow:    { label: 'Snow',    spread: 0.2,  spot: 0,   regrow: 0,    rainOut: 0.03, lightning: 0,     tint: 'rgba(205,218,245,0.12)' },
  drystorm: { label: 'Dry storm', spread: 1.2, spot: 1.8, regrow: 0.4, rainOut: 0,   lightning: 0.03,  tint: 'rgba(70,40,90,0.28)' },
};
const WEATHER_NEXT = {
  clear:   [['drought', 0.25], ['rain', 0.3], ['storm', 0.1], ['clear', 0.35]],
  drought: [['clear', 0.45], ['storm', 0.2], ['drystorm', 0.2], ['rain', 0.15]],
  rain:    [['clear', 0.6], ['storm', 0.2], ['rain', 0.2]],
  storm:   [['rain', 0.5], ['clear', 0.5]],
  ashfall: [['rain', 0.6], ['clear', 0.4]],
  drystorm: [['drought', 0.5], ['clear', 0.3], ['storm', 0.2]],
  snow: [['clear', 0.6], ['snow', 0.4]],
};
const WEATHER_DUR = { clear: [140, 360], drought: [120, 300], rain: [50, 140], storm: [30, 70], ashfall: [200, 400], drystorm: [25, 60], snow: [60, 160] };
const WEATHER_MSG = {
  clear: 'Skies clear', drought: 'A dry spell sets in. Everything is tinder.',
  rain: 'Rain moves in', storm: 'A thunderstorm rolls over the valley', ashfall: 'Grey ash falls from a dead sky', drystorm: 'Dry lightning crackles over the ridges. Not a drop of rain.', snow: 'Snow falls on the valley',
};

// Town names are assembled from parts: ~70 heads x ~45 tails, two joining styles, plus a few one-offs.
const NAME_HEADS = ['Pine', 'Oak', 'Cedar', 'Ash', 'Birch', 'Elk', 'Fox', 'Mill', 'Stone', 'Timber', 'Red', 'Lark', 'Deer', 'Coal',
  'Willow', 'Hatchet', 'Bear', 'Wolf', 'Silver', 'Iron', 'Copper', 'Granite', 'Maple', 'Alder', 'Spruce', 'Fern', 'Moss', 'Hawk',
  'Raven', 'Crow', 'Eagle', 'Trout', 'Beaver', 'Otter', 'Thunder', 'Cold', 'Black', 'White', 'Blue', 'Gold', 'Cinder', 'Ember',
  'Smoke', 'Lost', 'Hidden', 'High', 'North', 'South', 'West', 'East', 'Clear', 'Still', 'Swift', 'Broken', 'Hollow', 'Crooked',
  'Twin', 'Lone', 'Big', 'Little', 'Dry', 'Wet', 'Sand', 'Flint', 'Hazel', 'Juniper', 'Laurel', 'Sage', 'Rowan', 'Elder', 'Grouse',
  'Moose', 'Badger', 'Lynx', 'Marten', 'Heron', 'Owl', 'Kestrel', 'Salmon', 'Pike'];
// [tail, joined?]  joined tails glue onto the head (Pinecrest); others take a space (Fox Run).
const NAME_TAILS = [['crest', 1], ['ridge', 1], ['wood', 1], ['ford', 1], ['bridge', 1], ['line', 1], ['spur', 1], ['field', 1],
  ['water', 1], ['brook', 1], ['dale', 1], ['vale', 1], ['ville', 1], ['ton', 1], ['burg', 1], ['port', 1], ['haven', 1], ['mont', 1],
  ['Falls', 0], ['Hollow', 0], ['Run', 0], ['Creek', 0], ['Hill', 0], ['Bend', 0], ['Gap', 0], ['Flats', 0], ['Springs', 0],
  ['Landing', 0], ['Crossing', 0], ['Junction', 0], ['Mills', 0], ['Forge', 0], ['Point', 0], ['Bluff', 0], ['Meadow', 0],
  ['Glen', 0], ['Pass', 0], ['Lake', 0], ['Camp', 0], ['Fork', 0], ['Station', 0], ['Rapids', 0], ['Notch', 0], ['Hole', 0],
  ['Corners', 0], ['Prairie', 0], ['Grove', 0], ['Butte', 0], ['Draw', 0], ['Wash', 0]];
const NAME_SINGLES = ['Ashford', 'Larkspur', 'Timberline', 'Pinecrest', 'Oakridge', 'Stonebridge', 'Deerfield', 'Birchwood',
  'Tinderbox', 'Burnside', 'Charwood', 'Sootville', 'Kindling', 'Lastchance', 'Providence', 'Hope', 'Fortitude', 'Perseverance',
  'Second Chance', 'Phoenix', 'Resolute', 'Dunmore', 'Ravensby', 'Thistledown', 'Windmere', 'Brackenfell', 'Cairnholm'];
function makeTownName(rng) {
  if (rng() < 0.08) return NAME_SINGLES[Math.floor(rng() * NAME_SINGLES.length)];
  const head = NAME_HEADS[Math.floor(rng() * NAME_HEADS.length)];
  const [tail, joined] = NAME_TAILS[Math.floor(rng() * NAME_TAILS.length)];
  if (!joined) return `${head} ${tail}`;
  // Avoid doubled letters at the seam (Oak + kestrel never happens, but Ash + ... might).
  const h = head.toLowerCase(), t = tail;
  return h[h.length - 1] === t[0] ? head + t.slice(1) : head + t;
}

const world = {
  n: 100,
  type: null, variant: null, burnLeft: null, glow: null,
  wet: null, wetKind: null, residents: null, townOf: null, road: null, fert: null, since: null, intensity: null, fallout: null, falloutList: [],
  elev: null, flow: null, river: [], beavers: null, flooded: [], floodOrig: null, floodUntil: 0,
  burning: [], glowing: [], water: [], wetList: [],
  tick: 0,
  totalFuel: 0, burnedCount: 0, treeCount: 0,
  towns: [], air: null,
  buildingsTotal: 0, buildingsLeft: 0, popTotal: 0, popLeft: 0,
  buildingsLost: 0, deaths: 0,
  weather: { kind: 'clear', left: 150 },
  sweepPos: 0, settlers: null, names: [], dragon: null, dragonfire: false, raidfire: false, warbands: [], battles: [], bombers: [], fighters: [], firebugs: [], travellers: [], packs: [], boats: [], diploTimer: 60,
  wind: { angle: 0, strength: 0.3, targetAngle: 0, targetStrength: 0.3, retarget: 0 },
};

const params = {
  speed: 4, spread: 0.30, neighbors: 4, spotting: true,
  windX: 0, windY: 0, windStrength: 0.5,
  density: 0.65, blast: 2,
  weatherMode: 'auto', regrow: 1, townCap: 8, maxTowns: 8,
  windMode: 'auto',
};

// Seams of iron, copper and coal in the rock, and once in a while uranium. Finite: every unit dug is gone.
function seedOres(n) {
  const N = n * n, type = world.type;
  const cand = [];
  for (let i = 0; i < N; i++) {
    if (type[i] !== T.ROCK) continue;
    const x = i % n, y = (i - x) / n;
    if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) continue;
    for (const [ox, oy] of OFFS8) { const t = type[(y + oy) * n + x + ox]; if (t !== T.ROCK && t !== T.WATER) { cand.push(i); break; } }
  }
  // Flat valleys with little rock get a few outcrops so there is something to dig.
  let tries = 0;
  while (cand.length < 12 && tries++ < 8000) { const i = Math.floor(rand() * N); const x = i % n, y = (i - x) / n; if (x > 0 && y > 0 && x < n - 1 && y < n - 1 && type[i] === T.GRASS && world.elev[i] > 0.5) { type[i] = T.ROCK; cand.push(i); } }
  const area = N / 10000;
  const seams = [[1, 2 + Math.floor(rand() * 3)], [2, 1 + Math.floor(rand() * 2)], [3, 1 + Math.floor(rand() * 3)], [4, rand() < 0.45 ? 1 : 0], [6, rand() < 0.5 ? 1 : 0]]; // gold: half of valleys have a seam
  for (const [kind, base] of seams) {
    const count = Math.round(base * Math.max(0.5, Math.sqrt(area)));
    for (let k = 0; k < count && cand.length; k++) {
      const start = cand[Math.floor(rand() * cand.length)];
      if (world.oreKind[start]) continue;
      const size = kind === 4 || kind === 6 ? 2 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 5);
      const q = [start]; let placed = 0;
      while (q.length && placed < size) {
        const i = q.shift();
        if (world.oreKind[i] || type[i] !== T.ROCK) continue;
        world.oreKind[i] = kind; world.ore[i] = kind === 4 ? 120 + Math.floor(rand() * 100) : kind === 6 ? 60 + Math.floor(rand() * 90) : 250 + Math.floor(rand() * 350); placed++;
        const x = i % n, y = (i - x) / n;
        for (const [ox, oy] of OFFS8) { const nx = x + ox, ny = y + oy; if (nx >= 0 && ny >= 0 && nx < n && ny < n && type[ny * n + nx] === T.ROCK && rand() < 0.7) q.push(ny * n + nx); }
      }
    }
  }
}

// Buried wealth: oil fields and deep seams under ordinary ground. Invisible until a town with
// geology surveys them, then worked by derricks and shafts rather than by hand.
function seedDeep(n) {
  const N = n * n, type = world.type, area = N / 10000;
  const land = i => type[i] !== T.WATER && type[i] !== T.ROCK;
  const lay = (kind, clusters, size, amt) => {
    for (let c = 0; c < clusters; c++) {
      let start = -1; for (let k = 0; k < 200 && start < 0; k++) { const i = Math.floor(rand() * N); if (land(i) && !world.deep[i]) start = i; }
      if (start < 0) return;
      const q = [start]; let placed = 0;
      while (q.length && placed < size) {
        const i = q.shift(); if (world.deep[i] || !land(i)) continue;
        world.deep[i] = kind; world.deepAmt[i] = amt[0] + Math.floor(rand() * (amt[1] - amt[0])); placed++;
        const x = i % n, y = (i - x) / n;
        for (const [ox, oy] of OFFS4) { const nx = x + ox, ny = y + oy; if (nx >= 0 && ny >= 0 && nx < n && ny < n && rand() < 0.7) q.push(ny * n + nx); }
      }
    }
  };
  const k = Math.max(0.6, Math.sqrt(area));
  lay(5, Math.round((2 + Math.floor(rand() * 3)) * k), 2 + Math.floor(rand() * 3), [150, 320]); // oil
  lay(1, Math.round((1 + Math.floor(rand() * 2)) * k), 3, [300, 520]); // deep iron
  lay(3, Math.round(1 * k), 3, [250, 450]); // deep coal
  if (rand() < 0.5) lay(4, 1, 2, [100, 190]); // deep uranium
}

