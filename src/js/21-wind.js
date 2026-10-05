/* ───────────────────────── Wind ───────────────────────── */

const WIND_RANGE = { clear: [0.05, 0.5], drought: [0.3, 0.75], rain: [0.2, 0.6], storm: [0.6, 1.0], ashfall: [0.05, 0.3], drystorm: [0.5, 0.95], snow: [0.1, 0.5] };
const YEAR = 2400; // a year is 2,400 ticks: 600 a season, so a season lasts a while even at speed
function season() { return Math.floor((world.tick % YEAR) / (YEAR / 4)); }

function updateWind() {
  if (params.windMode !== 'auto') return;
  const w = world.wind, wk = world.weather.kind;
  const [lo, hi] = WIND_RANGE[wk];
  if (--w.retarget <= 0) {
    w.retarget = (wk === 'storm' ? 15 : 40) + Math.floor(Math.random() * (wk === 'storm' ? 40 : 140));
    w.targetStrength = lo + Math.random() * (hi - lo);
    // Fronts swing the wind; storms can spin it right around.
    w.targetAngle = w.angle + (Math.random() - 0.5) * (wk === 'storm' ? 3.2 : 1.6);
  }
  const turn = wk === 'storm' ? 0.06 : 0.02;
  w.angle += (w.targetAngle - w.angle) * turn;
  w.strength += (w.targetStrength - w.strength) * 0.04;
  const gust = wk === 'storm' && Math.random() < 0.08 ? 0.25 : 0;
  const s = Math.min(1, Math.max(0, w.strength + gust));
  params.windX = Math.cos(w.angle); params.windY = Math.sin(w.angle); params.windStrength = s;
  if (s > 0.85 && !w.gale) { w.gale = true; if (Math.random() < 0.5) log('Winds gusting hard', 'weather'); }
  else if (s < 0.6) w.gale = false;
}

