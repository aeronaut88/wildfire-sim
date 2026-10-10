/* ───────────────────────── Air tanker ───────────────────────── */

function updateAir() {
  const air = world.air;
  if (!air) return;
  if (air.cooldown > 0) air.cooldown--;
  const ownerTown = world.towns.find(t => t.name === air.owner || air.owner.startsWith(t.name));
  if (air.sorties < air.max && ++air.regen >= 160) {
    air.regen = 0;
    if (!ownerTown || ownerTown.res.oil >= 2) { if (ownerTown) ownerTown.res.oil -= 2; air.sorties++; say(ownerTown || null, 'tankerReady', { n: air.sorties }, 'good'); }
    else if (!air.dryLogged || world.tick - air.dryLogged > 600) { air.dryLogged = world.tick; say(ownerTown, 'tankerGrounded', {}, 'loss'); }
  }
  if (air.plane || air.sorties <= 0 || air.cooldown > 0) return;
  let target = null;
  for (const t of world.towns) {
    if (!t.mobilized || t.nearestFire < 0 || t.fireDist > t.R + 10 || t.housesLeft === 0) continue;
    if (ownerTown && t !== ownerTown && (atWar(ownerTown, t) || rel(ownerTown, t) < -40)) continue; // not for the enemy
    const score = t.fireDist - (t === ownerTown ? 6 : 0) - (ownerTown && rel(ownerTown, t) >= 60 ? 3 : 0);
    if (!target || score < target._score) { target = t; target._score = score; }
  }
  if (!target) return;
  const n = world.n;
  const fx = target.nearestFire % n, fy = Math.floor(target.nearestFire / n);
  const ex = target.cx + Math.cos(target.fireDir) * (target.R + 1.5);
  const ey = target.cy + Math.sin(target.fireDir) * (target.R + 1.5);
  const mx = (fx + ex) / 2, my = (fy + ey) / 2;
  const perp = target.fireDir + Math.PI / 2;
  const half = 5 + Math.round(target.R * 0.6);
  const ax = mx - Math.cos(perp) * half, ay = my - Math.sin(perp) * half;
  const bx = mx + Math.cos(perp) * half, by = my + Math.sin(perp) * half;
  const overshoot = 6;
  const p0 = [ax - Math.cos(perp) * overshoot, ay - Math.sin(perp) * overshoot];
  const p1 = [bx + Math.cos(perp) * overshoot, by + Math.sin(perp) * overshoot];
  const base = [air.x, air.y];
  air.plane = { legs: [base, p0, p1, base], leg: 0, t: 0, x: air.x, y: air.y, heading: 0, dropped: new Set(), lineA: [ax, ay], lineB: [bx, by], forTown: target.id };
  air.sorties--;
  air.cooldown = 45;
  say(target, 'tankerLaunch', { n: air.sorties }, 'good');
}

function flyPlane(dtSec) {
  const air = world.air;
  if (!air || !air.plane) return;
  const p = air.plane;
  const speed = Math.max(20, 5 * params.speed); // 5 cells per tick, expressed per second so it matches whatever the tick rate is
  let remaining = speed * dtSec;
  while (remaining > 0 && p.leg < p.legs.length - 1) {
    const [ax, ay] = p.legs[p.leg], [bx, by] = p.legs[p.leg + 1];
    const len = Math.hypot(bx - ax, by - ay) || 0.001;
    const left = (1 - p.t) * len;
    const adv = Math.min(left, remaining);
    p.t += adv / len; remaining -= adv;
    p.x = ax + (bx - ax) * p.t; p.y = ay + (by - ay) * p.t;
    p.heading = Math.atan2(by - ay, bx - ax);
    if (p.leg === 1) dropAt(p);
    if (p.t >= 0.999) {
      if (p.leg === 1) say(world.towns[p.forTown] || null, 'tankerDrop', { n: p.dropped.size }, 'good');
      p.leg++; p.t = 0;
    }
  }
  if (p.leg >= p.legs.length - 1) air.plane = null;
}

function dropAt(p) {
  const n = world.n;
  const [ax, ay] = p.lineA, [bx, by] = p.lineB;
  const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
  const u = ((p.x - ax) * vx + (p.y - ay) * vy) / L2;
  if (u < 0 || u > 1) return;
  const cx = Math.round(p.x), cy = Math.round(p.y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x;
    if (p.dropped.has(i)) continue;
    p.dropped.add(i);
    if (isFuel(world.type[i]) || world.burnLeft[i] > 0) extinguish(i, 40, 2);
    const [px, py] = cellCenter(i);
    particles.push({ x: px, y: py - cellPx * 2, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 40, life: 0, max: 500, color: '#ff7a9a', size: Math.max(2, cellPx * 0.35), grav: 60 });
  }
}

