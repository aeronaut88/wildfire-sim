/* ───────────────────────── Technology: bows to the bomb ───────────────────────── */

const MIL_TECH = ['Bows', 'Steel', 'Siege engines', 'Gunpowder', 'Rifles', 'Artillery', 'The Bomb'];
const CIV_TECH = ['Buckets', 'Fire brigade', 'Waterworks', 'Lookout tower', 'Geology', 'Aviation'];
// Cumulative research needed for each level. Research trickles in at pop/1000 per tick, so the top takes a long time.
const MIL_COST = [0, 300, 900, 2000, 4000, 7000, 11000];
const CIV_COST = [0, 250, 700, 1500, 3000, 5000];

function militarism(t) {
  let m = 0.5;
  const tr = trait(t); if (tr === 'warmonger') m += 0.3; else if (tr === 'tyrant') m += 0.2; else if (tr === 'peacemaker') m -= 0.3; else if (tr === 'scholar' || tr === 'greenthumb' || tr === 'merchant') m -= 0.1;
  if (t.align.moral < 0) m += 0.35; if (t.align.moral > 0) m -= 0.4;
  if (t.align.order > 0) m += 0.15; if (t.align.order < 0) m += 0.05;
  return Math.max(0.05, Math.min(1, m));
}
function milCap(t) { return t.align.moral > 0 ? 4 : (t.align.moral === 0 ? 5 : 6); } // good towns never build the bomb

// Called from growTown (about every 16 ticks per town).
// A track is "banked" when the points for its next step are in hand: either the resource gate is
// holding it, or the track is topped out. Effort spent there would be wasted, so it goes to the other.
function milBanked(t) { return t.mil >= milCap(t) || (t.milPts || 0) >= MIL_COST[t.mil + 1]; }
function civBanked(t) { return t.civ >= 5 || (t.civPts || 0) >= CIV_COST[t.civ + 1]; }
// What a town is short of for a step it already has the points for. These count as shortages the
// town acts on: it digs for the ore, sends more people to the quarry, and buys it first at market.
function techWants(t) {
  const out = new Set();
  if (t.mil < milCap(t) && (t.milPts || 0) >= MIL_COST[t.mil + 1]) { const k = lacking(t, MIL_NEED[t.mil + 1]); if (k) out.add(k); }
  if (t.civ < 5 && (t.civPts || 0) >= CIV_COST[t.civ + 1]) { const k = lacking(t, CIV_NEED[t.civ + 1]); if (k) out.add(k); }
  return out;
}
// What the town is saving for: the resource needs of every step it has the points for.
function techReserve(t) {
  let out = null;
  if (t.mil < milCap(t) && (t.milPts || 0) >= MIL_COST[t.mil + 1] && MIL_NEED[t.mil + 1]) out = Object.assign({}, MIL_NEED[t.mil + 1]);
  if (t.civ < 5 && (t.civPts || 0) >= CIV_COST[t.civ + 1] && CIV_NEED[t.civ + 1]) { out = out || {}; for (const k in CIV_NEED[t.civ + 1]) out[k] = (out[k] || 0) + CIV_NEED[t.civ + 1][k]; }
  return out;
}
function updateTech(t) {
  if (!isAlive(t)) return;
  // Even a hamlet has a tinkerer or two: research never trickles slower than a town of forty would manage.
  let pts = 16 * (Math.max(t.popLeft, 40) / 1000) * (t.align.order > 0 ? 1.25 : t.align.order < 0 ? (Math.random() < 0.3 ? 2.5 : 0.6) : 1);
  pts *= 1 + 0.5 * countType(t, T.UNIVERSITY) + 0.3 * countType(t, T.FORGE) + 0.4 * countType(t, T.FACTORY);
  if (t.powerNeed > 0) pts *= 0.5 + 0.5 * (t.powerRatio === undefined ? 1 : t.powerRatio); // brownouts slow the labs
  if (t.power > t.powerNeed) pts *= 1.3; // lamps in the workshops: a powered town learns faster
  if (has(t, 'scholar')) pts *= 1.4; else if (has(t, 'prophet')) pts *= 0.6; else if (has(t, 'madman')) pts *= 0.8;
  const m = militarism(t);
  t.research += pts;
  // Split research between tracks by temperament, unless one track is banked and waiting: then all of it goes where it can still be spent.
  const mb = milBanked(t), cb = civBanked(t);
  const milShare = mb && !cb ? 0 : cb && !mb ? 1 : Math.min(0.85, m), civShare = 1 - milShare; // even a warlord's town keeps a few scholars
  t.milPts = (t.milPts || 0) + pts * milShare; t.civPts = (t.civPts || 0) + pts * civShare;
  if (t.mil < milCap(t) && t.milPts >= MIL_COST[t.mil + 1]) {
    const next = t.mil + 1, need = MIL_NEED[next];
    const why = lacking(t, need) || (next === 5 && !(hasType(t, T.FACTORY) && t.powerRatio >= 0.5) ? 'a powered factory' : next === 6 && !hasType(t, T.UNIVERSITY) ? 'a university' : null);
    if (why) { if (t.milGateLogged !== next) { t.milGateLogged = next; log(`${t.name} has the know-how for ${MIL_TECH[next].toLowerCase()} but needs ${RES_KINDS.includes(why) ? 'more ' + why : why}`, 'tech'); } }
    else {
      pay(t, need); t.mil++;
      log(`${t.name} masters ${MIL_TECH[t.mil].toLowerCase()}`, t.mil >= 6 ? 'nuke' : 'tech');
      if (t.mil === 6) log(`${t.name} knows how to build a bomb. It needs uranium.`, 'nuke');
    }
  }
  if (t.mil >= 2 && t.align.order >= 0 && !t.wallR && t.popLeft >= 40 && canAfford(t, COST.wall)) { pay(t, COST.wall); buildWall(t); }
  if (t.civ < 5 && t.civPts >= CIV_COST[t.civ + 1]) {
    const next = t.civ + 1, need = CIV_NEED[next], why = lacking(t, need);
    if (why) { if (t.civGateLogged !== next) { t.civGateLogged = next; log(`${t.name} has the plans for ${CIV_TECH[next].toLowerCase()} but needs more ${why}`, 'tech'); } }
    else {
      pay(t, need); t.civ++;
      log(`${t.name} learns ${CIV_TECH[t.civ].toLowerCase()}`, 'tech');
      if (t.civ === 2) for (const tr of t.trucks) { tr.cap = 30; }
    }
  }
  if (t.mil === 6 && t.nukes < 2 && hasType(t, T.SILO) && canAfford(t, COST.nuke) && Math.random() < 0.03) {
    pay(t, COST.nuke); t.nukes++; t.bombsBuilt = (t.bombsBuilt || 0) + 1;
    log(t.bombsBuilt === 1 ? `${t.name} has built a bomb. Nobody there knows what it will do to the land.` : `${t.name} completes another bomb`, 'nuke');
  }
  if (t.shellCooldown > 0) t.shellCooldown--;
  if (t.nukeCooldown > 0) t.nukeCooldown--;
}

