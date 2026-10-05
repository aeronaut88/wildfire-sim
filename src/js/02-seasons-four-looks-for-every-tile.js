/* ───────────────────────── Seasons: four looks for every tile ─────────────────────────
   The same pixel art, re-coloured per season: fresh greens in spring, the base art in summer,
   gold grass and flame-coloured oaks in autumn, dead grass and bare twiggy hardwoods in winter.
   Snow is a separate layer of dithered stamps laid over whatever the tile looks like. */
const SEASON_PAL = [
  { g: '#4f9a3b', G: '#68ba4e', h: '#3d8030', o: '#2f8a38', O: '#5cba62', n: '#1f6329', p: '#357f33', P: '#4ea050', q: '#225a26' },
  null,
  { g: '#8d8a3f', G: '#a89c48', h: '#6f6d2f', o: '#c0581f', O: '#e8922a', n: '#7a3115', p: '#2b6d2d', P: '#3e8b42', q: '#1c4a1f' },
  { g: '#8b8a73', G: '#9d9c84', h: '#72715c', o: '#5c4634', O: '#8b8a73', n: '#3c2e21', p: '#2a5c3b', P: '#3a784b', q: '#1b4229', A: '#163a25', Q: '#245438', M: '#326f47' },
];
function seasonRows(name, rows, sea) {
  if (sea === 1) return rows;
  const map = (fn) => rows.map((row, j) => row.split('').map((ch, i) => fn(ch, i, j)).join(''));
  if (name === 'oak') {
    if (sea === 3) return map((ch, i, j) => ch === 'O' ? 'g' : ch === 'o' ? ((i + j) % 2 ? 'g' : 'T') : ch === 'n' ? ((i * 3 + j) % 3 ? 'T' : 'g') : ch);
  }
  if (name === 'birch') {
    if (sea === 2) return map(ch => ch === 'G' ? 'E' : ch);
    if (sea === 3) return map((ch, i, j) => ch === 'G' ? ((i + j * 2) % 3 ? 'g' : 'a') : ch);
  }
  if (name === 'farm') {
    if (sea === 0) return map(ch => ch === '6' ? 'P' : ch);
    if (sea === 2) return map(ch => ch === '6' ? 'E' : ch);
    if (sea === 3) return map(ch => ch === '6' ? 'z' : ch);
  }
  if (name === 'scrub' && sea === 2) return map(ch => ch === 'z' ? 'e' : ch);
  return rows;
}
const SPR16S = [0, 1, 2, 3].map(sea => {
  const pal = SEASON_PAL[sea] ? { ...PAL, ...SEASON_PAL[sea] } : PAL;
  const set = {};
  for (const k in SPRITES) set[k] = sea === 1 ? SPR16[k] : buildSprite16(seasonRows(k, SPRITES[k], sea), pal);
  return set;
});
// Snow stamps: six depths, two variants each. Caps on the tops of things and drifts along the
// bottom edge fill in first, so a dusting reads as snow on branches before the ground goes white.
const SNOW_COVER = [0.12, 0.28, 0.45, 0.62, 0.74, 0.82];
function snowStamps(tree) {
  return SNOW_COVER.map(cover => [0, 1].map(v => {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const x = c.getContext('2d');
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      // Trees keep their dark middle: snow sits on the crown and piles around the foot.
      const w = hash2(i, j, 977 + v * 31) - (j < 4 ? 0.22 : j >= 13 ? 0.2 : 0) + (tree && j >= 4 && j < 13 ? 0.42 : 0);
      if (w < cover) { x.fillStyle = hash2(i, j, 55) < 0.2 ? '#dde6f4' : '#f4f7fd'; x.fillRect(i, j, 1, 1); }
    }
    return c;
  }));
}
const SNOW16 = snowStamps(false); // drifts on ice only; land uses the snowed tile sets below
// Deep snow: a proper snowed version of every tile. Ground pixels turn white with a faint
// shadow dither, and the first pixel of anything standing up gets a white cap. Roads stay
// a little darker, as if the town keeps them trodden.
const SNOW_GROUND = { g: 1, G: 1, h: 1, b: 1, B: 1, a: 1, z: 1, Z: 1, '6': 1, '1': 2, '2': 2, '3': 2 };
const SAND_SNOW = { c: 1, C: 1 }; // sand whitens too, but house walls use the same colours, so only the sand tile gets it
function snowedRows(name, rows, ground) {
  const out = rows.map(r => r.split(''));
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const g = SNOW_GROUND[out[j][i]];
    // Ground whitens in clumps (low-frequency hash) so patchy cover reads as drifts, not static.
    const h = (hash2(i >> 1, j >> 1, 9) * 0.7 + hash2(i, j, 13) * 0.3);
    if (g === 1 && h < ground) out[j][i] = hash2(i, j, 17) < 0.16 ? '%' : 'S';
    else if (g === 2 && h < ground * 0.6) out[j][i] = '%';
  }
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      const ch = rows[j][i];
      if (ch === '.' || SNOW_GROUND[ch]) continue;
      out[j][i] = 'S';
      if (j + 1 < 16 && rows[j + 1][i] !== '.' && !SNOW_GROUND[rows[j + 1][i]] && hash2(i, j, 21) < 0.45) out[j + 1][i] = 'S';
      break;
    }
  }
  return out.map(r => r.join(''));
}
const SNOW_GROUND_FRAC = [0, 0.4, 0.75, 1.01];
const SNOWED16 = SNOW_GROUND_FRAC.map(frac => {
  const pal = { ...PAL, ...SEASON_PAL[3], '%': '#dde5f2' };
  const set = {};
  for (const k in SPRITES) set[k] = buildSprite16(snowedRows(k, k === 'sand' || k === 'cactus' ? SPRITES[k].map(r => r.replace(/[cC]/g, 'g')) : seasonRows(k, SPRITES[k], 3), frac), pal);
  return set;
});
const SEASON_TINT = [null, 'rgba(255,225,140,0.035)', 'rgba(255,165,70,0.05)', 'rgba(185,200,240,0.07)'];

// Black silhouettes for shadows that match the sprite's shape.
const SIL16 = {};
for (const k of ['dragon0', 'dragon1', 'plane']) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  x.drawImage(SPR16[k], 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#000'; x.fillRect(0, 0, 16, 16);
  SIL16[k] = c;
}

let SPR = {}, SPRS = [], SNOW = [], SNOWED = [];
function scaleSet(src, px) {
  const out = {};
  for (const k in src) {
    const c = document.createElement('canvas');
    c.width = px; c.height = px;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src[k], 0, 0, px, px);
    out[k] = c;
  }
  return out;
}
function rescaleSprites(px) {
  SPRS = SPR16S.map(set => scaleSet(set, px));
  for (const k in SPR16) if (!SPRS[1][k]) SPRS[1][k] = scaleSet({ k: SPR16[k] }, px).k;
  SPR = SPRS[1];
  SNOW = SNOW16.map(pair => pair.map(c16 => scaleSet({ c: c16 }, px).c));
  SNOWED = SNOWED16.map(set => scaleSet(set, px));
}

