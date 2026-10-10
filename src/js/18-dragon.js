/* ───────────────────────── Dragon ───────────────────────── */

// Dragon kinds: hide colours (body, shade, eye) and the colour of what comes out of its mouth.
const DRAGON_KINDS = [
  { name: 'crimson',  d: '#b5392c', D: '#6e1a12', E: '#f5a623', flame: ['#ffffff', '#ffe866', '#ff6a1f'] },
  { name: 'obsidian', d: '#2b2630', D: '#0d0b10', E: '#ff3b3b', flame: ['#ffffff', '#ff8a3b', '#7a1f1f'] },
  { name: 'emerald',  d: '#2e8b4a', D: '#145229', E: '#ffe866', flame: ['#ffffff', '#b8ff7a', '#2fbf5f'] },
  { name: 'gold',     d: '#d4a52a', D: '#8a6410', E: '#5a2a00', flame: ['#ffffff', '#fff1a8', '#ffb627'] },
  { name: 'frost',    d: '#9fd3ef', D: '#4f8fb5', E: '#1a2f6b', flame: ['#ffffff', '#cfefff', '#7fb8ff'] },
  { name: 'violet',   d: '#7a3fa8', D: '#3f1f5e', E: '#ffd166', flame: ['#ffffff', '#e0a8ff', '#a855f7'] },
  { name: 'bone',     d: '#e9e2cf', D: '#9c927a', E: '#1a1a1a', flame: ['#ffffff', '#dfe8ff', '#8fd3ff'] },
];
const DRAGON_SYL = ['Vor', 'Thrax', 'Mal', 'Ash', 'Kaz', 'Ryn', 'Sol', 'Ig', 'Nys', 'Dra', 'Ur', 'Zal', 'Mor', 'Tar', 'Vel', 'Kor', 'Sha', 'Ith'];
const DRAGON_END = ['ax', 'oth', 'ris', 'mir', 'gon', 'dra', 'eth', 'ul', 'azz', 'orn', 'yx', 'ane'];
const DRAGON_EPITHET = {
  crimson: ['the Red Death', 'Ember-Tongue', 'Hearthbreaker', 'the Scald'], obsidian: ['the Black', 'Nightwing', 'Ashmaw', 'the Shadow'],
  emerald: ['the Verdant', 'Marshbane', 'Rootfire', 'the Moss-Scaled'], gold: ['Hoardlord', 'the Gilded', 'Greedclaw', 'the Magnificent'],
  frost: ['Rimefang', 'the Pale', 'Winterbreath', 'the Glacier'], violet: ['the Dusk', 'Stormwing', 'Thunderscale', 'the Twilight'],
  bone: ['the Ancient', 'Gravewind', 'the Undying', 'Old Hollow-Eye'],
};
function dragonName(kind) {
  const nm = DRAGON_SYL[Math.floor(Math.random() * DRAGON_SYL.length)] + (Math.random() < 0.5 ? DRAGON_SYL[Math.floor(Math.random() * DRAGON_SYL.length)].toLowerCase() : '') + DRAGON_END[Math.floor(Math.random() * DRAGON_END.length)];
  const ep = DRAGON_EPITHET[kind.name] || ['the Dread'];
  return `${nm} ${ep[Math.floor(Math.random() * ep.length)]}`;
}

function tintDragonFrames(kind) {
  return ['dragon0', 'dragon1'].map(k => {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const x = c.getContext('2d');
    const rows = SPRITES[k];
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const ch = rows[j][i];
      const col = ch === 'd' ? kind.d : ch === 'D' ? kind.D : ch === 'E' ? kind.E : PAL[ch];
      if (!col) continue;
      x.fillStyle = col; x.fillRect(i, j, 1, 1);
    }
    return c;
  });
}
// Nobody summons it. It is drawn to prosperity, and it just happens sometimes. Sorry.