// Detection radius bonus from a lookout tower.
function detectBonus(t) { return (hasType(t, T.TOWER) ? 10 : 0) + (has(t, 'firewatch') ? 5 : 0); }

// Artillery: towns with tech 5 at war shell the enemy from home. Nukes: tech 6, war, and either desperation or plain evil.
function maybeBombard(t) {
  if (!isAlive(t) || t.mil < 5) return;
  const enemies = world.towns.filter(o => o !== t && isAlive(o) && atWar(t, o));
  if (!enemies.length) return;
  const to = enemies[Math.floor(Math.random() * enemies.length)];
  if (t.mil >= 6 && t.nukes > 0 && t.nukeCooldown <= 0) {
    const desperate = t.popLeft < to.popLeft * 0.6 || t.housesLeft < 6;
    const p = (t.align.moral < 0 ? 0.0012 : 0.0002) * (desperate ? 4 : 1);
    if (Math.random() < p) { launchNuke(t, to); return; }
  }
  if (t.mil >= 5 && !world.bombers.some(b => b.from === t.id) && canAfford(t, COST.bomber) && Math.random() < 0.0025) { pay(t, COST.bomber); launchBomber(t, to); return; }
  if (t.shellCooldown <= 0 && t.res.iron >= 1 && Math.random() < 0.012) {
    t.res.iron--;
    t.shellCooldown = 10 + Math.floor(Math.random() * 20);
    t.shellsFired = (t.shellsFired || 0) + 1;
    const n = world.n;
    const a = Math.random() * Math.PI * 2, d = Math.random() * to.R;
    const x = Math.round(to.cx + Math.cos(a) * d), y = Math.round(to.cy + Math.sin(a) * d);
    if (x < 0 || y < 0 || x >= n || y >= n) return;
    launchShell(t.cx, t.cy, y * n + x, 1, false);
    if (Math.random() < 0.15) log(`${t.name}'s guns shell ${to.name}`, 'war');
  }
}

