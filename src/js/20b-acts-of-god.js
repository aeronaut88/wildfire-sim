/* ───────────────────────── Acts of god ─────────────────────────
   Truly rare, and they change the map. An earthquake breaks walls and dams, brings houses down,
   and opens a ridge of rock or a rift of water across the land. A comet leaves a crater lake in a
   ring of rock, burns everything for a long way round, and brings a year of ash and failed crops. */

function maybeActOfGod() {
  if (world.tick < YEAR) return;
  // The strike lands when the fall is seen to land (detonate), whatever the tick rate; this is the fallback for a paused or stepped world.
  if (world.cometLand && (!running || performance.now() - world.cometLand.t0 > 4000)) { const i = world.cometLand.i; world.cometLand = null; cometStrike(i); return; }
  if (world.cometWinter && world.tick >= world.cometWinter) { world.cometWinter = null; log('The sky clears at last. The comet year is over, and the first green shows through the ash.', 'weather'); if (params.weatherMode === 'auto') setWeather('clear', false); }
  const r = Math.random();
  if (r < 1 / (YEAR * 30)) earthquake();
  else if (r < 1 / (YEAR * 30) + 1 / (YEAR * 120) && world.tick > YEAR * 10) comet(); // once in a long lifetime, and never in the valley's first years
}
function nearestTown(x, y) { let near = null, nd = Infinity; for (const t of world.towns) { const d = Math.hypot(t.cx - x, t.cy - y); if (d < nd) { nd = d; near = t; } } return [near, nd]; }
function inAnyTown(x, y, pad) { return world.towns.some(t => isAlive(t) && Math.hypot(t.cx - x, t.cy - y) <= t.R + (pad || 1)); }
function makeWater(i) { const t = world.type[i]; if (t === T.WATER) return; if (isTree(t)) world.treeCount--; if (isBuilding(t)) onBuildingDestroyed(i, 'blast'); world.type[i] = T.WATER; world.road[i] = 0; world.burnLeft[i] = 0; world.water.push(i); dirty.add(i); }
function makeRock(i, seam) {
  const t = world.type[i]; if (t === T.ROCK && !seam) return;
  if (t !== T.ROCK) { if (isTree(t)) world.treeCount--; if (isBuilding(t)) onBuildingDestroyed(i, 'blast'); world.type[i] = T.ROCK; world.road[i] = 0; world.burnLeft[i] = 0; }
  // What the earth throws up, or what fell from the sky, is sometimes worth digging.
  if (seam && !world.oreKind[i]) { const r = Math.random(); const kind = r < 0.45 ? 1 : r < 0.8 ? 2 : r < 0.95 ? 6 : 4; world.oreKind[i] = kind; world.ore[i] = kind === 4 ? 40 + Math.floor(Math.random() * 60) : kind === 6 ? 40 + Math.floor(Math.random() * 60) : 150 + Math.floor(Math.random() * 200); stat('ev', 'seamsRevealed'); }
  dirty.add(i);
}

