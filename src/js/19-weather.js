/* ───────────────────────── Weather ───────────────────────── */

function setWeather(kind, announce) {
  const w = world.weather;
  if (w.kind === kind) return;
  w.kind = kind;
  const [a, b] = WEATHER_DUR[kind];
  w.left = a + Math.floor(Math.random() * (b - a));
  if (announce) log(WEATHER_MSG[kind], 'weather');
}

function updateWeather() {
  const w = world.weather;
  if (params.weatherMode !== 'auto') setWeather(params.weatherMode, false);
  const W = WEATHER[w.kind];
  if (W.lightning > 0 && Math.random() < W.lightning * Math.min(2.5, (world.n * world.n) / 10000)) naturalLightning();
  if (params.weatherMode !== 'auto') return;
  if (--w.left > 0) return;
  const sea = season();
  // Winter: snow most of the time. Summer: drought twice as likely. Spring: rain.
  if (sea === 3 && Math.random() < (world.dryWinter ? 0.15 : 0.45)) { if (w.kind === 'snow') w.left = 40 + Math.floor(Math.random() * 60); else setWeather('snow', true); return; }
  const opts = (WEATHER_NEXT[w.kind] || WEATHER_NEXT.clear).map(([k, p]) => [k, p * (sea === 1 && k === 'drought' ? 2 : sea === 0 && k === 'rain' ? 1.6 : sea === 3 && k === 'drought' ? 0.2 : 1)]);
  const total = opts.reduce((a, [, p]) => a + p, 0);
  let r = Math.random() * total, acc = 0;
  for (const [k, p] of opts) {
    acc += p;
    if (r < acc) { if (k === w.kind) w.left = 40 + Math.floor(Math.random() * 60); else setWeather(k, true); return; }
  }
}