// Bombers: a town with artillery-era tech at war flies a sortie over the enemy and drops a stick of bombs.
function launchBomber(from, to) {
  stat('ev', 'bombers');
  const n = world.n;
  const ang = Math.random() * Math.PI * 2;
  const run = to.R + 6;
  const p0 = [to.cx - Math.cos(ang) * run, to.cy - Math.sin(ang) * run], p1 = [to.cx + Math.cos(ang) * run, to.cy + Math.sin(ang) * run];
  world.bombers.push({ legs: [[from.cx, from.cy], p0, p1, [from.cx, from.cy]], leg: 0, t: 0, x: from.cx, y: from.cy, heading: 0, from: from.id, to: to.id, dropT: 0, dropped: 0 });
  log(`A bomber lifts off from ${from.name} bound for ${to.name}`, 'war');
}
function flyBombers(dtSec) {
  if (!world.bombers.length) return;
  const speed = Math.max(20, 5 * params.speed);
  const keep = [];
  for (const p of world.bombers) {
    let remaining = speed * dtSec;
    while (remaining > 0 && p.leg < p.legs.length - 1) {
      const [ax, ay] = p.legs[p.leg], [bx, by] = p.legs[p.leg + 1];
      const len = Math.hypot(bx - ax, by - ay) || 0.001;
      const left = (1 - p.t) * len, adv = Math.min(left, remaining);
      p.t += adv / len; remaining -= adv;
      p.x = ax + (bx - ax) * p.t; p.y = ay + (by - ay) * p.t;
      p.heading = Math.atan2(by - ay, bx - ax);
      if (p.leg === 1) {
        const to = world.towns[p.to];
        p.dropT += adv;
        if (p.dropT >= 1.6 && inFootprint(to, Math.round(p.x), Math.round(p.y), 2)) {
          p.dropT = 0; p.dropped++;
          const n = world.n, x = Math.max(0, Math.min(n - 1, Math.round(p.x))), y = Math.max(0, Math.min(n - 1, Math.round(p.y)));
          const [sx, sy] = cellCenter(y * n + x);
          missiles.push({ sx, sy: sy - cellPx * 6, tx: sx + (Math.random() - 0.5) * cellPx, ty: sy, target: y * n + x, t0: performance.now(), dur: 450, arc: 0, lastSmoke: 0, radius: 1, nuke: false });
        }
      }
      if (p.t >= 0.999) { p.leg++; p.t = 0; }
    }
    if (p.leg >= p.legs.length - 1) { const to = world.towns[p.to]; log(`${world.towns[p.from].name}'s bomber returns, ${p.dropped} bombs on ${to.name}`, 'war'); continue; }
    keep.push(p);
  }
  world.bombers = keep;
}

function launchShell(fromX, fromY, targetIdx, radius, nuke) {
  const [sx, sy] = cellCenter(Math.max(0, Math.min(world.n - 1, fromY)) * world.n + Math.max(0, Math.min(world.n - 1, fromX)));
  if (!nuke) { particles.push({ x: sx, y: sy, vx: 0, vy: 0, life: 0, max: 140, color: '#ffe866', size: Math.max(4, cellPx * 0.7), grav: 0 }); particles.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 10, vy: -12, life: 0, max: 900, color: 'smoke', size: 3, grav: -6 }); }
  const [tx, ty] = cellCenter(targetIdx);
  const dist = Math.hypot(tx - sx, ty - sy);
  missiles.push({ sx, sy, tx, ty, target: targetIdx, t0: performance.now(), dur: 500 + dist * 0.6, arc: Math.max(40, dist * (nuke ? 0.6 : 0.35)), lastSmoke: 0, radius, nuke });
}

function launchNuke(from, to) {
  stat('ev', 'nukes');
  from.nukes--; from.nukeCooldown = 600;
  const n = world.n;
  const silo = from.buildings.find(i => world.type[i] === T.SILO);
  const sx = silo >= 0 && silo !== undefined ? silo % n : from.cx, sy = silo >= 0 && silo !== undefined ? Math.floor(silo / n) : from.cy;
  launchShell(sx, sy, to.cy * n + to.cx, 9, true);
  const [px, py] = cellCenter(sy * n + sx);
  for (let k = 0; k < 40; k++) particles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 120, vy: -20 - Math.random() * 60, life: 0, max: 1200, color: 'smoke', size: 4 + Math.random() * 6, grav: -30 });
  log(`${from.name} has launched THE BOMB at ${to.name}`, 'nuke');
  for (const t of world.towns) if (t !== from && isAlive(t)) setRel(from, t, rel(from, t) - 40); // the whole valley recoils
}