function maybeDragon(force) {
  if (world.dragon) return;
  if (!force && (world.tick < 2400 || (world.dragonCooldown || 0) > world.tick)) return; // a year of peace to begin with, and never inside the cooldown
  const towns = world.towns.filter(t => t.popLeft > 0 && t.housesLeft > 0);
  if (!towns.length) return;
  let totalPop = 0; for (const t of towns) totalPop += t.popLeft;
  // A dragon with a grudge comes back for the same town, and sooner than a stranger would.
  const grudge = world.dragonGrudge && world.tick - world.dragonGrudge.tick < 14000 ? world.towns[world.dragonGrudge.town] : null;
  // Rare: the odds rise with the valley's riches but saturate, a mean of about five years once the valley is rich.
  if (!force && Math.random() > (0.00001 + 0.00007 * Math.min(1, totalPop / 1500)) * (grudge ? 3 : 1)) return;
  // Riches: weight by population squared.
  const pickTown = (exclude) => {
    const pool = towns.filter(t => !exclude.includes(t)); if (!pool.length) return null;
    const wgt = t => t.popLeft * t.popLeft * (has(t, 'hoarder') ? 4 : 1) * (1 + (t.res ? (t.res.coin + t.res.gold * 10) / 400 : 0));
    let sum = 0; for (const t of pool) sum += wgt(t);
    let r = Math.random() * sum; for (const t of pool) { r -= wgt(t); if (r <= 0) return t; } return pool[pool.length - 1];
  };
  const first = grudge && isAlive(grudge) ? grudge : pickTown([]);
  if (!first) return;
  // Rampage: one to three towns in a single sortie, richest first.
  const targets = [first];
  const extra = Math.random() < 0.3 ? 1 : 0, extra2 = Math.random() < 0.1 ? 1 : 0;
  for (let k = 0; k < extra + extra2; k++) { const t = pickTown(targets); if (t) targets.push(t); }
  const n = world.n;
  const edgePoint = () => { const e = Math.floor(Math.random() * 4); const k = Math.random() * n; return e === 0 ? [k, -4] : e === 1 ? [k, n + 4] : e === 2 ? [-4, k] : [n + 4, k]; };
  const legs = [edgePoint()];
  for (const town of targets) {
    const passes = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < passes; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * town.R * 0.9;
      legs.push([town.cx + Math.cos(a) * d, town.cy + Math.sin(a) * d]);
    }
  }
  legs.push(edgePoint());
  const kind = grudge ? DRAGON_KINDS.find(k => k.name === world.dragonGrudge.kind) || DRAGON_KINDS[0] : DRAGON_KINDS[Math.floor(Math.random() * DRAGON_KINDS.length)];
  const town = targets[0];
  const name = grudge && world.dragonGrudge.name ? world.dragonGrudge.name : dragonName(kind);
  world.dragon = { legs, leg: 0, t: 0, x: legs[0][0], y: legs[0][1], heading: 0, town, targets: targets.map(t => t.id), lit: 0, flap: 0, breathT: 0, kind: kind.name, name, frames: tintDragonFrames(kind), flame: kind.flame, hp: 3 + Math.floor(Math.random() * 3) };
  for (const t of targets) t.dragons = (t.dragons || 0) + 1;
  stat('ev', 'dragons'); stat('dragons', name);
  if (grudge) { say(town, 'dragonReturns', { who: name, kind: kind.name }, 'dragon'); world.dragonGrudge = null; }
  else say(town, 'dragonSeen', { who: name, kind: kind.name, then: targets.length > 1 ? targets.slice(1).map(t => t.name).join(' and ') : null }, 'dragon');
  for (const t of targets) remember(t, 'dragon', { who: name });
  const [px, py] = cellCenter(town.cy * n + town.cx);
  popups.push({ x: px, y: py - town.R * cellPx - 14, text: 'DRAGON', color: '#ff4040', t0: performance.now(), dur: 3000 });
}

