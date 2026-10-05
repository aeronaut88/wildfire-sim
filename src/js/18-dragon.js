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
  if (!force && world.tick < 400) return;
  const towns = world.towns.filter(t => t.popLeft > 0 && t.housesLeft > 0);
  if (!towns.length) return;
  let totalPop = 0; for (const t of towns) totalPop += t.popLeft;
  if (!force && Math.random() > 0.00001 + 0.00005 * (totalPop / 300)) return;
  // Riches: weight by population squared. A dragon with a grudge comes back for the same town.
  const grudge = world.dragonGrudge && world.tick - world.dragonGrudge.tick < 4000 ? world.towns[world.dragonGrudge.town] : null;
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
  const extra = Math.random() < 0.55 ? 1 : 0, extra2 = Math.random() < 0.25 ? 1 : 0;
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
  if (grudge) { log(`${name}, the ${kind.name} dragon, returns for ${town.name}`, 'dragon'); world.dragonGrudge = null; }
  else log(`${name.toUpperCase()}, a ${kind.name} dragon, has been sighted making for ${town.name}${targets.length > 1 ? ' and then ' + targets.slice(1).map(t => t.name).join(' and ') : ''}`, 'dragon');
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
    else if (d.driven) log(`${d.name || 'The dragon'} limps away from ${d.town.name}. ${d.lit} building${d.lit === 1 ? '' : 's'} set ablaze before the archers found their range${d.stole ? `, ${d.stole} coin${d.stoleGold ? ` and ${d.stoleGold} gold` : ''} gone with it` : ''}.`, 'dragon');
    else log(`${d.name || 'The dragon'} leaves ${d.town.name} burning. ${d.lit} building${d.lit === 1 ? '' : 's'} set ablaze${d.stole || d.stoleGold ? `, and it flies off with ${d.stole} coin${d.stoleGold ? ` and ${d.stoleGold} gold` : ''} for its hoard` : ''}.`, 'dragon');
    world.dragon = null;
  }
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
    if (Math.random() < (dx * dx + dy * dy <= 1 ? 0.8 : 0.45)) {
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
    if (d.town.mil >= 4 && Math.random() < 0.35) {
      // Rifles and up can bring it down. The hoard changes everything for the town.
      d.legs = [[d.x, d.y], [d.x, d.y]]; d.leg = 1; d.slain = true;
      const boom = 20 + Math.floor(Math.random() * 30), hoard = 80 + Math.floor(Math.random() * 200) + (d.hoard || 0);
      d.town.popLeft += boom; d.town.popTotal += boom; world.popLeft += boom; world.popTotal += boom; d.town.research += 2000; d.town.civPts = (d.town.civPts || 0) + 1000; d.town.milPts = (d.town.milPts || 0) + 1000;
      d.town.res.coin += hoard; d.town.res.gold = Math.min(resCap(d.town, 'gold'), (d.town.res.gold || 0) + 6); stat('ev', 'dragonHoards', hoard);
      stat('ev', 'dragonsSlain'); const hero = elect(d.town, 'slayer', true); deed(hero, `slew ${d.name || 'the dragon'}`); hero.story = `put the killing shot into ${d.name || 'a dragon'} and has not paid for a drink since`;
      log(`${d.town.name} SLAYS ${(d.name || 'THE DRAGON').toUpperCase()}. ${hero.name} struck the last blow. Its hoard, ${hoard} coin and a sack of gold, draws ${boom} newcomers.`, 'win');
      const [px, py] = cellCenter(Math.round(d.y) * world.n + Math.round(d.x));
      popups.push({ x: px, y: py, text: 'DRAGON SLAIN', color: '#a7e36f', t0: performance.now(), dur: 4000 });
    } else {
      stat('ev', 'dragonsDriven'); log(`${d.town.name}'s militia drives the dragon off! ${lost} archers lost. It will remember.`, 'win');
      world.dragonGrudge = { town: d.town.id, tick: world.tick, kind: d.kind, name: d.name };
    }
  }
  const [px, py] = cellCenter(Math.max(0, Math.min(n - 1, cy)) * n + Math.max(0, Math.min(n - 1, cx)));
  for (let k = 0; k < 4; k++) particles.push({ x: px + (Math.random() - 0.5) * cellPx * 2, y: py - cellPx * 1.5, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 60, life: 0, max: 350, color: Math.random() < 0.5 ? '#ffe866' : '#ff6a1f', size: Math.max(2, cellPx * 0.4), grav: 40 });
}