function detonateNuke(targetIdx) {
  const n = world.n, cx = targetIdx % n, cy = Math.floor(targetIdx / n);
  strikeCell(cx, cy, 9);
  // Fallout: a disc plus a plume downwind. It poisons people, blocks regrowth and building, and lingers for thousands of ticks.
  const hasWind = params.windStrength > 0.05 && (params.windX !== 0 || params.windY !== 0);
  const wl = Math.hypot(params.windX, params.windY) || 1;
  const wx = hasWind ? params.windX / wl : 0, wy = hasWind ? params.windY / wl : 0;
  const plume = 12 + Math.round(params.windStrength * 28);
  for (let dy = -40; dy <= 40; dy++) for (let dx = -40; dx <= 40; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const d = Math.hypot(dx, dy);
    let dose = 0;
    if (d <= 14) dose = 255 * (1 - d / 14) * 0.9 + 25;
    if (hasWind) {
      const along = dx * wx + dy * wy, across = Math.abs(dx * wy - dy * wx);
      if (along > 0 && along < plume && across < 2 + along * 0.35) dose = Math.max(dose, 200 * (1 - along / plume) * (1 - across / (2 + along * 0.35)));
    }
    if (dose > 8) addFallout(y * n + x, Math.min(255, Math.round(dose)));
  }
  const [px, py] = cellCenter(targetIdx);
  popups.push({ x: px, y: py - 30, text: 'NUCLEAR', color: '#ffffff', t0: performance.now(), dur: 4000 });
  explosions.push({ x: px, y: py, t0: performance.now(), dur: 2600, r: 11 * cellPx, nuke: true });
  shake = 3;
  setWeather('ashfall', true);
  let nearTown = null, nd = Infinity;
  for (const t of world.towns) { const dd = Math.hypot(t.cx - cx, t.cy - cy); if (dd < nd) { nd = dd; nearTown = t; } }
  log(`The bomb falls on ${nearTown ? nearTown.name : 'the valley'}. The ground will not forget.`, 'nuke');
}

// A reactor that burns or falls to an army does not just go out.
function meltdown(i, town) {
  const n = world.n, cx = i % n, cy = (i - cx) / n, R = 7;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const d = Math.hypot(dx, dy); if (d > R) continue;
    addFallout(y * n + x, Math.round(230 * (1 - d / (R + 1))));
  }
  for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * 3; const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d); if (x >= 0 && y >= 0 && x < n && y < n && isFuel(world.type[y * n + x])) ignite(y * n + x); }
  const [px, py] = cellCenter(i);
  popups.push({ x: px, y: py - 20, text: 'MELTDOWN', color: '#b8ff2e', t0: performance.now(), dur: 4000 });
  explosions.push({ x: px, y: py, t0: performance.now(), dur: 1800, r: 5 * cellPx, nuke: false });
  shake = 2;
  if (params.weatherMode === 'auto') setWeather('ashfall', true);
  town.meltdowns = (town.meltdowns || 0) + 1; stat('ev', 'meltdowns');
  log(`MELTDOWN at ${town.name}. The reactor burns open and the land around it is poisoned for years.`, 'nuke');
}
function addFallout(i, dose) {
  if (world.fallout[i] === 0) world.falloutList.push(i);
  world.fallout[i] = Math.max(world.fallout[i], dose);
  if (world.wet[i] > 0) world.wet[i] = 0;
  dirty.add(i);
}

// Fallout decay and radiation sickness. Runs every tick but does its work in slices.
function updateFallout() {
  if (!world.falloutList.length) return;
  if (world.tick % 40 === 0) {
    const keep = [];
    for (const i of world.falloutList) { world.fallout[i] = Math.max(0, world.fallout[i] - 3); if (world.fallout[i] > 0) keep.push(i); else dirty.add(i); }
    world.falloutList = keep;
  }
  if (world.tick % 10 === 0) {
    const n = world.n;
    for (const t of world.towns) {
      if (!isAlive(t)) continue;
      let dose = 0, cells = 0;
      for (const i of t.buildings) if (isBuilding(world.type[i])) { dose += world.fallout[i]; cells++; }
      if (!cells) continue;
      dose /= cells;
      if (dose < 10) { t.sick = 0; continue; }
      const dead = Math.max(1, Math.round(t.popLeft * dose / 255 * 0.03));
      applyLosses(t, Math.min(dead, t.popLeft), 'fallout');
      if (!t.sick) { t.sick = 1; log(`A sickness no one can name spreads through ${t.name}`, 'loss'); }
      if (t.popLeft <= 0) log(`${t.name} is empty. The land is poisoned.`, 'loss');
    }
  }
}
const poisoned = i => world.fallout[i] > 40;