function flyDragon(dtSec) {
  const d = world.dragon;
  if (!d) return;
  const speed = Math.max(8, 2 * params.speed); // 2 cells per tick, expressed per second so it matches whatever the tick rate is
  let remaining = speed * dtSec;
  while (remaining > 0 && d.leg < d.legs.length - 1) {
    const [ax, ay] = d.legs[d.leg], [bx, by] = d.legs[d.leg + 1];
    const len = Math.hypot(bx - ax, by - ay) || 0.001;
    const left = (1 - d.t) * len;
    const adv = Math.min(left, remaining);
    d.t += adv / len; remaining -= adv;
    d.x = ax + (bx - ax) * d.t; d.y = ay + (by - ay) * d.t;
    const target = Math.atan2(by - ay, bx - ax);
    let da = target - d.heading; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    d.heading += da * Math.min(1, dtSec * 4);
    if (d.t >= 0.999) { d.leg++; d.t = 0; }
  }
  // Breathe fire over whichever target it is above; the active town switches as the rampage moves on.
  if (d.targets) for (const id of d.targets) { const t = world.towns[id]; if (t && Math.hypot(d.x - t.cx, d.y - t.cy) < t.R + 2.5) { d.town = t; break; } }
  const over = Math.hypot(d.x - d.town.cx, d.y - d.town.cy) < d.town.R + 2.5 && d.leg >= 1;
  d.breathT += dtSec;
  if (over && d.breathT > 0.08) { d.breathT = 0; breathe(d); }
  if (d.leg >= d.legs.length - 1) {
    if (d.slain) { /* already announced */ }
    else if (d.driven) say(d.town, 'dragonLimps', { who: d.name || 'the dragon', lit: d.lit, loot: d.stole ? `${d.stole} coin${d.stoleGold ? ` and ${d.stoleGold} gold` : ''}` : null }, 'dragon');
    else say(d.town, 'dragonLeaves', { who: d.name || 'The dragon', lit: d.lit, loot: d.stole || d.stoleGold ? `${d.stole} coin${d.stoleGold ? ` and ${d.stoleGold} gold` : ''}` : null }, 'dragon');
    world.dragon = null;
    world.dragonCooldown = world.tick + 4800 + Math.floor(Math.random() * 4800); // two to four years before the valley sees another
  }
}

// The hoard changes everything for the town that brings it down.
function slayDragon(d, town, byJet) {
  d.legs = [[d.x, d.y], [d.x, d.y]]; d.leg = 1; d.slain = true;
  const boom = 20 + Math.floor(Math.random() * 30), hoard = 80 + Math.floor(Math.random() * 200) + (d.hoard || 0);
  town.popLeft += boom; town.popTotal += boom; world.popLeft += boom; world.popTotal += boom; town.research += 2000; town.civPts = (town.civPts || 0) + 1000; town.milPts = (town.milPts || 0) + 1000;
  town.res.coin += hoard; town.res.gold = Math.min(resCap(town, 'gold'), (town.res.gold || 0) + 6); stat('ev', 'dragonHoards', hoard);
  stat('ev', 'dragonsSlain'); if (byJet) stat('ev', 'dragonsJet'); remember(town, 'slain', { who: d.name || 'the dragon' });
  const hero = elect(town, 'slayer', true); deed(hero, `${byJet ? 'shot down' : 'slew'} ${d.name || 'the dragon'}`);
  hero.story = byJet ? `flew the jet that brought down ${d.name || 'a dragon'} and still buys the first round` : `put the killing shot into ${d.name || 'a dragon'} and has not paid for a drink since`;
  log(byJet ? `${town.name}'s jet brings down ${(d.name || 'THE DRAGON').toUpperCase()} over the fields. ${hero.name} was flying. The hoard, ${hoard} coin and a sack of gold, is picked from the wreck and draws ${boom} newcomers.` : `${town.name} SLAYS ${(d.name || 'THE DRAGON').toUpperCase()}. ${hero.name} struck the last blow. Its hoard, ${hoard} coin and a sack of gold, draws ${boom} newcomers.`, 'win');
  const [px, py] = cellCenter(Math.max(0, Math.min(world.n - 1, Math.round(d.y))) * world.n + Math.max(0, Math.min(world.n - 1, Math.round(d.x))));
  popups.push({ x: px, y: py, text: 'DRAGON SLAIN', color: '#a7e36f', t0: performance.now(), dur: 4000 });
  raiseMonument(town, `${town.name} raises a statue of ${hero.name} in the square, one foot on ${d.name || 'the dragon'}'s skull`);
}