function earthquake() {
  const n = world.n, mag = 1 + Math.floor(Math.random() * 3);
  const ex = 10 + Math.floor(Math.random() * (n - 20)), ey = 10 + Math.floor(Math.random() * (n - 20));
  const R = 18 + 12 * mag;
  stat('ev', 'earthquakes'); shake = 3;
  const [near, nd] = nearestTown(ex, ey);
  log(`THE GROUND SHAKES. An earthquake${near && nd < R ? ` under ${near.name}` : ' in the hills'}, ${['a long rolling one', 'a hard sharp one', 'one that goes on and on'][mag - 1]}. ${['Dogs howl before it comes.', 'The river sloshes in its bed.', 'Birds go up all at once.', 'Church bells ring themselves.'][Math.floor(Math.random() * 4)]}`, 'alarm', ey * n + ex);
  const [px, py] = cellCenter(ey * n + ex); popups.push({ x: px, y: py, text: 'EARTHQUAKE', color: '#ffb627', t0: performance.now(), dur: 4000 });
  for (let k = 0; k < 60; k++) particles.push({ x: px + (Math.random() - 0.5) * cellPx * R, y: py + (Math.random() - 0.5) * cellPx * R, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, life: 0, max: 900, color: '#8a857a', size: Math.max(2, cellPx * 0.3), grav: 10 });
  // Walls crack, dams break, houses come down.
  let walls = 0, dams = [], fell = 0;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = ex + dx, y = ey + dy; if (x < 0 || y < 0 || x >= n || y >= n || Math.hypot(dx, dy) > R) continue;
    const i = y * n + x, t = world.type[i], f = 1 - Math.hypot(dx, dy) / R;
    if (t === T.WALL && Math.random() < 0.35 * f * mag) { world.type[i] = T.DIRT; dirty.add(i); walls++; }
    else if (t === T.DAM && Math.random() < 0.6 * f * mag) dams.push(i);
    else if (isBuilding(t) && t !== T.GRAVE && t !== T.MONUMENT && Math.random() < 0.06 * f * mag) { const town = world.towns[world.townOf[i]]; onBuildingDestroyed(i, 'blast'); world.type[i] = T.RUBBLE; dirty.add(i); fell++; if (town && town.sites) delete town.sites[i]; }
  }
  for (const t of world.towns) { if (!isAlive(t)) continue; const d = Math.hypot(t.cx - ex, t.cy - ey); if (d > R) continue; const dead = Math.round(t.popLeft * 0.01 * mag * (1 - d / R) * (1 + Math.random())); if (dead > 0) applyLosses(t, dead, 'earthquake'); remember(t, 'quake'); if (dead > 0 || d < t.R + 6) log(`${t.name} in the quake: ${dead} dead${fell ? ', houses down' : ''}${walls ? ', the wall cracked' : ''}. ${moodWord(t)[0].toUpperCase() + moodWord(t).slice(1)}.`, 'loss'); }
  for (const i of dams) { world.type[i] = T.WATER; dirty.add(i); world.water.push(i); const rise = 2 + mag; floodArea([i], rise, 8, false, 'The dam breaks in the quake'); log('A dam gives way in the quake and the river comes down in a wall', 'loss', i); }
  // The land itself: a ridge of rock thrown up, or a rift that fills with water, across the open country.
  if (mag >= 2 || Math.random() < 0.5) {
    const rift = Math.random() < 0.5, len = 10 + 8 * mag, a = Math.random() * Math.PI;
    let made = 0;
    for (let k = -len; k <= len; k++) {
      const x = Math.round(ex + Math.cos(a) * k + (Math.random() - 0.5) * 1.5), y = Math.round(ey + Math.sin(a) * k + (Math.random() - 0.5) * 1.5);
      if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1 || inAnyTown(x, y, 2)) continue;
      const i = y * n + x; if (world.type[i] === T.WATER && !rift) continue;
      if (rift) makeWater(i); else makeRock(i, Math.random() < 0.12); made++;
      if (Math.random() < 0.4) { const j = i + (Math.random() < 0.5 ? 1 : n); if (j < n * n && !inAnyTown(j % n, Math.floor(j / n), 2)) { if (rift) makeWater(j); else makeRock(j); } }
    }
    if (made) log(rift ? `The ground splits open ${near ? 'near ' + near.name : 'in the hills'} and water fills the rift. The valley has a new lake, long and narrow.` : `A ridge of bare rock is thrown up across the land ${near ? 'near ' + near.name : 'in the hills'}. The old paths no longer go through${Math.random() < 0.5 ? ', and there is colour in the new stone' : ''}.`, 'weather', ey * n + ex);
    stat('ev', 'landChanged', made);
  } else if (Math.random() < 0.5 && !inAnyTown(ex, ey, 3)) { makeWater(ey * n + ex); for (const [ox, oy] of OFFS8) { const j = (ey + oy) * n + ex + ox; if (Math.random() < 0.5) makeWater(j); } log(`A spring breaks out of the ground where the quake was centred${near ? ', within a walk of ' + near.name : ''}`, 'weather', ey * n + ex); }
}

