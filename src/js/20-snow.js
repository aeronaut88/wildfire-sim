/* ───────────────────────── Snow ─────────────────────────
   Every cell carries a snow depth. Snowfall builds it a little unevenly, so cover comes in ragged;
   melt depends on the season and the weather, high ground holds its snow longest, and ground that
   has just thawed is damp for a while. Water freezes over under enough snow. */
const SNOW_LV = [6, 24, 50, 85, 130, 190]; // depth thresholds for the six drawn levels
const ICE_AT = 40;
function snowLevel(d) { let lv = 0; while (lv < 6 && d >= SNOW_LV[lv]) lv++; return lv; }
function thawWet(i) {
  if (!isFuel(world.type[i])) return;
  if (world.wet[i] <= 0) world.wetList.push(i);
  world.wet[i] = Math.max(world.wet[i], 30);
  world.wetKind[i] = 3; // damp, not shown as a puddle
}
function updateSnow() {
  const snowing = world.weather.kind === 'snow';
  if (!snowing && !world.snowCells) return;
  const snow = world.snow, lv = world.snowLv, N = world.n * world.n, type = world.type, tick = world.tick, burnLeft = world.burnLeft, elev = world.elev;
  const sea = season(), wk = world.weather.kind;
  // expected depth lost per tick when it is not snowing
  const melt = sea === 3 ? (wk === 'rain' || wk === 'storm' ? 1.0 : 0.03) : sea === 0 ? (wk === 'rain' || wk === 'storm' ? 3 : wk === 'drought' ? 2 : 1.2) : 4;
  let cells = 0;
  for (let i = 0; i < N; i++) {
    let d = snow[i];
    if (burnLeft[i] > 0) { if (!d) continue; d = 0; }
    else if (snowing) {
      if (d >= 255) { cells++; continue; }
      if ((((i * 2654435761) + tick * 40503) >>> 0) % 16 < 11) d++; else { if (d) cells++; continue; }
    } else {
      if (!d) continue;
      const m = melt * (elev && elev[i] > 0.55 ? 0.6 : 1);
      let dec = Math.floor(m);
      if (((((i * 2654435761) + tick * 40503) >>> 0) & 1023) / 1024 < m - dec) dec++;
      if (!dec) { cells++; continue; }
      d = Math.max(0, d - dec);
      if (!d) thawWet(i);
    }
    if (d) cells++;
    snow[i] = d;
    const l = snowLevel(d);
    if (l !== lv[i]) { lv[i] = l; dirty.add(i); }
  }
  world.snowCells = cells;
  if (!cells) world.snowCover = 0;
  else if (tick % 50 === 0) { let c = 0; for (let i = 0; i < N; i++) if (snow[i] >= SNOW_LV[1]) c++; world.snowCover = c / N; }
}
// Tiles change into the new season's colours a few at a time, scattered across the map, over
// the first hundred ticks or so of the season, so autumn arrives tree by tree rather than all at once.
function updateLook() {
  const sea = season();
  if (sea !== world.lookSeason) {
    world.lookSeason = sea;
    const look = world.look; let c = 0;
    for (let i = 0; i < look.length; i++) if (look[i] !== sea) c++;
    world.lookLeft = c;
  }
  if (!world.lookLeft) return;
  const N = world.n * world.n, look = world.look, step = world.sweepStep, count = Math.ceil(N / 60);
  let k0 = world.lookPos || 0;
  for (let k = 0; k < count && world.lookLeft > 0; k++) {
    if (k0 >= N) k0 = 0;
    const i = (k0++ * step + (world.sweepOffset || 0)) % N;
    if (look[i] === sea) continue;
    if (Math.random() < 0.6) { look[i] = sea; world.lookLeft--; dirty.add(i); }
  }
  world.lookPos = k0;
}

function fireDanger() {
  const W = WEATHER[world.weather.kind];
  let d = W.spread * (1 + params.windStrength) * (season() === 1 ? 1.3 : season() === 3 ? 0.7 : 1);
  if ((world.snowCover || 0) > 0.5) d *= 0.3;
  if (world.weather.kind === 'drystorm') d *= 1.5;
  return d < 0.5 ? 'low' : d < 1.1 ? 'moderate' : d < 1.8 ? 'high' : 'EXTREME';
}

function updateSeason() {
  const sea = season();
  if (world.lastSeason === undefined) world.lastSeason = sea;
  if (sea !== world.lastSeason) {
    world.lastSeason = sea;
    const yr = Math.floor(world.tick / YEAR) + 1;
    log([`Spring comes to the valley, year ${yr}`, `Summer. The fire season begins.`, `Autumn. The harvest is in.`, `Winter closes the valley in.`][sea], 'weather');
    if (sea === 3) { world.dryWinter = Math.random() < 0.3; if (world.dryWinter) log('A hard, dry winter. The ground stays bare and the wind has teeth.', 'weather'); }
    if (sea === 3 && params.weatherMode === 'auto' && !world.dryWinter && Math.random() < 0.7) setWeather('snow', false);
    if (sea === 0 && params.weatherMode === 'auto' && world.weather.kind === 'snow') setWeather('rain', true);
  }
}

// Once in a long while something falls out of the sky.
function maybeMeteor() {
  if (world.tick < 200 || Math.random() > 0.000025) return;
  const n = world.n;
  const i = Math.floor(Math.random() * n * n);
  const [tx, ty] = cellCenter(i);
  const sx = tx + (Math.random() - 0.5) * canvas.width * 0.8, sy = -60;
  missiles.push({ sx, sy, tx, ty, target: i, t0: performance.now(), dur: 900, arc: 0, lastSmoke: 0, radius: 3 + Math.floor(Math.random() * 3), nuke: false, meteor: true });
  log('A streak of light crosses the sky', 'weather'); stat('ev', 'meteors');
}

function naturalLightning() {
  stat('ev', 'lightningNatural');
  const i = randomFuelCell();
  const n = world.n, x = i % n, y = Math.floor(i / n);
  let near = null, nd = Infinity;
  for (const t of world.towns) { const d = Math.hypot(t.cx - x, t.cy - y); if (d < nd) { nd = d; near = t; } }
  lightning(i);
  if (near && nd < near.R + 12) log(`Lightning strikes just outside ${near.name}`, 'alarm');
  else if (Math.random() < 0.5) log('Lightning strike in the forest', 'weather');
}