// Fighters: the Aviation-era option. A town with an air base and jets scrambles one when a dragon comes
// for it or for a friend, and the jet makes passes until the dragon is down, the jet is burnt, or the
// dragon leaves. Four oil to build, two to fly.
function scrambleFighters(d) {
  if (!d || d.slain || d.leg < 1 || world.tick % 5 !== 0) return;
  for (const t of world.towns) {
    if (!isAlive(t) || !(t.fighters || 0) || !hasType(t, T.AIRBASE) || t.res.oil < 2) continue;
    if (world.fighters.some(f => f.from === t.id)) continue;
    const mine = d.targets.includes(t.id), friend = d.targets.some(id => world.towns[id] && world.towns[id] !== t && rel(t, world.towns[id]) >= 60 && Math.hypot(world.towns[id].cx - t.cx, world.towns[id].cy - t.cy) < 90);
    if (!mine && !friend) continue;
    if (!mine && Math.random() < 0.5) continue; // friends take a moment to decide
    const base = t.buildings.find(i => world.type[i] === T.AIRBASE); if (base === undefined) continue;
    const n = world.n, bx = base % n, by = Math.floor(base / n);
    pay(t, { oil: 2 }); stat('ev', 'sorties');
    world.fighters.push({ x: bx, y: by, home: base, from: t.id, heading: Math.atan2(d.y - by, d.x - bx), wp: null, passT: 0, hits: 0, state: 'out' });
    say(t, 'scramble', { who: d.name || 'the dragon', forTown: mine ? null : world.towns[d.targets[0]].name }, 'dragon');
  }
}
function loseFighter(f, why) {
  const t = world.towns[f.from];
  if (t) t.fighters = Math.max(0, (t.fighters || 0) - 1);
  stat('ev', 'fightersLost');
  const n = world.n, x = Math.max(0, Math.min(n - 1, Math.round(f.x))), y = Math.max(0, Math.min(n - 1, Math.round(f.y)));
  const [sx, sy] = cellCenter(y * n + x);
  missiles.push({ sx, sy: sy - cellPx * 5, tx: sx, ty: sy, target: y * n + x, t0: performance.now(), dur: 500, arc: 0, lastSmoke: 0, radius: 1, nuke: false });
  log(why, 'dragon');
}
function flyFighters(dtSec) {
  if (!world.fighters || !world.fighters.length) return;
  const d = world.dragon && !world.dragon.slain ? world.dragon : null;
  const speed = Math.max(14, 3.5 * params.speed); // faster than any dragon
  const keep = [];
  for (const f of world.fighters) {
    const t = world.towns[f.from];
    if (!t) continue;
    if (f.state === 'out' && (!d || d.leg >= d.legs.length - 1)) { f.state = 'home'; f.wp = null; }
    if (f.state === 'out') {
      f.passT += dtSec;
      const dist = Math.hypot(d.x - f.x, d.y - f.y);
      if (f.over > 0) f.over -= dtSec; else f.wp = [d.x + Math.cos(d.heading) * 1.5, d.y + Math.sin(d.heading) * 1.5]; // chase the dragon itself, not where it was
      if (dist < 2.5 && f.passT > 0.7) {
        f.passT = 0; f.over = 0.35;
        f.wp = [f.x + Math.cos(f.heading) * 9, f.y + Math.sin(f.heading) * 9]; // overshoot, then come round again
        const r = Math.random();
        if (r < 0.3) {
          f.hits++; shake = Math.max(shake, 0.2);
          const [px, py] = cellCenter(Math.max(0, Math.min(world.n - 1, Math.round(d.y))) * world.n + Math.max(0, Math.min(world.n - 1, Math.round(d.x))));
          for (let k = 0; k < 6; k++) particles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0, max: 300, color: '#ffe866', size: Math.max(2, cellPx * 0.3), grav: 60 });
          if (--d.hp <= 0) { slayDragon(d, t, true); f.state = 'home'; f.wp = null; }
          else if (Math.random() < 0.4) say(t, 'jetRakes', { who: d.name || 'the dragon' }, 'dragon');
        } else if (r < 0.4) { loseFighter(f, `${d.name || 'The dragon'} turns and catches ${t.name}'s jet in its breath. The pilot does not get out.`); continue; }
      }
    }
    if (f.state === 'home') {
      const n = world.n;
      if (world.type[f.home] !== T.AIRBASE) { loseFighter(f, `${t.name}'s jet comes home to a burnt air base and goes down in the fields`); continue; }
      f.wp = [f.home % n, Math.floor(f.home / n)];
      if (Math.hypot(f.wp[0] - f.x, f.wp[1] - f.y) < 0.8) { if (f.hits) say(t, 'jetLands', { n: f.hits }, 'dragon'); continue; }
    }
    const target = Math.atan2(f.wp[1] - f.y, f.wp[0] - f.x);
    let da = target - f.heading; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    f.heading += da * Math.min(1, dtSec * 8);
    const step = speed * dtSec;
    f.x += Math.cos(f.heading) * step; f.y += Math.sin(f.heading) * step;
    keep.push(f);
  }
  world.fighters = keep;
}
function breathe(d) {
  const n = world.n;
  const cx = Math.round(d.x), cy = Math.round(d.y);
  world.dragonfire = true;
  if (d.town && d.town.res) { // a dragon takes what glitters
    const coin = Math.min(Math.floor(d.town.res.coin), Math.max(d.town.res.coin >= 1 ? 1 : 0, Math.floor(d.town.res.coin * 0.12))), gold = d.town.res.gold || 0;
    if (coin || gold) { d.town.res.coin -= coin; d.town.res.gold = 0; d.hoard = (d.hoard || 0) + coin + gold * 15; d.stole = (d.stole || 0) + coin; d.stoleGold = (d.stoleGold || 0) + gold; stat('ev', 'dragonLoot', coin + gold * 15); }
  }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (dx * dx + dy * dy > 4.5) continue;
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x;
    if (!isFuel(world.type[i]) || world.burnLeft[i] > 0) continue;
    if (Math.random() < (dx * dx + dy * dy <= 1 ? (world.mat[i] ? 0.25 : 0.8) : (world.mat[i] ? 0.08 : 0.45))) { // slate takes dragonfire badly, but it takes it
      world.wet[i] = 0; // dragonfire does not care about your hoses
      d.cells = (d.cells || 0) + 1;
      if (isBuilding(world.type[i])) d.lit++;
      ignite(i);
      world.intensity[i] = isTree(world.type[i]) ? 1 : 0;
    }
  }
  world.dragonfire = false;
  shake = Math.max(shake, 0.35);
  // Anyone fighting fire under it is in trouble.
  d.town.crews = d.town.crews.filter(c => { if (Math.hypot(c.x - cx, c.y - cy) <= 2 && Math.random() < 0.5) { loseCrew(d.town, c, 'burned by the dragon'); return false; } return true; });
  // Militia and guns wound it; it takes several hits to drive off, and a kill needs rifles or better.
  if (d.town.militia >= 8 && Math.random() < Math.min(0.3, (d.town.militia / 250) * (1 + 0.6 * d.town.mil)) && --d.hp <= 0) {
    d.legs = [d.legs[Math.min(d.leg, d.legs.length - 1)], d.legs[d.legs.length - 1]]; d.leg = 0; d.t = 0; d.driven = true;
    const lost = Math.min(d.town.militia, 2 + Math.floor(Math.random() * 4)); applyLosses(d.town, lost, 'dragon'); d.town.militia -= lost;
    if (d.town.mil >= 4 && Math.random() < 0.35) slayDragon(d, d.town, false); // rifles and up can bring it down
    else {
      stat('ev', 'dragonsDriven'); say(d.town, 'dragonDriven', { who: d.name || 'the dragon', lost }, 'win');
      world.dragonGrudge = { town: d.town.id, tick: world.tick, kind: d.kind, name: d.name };
    }
  }
  const [px, py] = cellCenter(Math.max(0, Math.min(n - 1, cy)) * n + Math.max(0, Math.min(n - 1, cx)));
  for (let k = 0; k < 4; k++) particles.push({ x: px + (Math.random() - 0.5) * cellPx * 2, y: py - cellPx * 1.5, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 60, life: 0, max: 350, color: Math.random() < 0.5 ? '#ffe866' : '#ff6a1f', size: Math.max(2, cellPx * 0.4), grav: 40 });
}