function comet() {
  const n = world.n;
  const i = Math.floor(Math.random() * n * n);
  const [tx, ty] = cellCenter(i);
  missiles.push({ sx: tx + (Math.random() - 0.5) * canvas.width * 0.8, sy: -80, tx, ty, target: i, t0: performance.now(), dur: 2600, arc: 0, lastSmoke: 0, radius: 2, nuke: false, meteor: true, comet: true });
  world.cometLand = { i, t0: performance.now() };
  log('A SECOND SUN. Something very large is falling out of the sky, and the whole valley stops to watch it.', 'alarm', i);
  stat('ev', 'comets');
}
function cometStrike(i) {
  const n = world.n, cx = i % n, cy = Math.floor(i / n), R = 7 + Math.floor(Math.random() * 3);
  shake = 9; // the whole valley feels it
  const [near, nd] = nearestTown(cx, cy);
  // Crater: a lake in a ring of rock, ash and fire for a long way beyond.
  for (let dy = -R - 10; dy <= R + 10; dy++) for (let dx = -R - 10; dx <= R + 10; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const d = Math.hypot(dx, dy), j = y * n + x;
    if (d <= R - 3) makeWater(j);
    else if (d <= R) makeRock(j, Math.random() < 0.3);
    else if (d <= R + 10) { const t = world.type[j]; if (isBuilding(t) && d <= R + 6) { onBuildingDestroyed(j, 'blast'); world.type[j] = T.RUBBLE; dirty.add(j); } else if (isFuel(t) && Math.random() < 0.6 * (1 - (d - R) / 10)) { world.wet[j] = 0; ignite(j); world.intensity[j] = isTree(t) ? 1 : 0; } }
  }
  // The shockwave: everything standing for a long way round comes down, surely near the crater and by chance further out.
  let flattened = 0, felled = 0; const SW = n; // the wave crosses the whole valley
  for (let dy = -R - SW; dy <= R + SW; dy++) for (let dx = -R - SW; dx <= R + SW; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const d = Math.hypot(dx, dy); if (d <= R + 6) continue; // the crater loop has already done its work inside
    const j = y * n + x, t = world.type[j];
    // a direct hit levels everything; half the map away a third of the buildings still come down; the far edge loses a tenth
    const half = n / 2, p = d <= R + 10 ? 1 : d <= half ? 0.95 - 0.65 * (d - R - 10) / Math.max(1, half - R - 10) : Math.max(0.1, 0.3 - 0.2 * (d - half) / half);
    if (isBuilding(t) || t === T.WALL) { if (Math.random() < p) { if (isBuilding(t)) onBuildingDestroyed(j, 'shock'); if (world.burnLeft[j] > 0) world.burnLeft[j] = 0; world.type[j] = T.RUBBLE; world.mat[j] = 0; const tw = world.towns[world.townOf[j]]; if (tw && tw.sites) delete tw.sites[j]; dirty.add(j); flattened++; } }
    else if (t === T.SITE) { if (Math.random() < p) { const tw = world.towns[world.townOf[j]]; if (tw && tw.sites) delete tw.sites[j]; world.type[j] = T.RUBBLE; dirty.add(j); } }
    else if (isTree(t) && d <= R + 20 && Math.random() < p * 0.8) { world.type[j] = d <= R + 14 ? T.FELLED : T.SNAG; world.treeCount--; world.since[j] = world.tick; dirty.add(j); felled++; } // the forest laid flat, pointing away from the crater
  }
  explosions.push({ x: cellCenter(i)[0], y: cellCenter(i)[1], t0: performance.now() + 300, dur: 2600, r: (R + SW) * cellPx });
  explosions.push({ x: cellCenter(i)[0], y: cellCenter(i)[1], t0: performance.now() + 900, dur: 3200, r: (R + SW + 12) * cellPx }); // and a second ring, slower, wider
  if (flattened) stat('ev', 'flattened', flattened);
  for (const t of world.towns) { if (!isAlive(t)) continue; const d = Math.hypot(t.cx - cx, t.cy - cy); const dead = Math.round(t.popLeft * (d <= R + 10 ? 0.9 : Math.max(0.05, 0.6 * (1 - (d - R) / (n / 2))))); applyLosses(t, dead, 'blast'); remember(t, 'comet'); forgetCounts(t); log(d <= R + 10 ? `${t.name} is under the fall. ${dead} dead; there is no town.` : d <= n / 4 ? `The shockwave hits ${t.name}: ${dead} dead, the town flattened, the sky black.` : `The shockwave reaches ${t.name}: ${dead} dead, roofs torn off and walls down across the town.`, 'loss'); }
  if (flattened || felled) log(`The blast lays ${felled ? 'the forest flat for ' + (R + 20) + ' cells around' : 'the ground bare'}${flattened ? ` and brings down ${flattened} buildings` : ''}.`, 'loss');
  stat('ev', 'landChanged', R * R * 3);
  const [px, py] = cellCenter(i); popups.push({ x: px, y: py, text: 'IMPACT', color: '#fff0b0', t0: performance.now(), dur: 9000 });
  explosions.push({ x: px, y: py, t0: performance.now(), dur: 1800, r: (R + 10) * cellPx });
  { let fe = 0, cu = 0, au = 0, u = 0; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x; if (world.type[j] !== T.ROCK || Math.hypot(dx, dy) > R) continue; const k = world.oreKind[j]; if (k === 1) fe++; else if (k === 2) cu++; else if (k === 6) au++; else if (k === 4) u++; }
    world.craterSeams = { fe, cu, au, u };
    log(`IMPACT${near && nd < R + 20 ? ' beside ' + near.name : ' in the wilds'}. A lake lies in a ring of broken rock where there was ground, and everything for a long way round is burning. Ash begins to fall.`, 'alarm', i);
    if (fe + cu + au + u) log(`When the rock cools, the ring of the crater glitters: ${[fe ? 'iron' : '', cu ? 'copper' : '', au ? 'gold' : '', u ? 'something green that hums' : ''].filter(Boolean).join(', ')}. Sky iron, the old people call it. Every town within a walk will want it.`, 'tech', i); }
  world.cometWinter = world.tick + YEAR; stat('ev', 'cometWinters');
  if (params.weatherMode === 'auto') setWeather('ashfall', true);
  for (const t of world.towns) if (isAlive(t)) remember(t, 'comet');
}
MEMORY_SHORT.quake = () => 'the earthquake';
MEMORY_SHORT.comet = () => 'the comet';
