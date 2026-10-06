/* ───────────────────────── Battles you can watch ───────────────────────── */

// Attackers form up where the warband arrived; defenders line up between them and the town (on the wall if there is one).
function startBattle(b, from, to) {
  stat('ev', 'battles');
  const n = world.n;
  const ang = Math.atan2(b.y - to.cy, b.x - to.cx);
  const defenders = to.militia; to.militia = 0;
  const wallR = to.wallR ? radiusAt(to, Math.cos(ang), Math.sin(ang)) + 1 : 0;
  const lineR = wallR || radiusAt(to, Math.cos(ang), Math.sin(ang)) + 0.5;
  const mk = (count, r, spreadA, spreadR) => { const out = []; for (let k = 0; k < Math.min(count, 14); k++) { const a = ang + (Math.random() - 0.5) * spreadA, rr = r + (Math.random() - 0.5) * spreadR; out.push({ x: to.cx + Math.cos(a) * rr, y: to.cy + Math.sin(a) * rr, face: 1, hp: 1 }); } return out; };
  const battle = { from: from.id, to: to.id, ang, att: b.size, def: defenders, att0: b.size, def0: defenders, attAgents: mk(b.size, lineR + 3.5, 1.1, 2), defAgents: mk(defenders, lineR, 1.0, 0.6), ticks: 0, maxTicks: 40 + Math.floor(b.size / 2), proj: [], attCarry: 0, defCarry: 0, lineR, siegeT: 0, lit: 0, armour: b.armour || 0, guns: b.guns || 0, tanks: [] };
  for (let k = 0; k < (b.armour || 0) + (b.guns || 0); k++) { const a = ang + (Math.random() - 0.5) * 0.9, rr = lineR + 4.5 + Math.random(); battle.tanks.push({ x: to.cx + Math.cos(a) * rr, y: to.cy + Math.sin(a) * rr, tank: k < (b.armour || 0) }); }
  world.battles.push(battle);
  to.raidsSuffered++;
  if (!to.mobilized && to.housesLeft > 0) { to.lastThreat = world.tick; }
  const [px, py] = cellCenter(to.cy * n + to.cx);
  popups.push({ x: px, y: py - to.R * cellPx - 14, text: 'BATTLE', color: '#ffb08a', t0: performance.now(), dur: 2000 });
  log(`${from.name}'s ${b.size} meet ${to.name}'s ${defenders} ${to.wallR ? 'at the wall' : 'outside the town'}`, 'war');
}

const WEAPON = ['arrows', 'arrows', 'bolts', 'muskets', 'rifles', 'guns', 'guns'];

function updateBattles() {
  if (!world.battles.length) return;
  const keep = [];
  for (const bt of world.battles) {
    const from = world.towns[bt.from], to = world.towns[bt.to];
    bt.ticks++;
    const attPow = (0.7 + Math.random() * 0.6) * (1 + 0.35 * from.mil) * (1 + 0.25 * bt.armour + 0.12 * bt.guns);
    const defPow = (0.7 + Math.random() * 0.6) * (1 + 0.3 * to.mil) * (to.wallR ? 1.5 : 1) * (to.align.order > 0 ? 1.2 : 1);
    // Casualties this tick (fractions carry over).
    bt.defCarry += bt.att * attPow * 0.025; bt.attCarry += Math.max(1, bt.def) * defPow * 0.025;
    // No more than a slice of either side falls per tick, so even a rout takes a while to watch.
    const defDead = Math.min(bt.def, Math.floor(bt.defCarry), Math.max(1, Math.ceil(bt.def * 0.12))), attDead = Math.min(bt.att, Math.floor(bt.attCarry), Math.max(1, Math.ceil(bt.att * 0.12)));
    bt.defCarry -= defDead; bt.attCarry -= attDead;
    bt.def -= defDead; bt.att -= attDead;
    applyLosses(to, defDead); applyLosses(from, attDead);
    // Visuals: volleys, fallen soldiers, siege fire.
    const volleys = Math.min(6, 1 + Math.floor((bt.att + bt.def) / 8));
    for (let k = 0; k < volleys; k++) {
      if (bt.attAgents.length && bt.defAgents.length) {
        const a = bt.attAgents[Math.floor(Math.random() * bt.attAgents.length)], d = bt.defAgents[Math.floor(Math.random() * bt.defAgents.length)];
        if (Math.random() < 0.5) shoot(bt, a, d, from.mil); else shoot(bt, d, a, to.mil);
      }
    }
    for (let k = 0; k < defDead && bt.defAgents.length > 1; k++) fall(bt.defAgents.splice(Math.floor(Math.random() * bt.defAgents.length), 1)[0]);
    for (let k = 0; k < attDead && bt.attAgents.length > 1; k++) fall(bt.attAgents.splice(Math.floor(Math.random() * bt.attAgents.length), 1)[0]);
    // Shuffle the lines a little so they look alive.
    for (const ag of bt.attAgents) { ag.x += (Math.random() - 0.5) * 0.4; ag.y += (Math.random() - 0.5) * 0.4; }
    for (const ag of bt.defAgents) { ag.x += (Math.random() - 0.5) * 0.25; ag.y += (Math.random() - 0.5) * 0.25; }
    // Tanks and field guns shell the defenders' line.
    if (bt.tanks.length && bt.ticks % 3 === 0 && bt.defAgents.length) {
      const g = bt.tanks[Math.floor(Math.random() * bt.tanks.length)], d = bt.defAgents[Math.floor(Math.random() * bt.defAgents.length)];
      const n = world.n;
      launchShell(Math.round(g.x), Math.round(g.y), Math.max(0, Math.min(n * n - 1, Math.round(d.y) * n + Math.round(d.x))), 0, false);
    }
    // Siege engines and better lob fire into the town while the fight goes on.
    if (from.mil >= 2 && ++bt.siegeT >= (from.mil >= 5 ? 2 : 4) && bt.att > 0) {
      bt.siegeT = 0;
      const homes = to.buildings.filter(i => isBuilding(world.type[i]) && world.burnLeft[i] <= 0);
      if (homes.length && bt.attAgents.length) {
        const a = bt.attAgents[0];
        const n = world.n;
        launchShell(Math.round(a.x), Math.round(a.y), homes[Math.floor(Math.random() * homes.length)], from.mil >= 5 ? 1 : 0, false);
      }
    }
    if (bt.att <= 0 || bt.def <= 0 || bt.ticks >= bt.maxTicks) { finishBattle(bt, from, to); continue; }
    keep.push(bt);
  }
  world.battles = keep;
}

function shoot(bt, a, d, tech) {
  const n = world.n;
  const kind = tech <= 1 ? 'arrow' : tech === 2 ? 'bolt' : tech <= 4 ? 'musket' : 'gun';
  bt.proj.push({ x0: a.x, y0: a.y, x1: d.x + (Math.random() - 0.5) * 0.8, y1: d.y + (Math.random() - 0.5) * 0.8, t0: performance.now(), dur: kind === 'arrow' || kind === 'bolt' ? 420 : 160, kind });
  if (kind === 'musket' || kind === 'gun') {
    const [px, py] = cellCenter(Math.max(0, Math.min(n * n - 1, Math.round(a.y) * n + Math.round(a.x))));
    particles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 10, vy: -8, life: 0, max: 700, color: 'smoke', size: kind === 'gun' ? 4 : 2.5, grav: -5 });
    if (kind === 'gun') particles.push({ x: px, y: py, vx: 0, vy: 0, life: 0, max: 120, color: '#ffe866', size: 5, grav: 0 });
  }
  if (bt.proj.length > 60) bt.proj.splice(0, bt.proj.length - 60);
}
function fall(ag) {
  const n = world.n;
  const [px, py] = cellCenter(Math.max(0, Math.min(n * n - 1, Math.round(ag.y) * n + Math.round(ag.x))));
  for (let k = 0; k < 3; k++) particles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, life: 0, max: 400, color: '#b5392c', size: 2, grav: 120 });
}

function finishBattle(bt, from, to) {
  const n = world.n;
  const [cx, cy] = cellCenter(to.cy * n + to.cx);
  to.militia += Math.max(0, bt.def);
  if (bt.def <= 0 && bt.att > 0) {
    // Overrun: torch homes, carry people off.
    // A sack is a catastrophe: a third to two thirds of the homes burn, workshops are wrecked, people are carried off, and evil puts the rest to the sword.
    const torch = Math.min(to.housesLeft, Math.max(2, Math.round(to.housesLeft * (0.3 + Math.random() * 0.35) * (from.mil >= 3 ? 1.3 : 1) * (to.spy && to.spy.from === from.id ? 1.3 : 1))));
    let captives = Math.min(Math.max(0, to.popLeft - 1), Math.round(bt.att * (1 + Math.random())));
    world.raidfire = true;
    const homes = to.buildings.filter(i => isHome(world.type[i]) && world.burnLeft[i] <= 0).sort(() => Math.random() - 0.5);
    for (let k = 0; k < torch && k < homes.length; k++) ignite(homes[k]);
    let wrecked = 0;
    for (const i of to.buildings) { const tt = world.type[i]; if ((tt === T.BARRACKS || tt === T.FORGE || tt === T.FACTORY || tt === T.UNIVERSITY || tt === T.SILO || tt === T.STATION) && Math.random() < 0.5) { onBuildingDestroyed(i, 'blast'); world.type[i] = T.RUBBLE; world.burnLeft[i] = 0; dirty.add(i); wrecked++; } }
    world.raidfire = false;
    captives = Math.max(0, Math.min(captives, to.popLeft));
    to.popLeft -= captives; from.popLeft += captives; from.popTotal += captives;
    if (to.livestock && from.livestock) { const taken = []; for (const k of LIVESTOCK) { const d = Math.floor((to.livestock[k] || 0) * 0.5); if (d > 0) { to.livestock[k] -= d; from.livestock[k] = (from.livestock[k] || 0) + d; taken.push(`${d} ${k}`); } } if (taken.length) log(`${from.name} drives off ${taken.join(', ')} from ${to.name}'s pastures`, 'war'); }
    if (to.res && from.res) { const loot = []; for (const k of RES_KINDS) { const amt = Math.floor((to.res[k] || 0) * 0.6); if (amt > 0) { to.res[k] -= amt; addRes(from, k, amt); loot.push(`${amt} ${k}`); } } if (loot.length) log(`${from.name} carries off ${loot.join(', ')} from ${to.name}`, 'war'); }
    let sword = 0;
    if (from.align.moral < 0) { sword = Math.min(to.popLeft, Math.round(to.popLeft * (0.1 + Math.random() * 0.25))); applyLosses(to, sword, 'put to the sword'); }
    from.militia += bt.att;
    stat('ev', 'sacks');
    popups.push({ x: cx, y: cy - to.R * cellPx - 14, text: 'SACKED', color: '#ff4040', t0: performance.now(), dur: 2500 });
    log(`${from.name} sacks ${to.name}: ${bt.def0} defenders dead, ${torch} homes torched${wrecked ? `, ${wrecked} buildings wrecked` : ''}${captives ? `, ${captives} carried off` : ''}${sword ? `, ${sword} put to the sword` : ''}`, 'war');
    if (to.popLeft < 10 || to.housesLeft - torch < 2) { // razed
      for (const i of to.buildings) if (isBuilding(world.type[i])) { onBuildingDestroyed(i, 'blast'); world.type[i] = T.RUBBLE; world.burnLeft[i] = 0; dirty.add(i); }
      to.housesLeft = 0;
      log(`${to.name} is razed to the ground by ${from.name}`, 'war');
    }
    setRel(from, to, rel(from, to) - 30);
    if (!atWar(from, to) && (to.align.order > 0 || to.align.moral > 0) && Math.random() < 0.6) declareWar(to, from, 'in answer to the raid');
    // Lawful-evil conquerors with the numbers may simply take the place.
    if (atWar(from, to) && from.align.moral < 0 && from.align.order > 0 && to.popLeft < from.popLeft * 0.25 && Math.random() < 0.5) annex(from, to);
  } else if (bt.att <= 0) {
    popups.push({ x: cx, y: cy - to.R * cellPx - 14, text: 'REPELLED', color: '#a7e36f', t0: performance.now(), dur: 2000 });
    log(`${to.name} holds. ${from.name} lost all ${bt.att0}${to.wallR ? ' at the wall' : ''}, ${bt.def0 - bt.def} defenders fell`, 'war');
    setRel(from, to, rel(from, to) - 15);
  } else {
    from.militia += bt.att;
    popups.push({ x: cx, y: cy - to.R * cellPx - 14, text: 'WITHDRAWN', color: '#ffb08a', t0: performance.now(), dur: 2000 });
    log(`${from.name} withdraws from ${to.name} after a bloody day: ${bt.att0 - bt.att} attackers and ${bt.def0 - bt.def} defenders dead`, 'war');
    setRel(from, to, rel(from, to) - 10);
  }
}

// Conquest: the town changes hands, keeps its name with a note, takes the victor's alignment.
function annex(from, to) {
  stat('ev', 'annexes');
  to.align = { ...from.align };
  to.relations = {}; to.wars = {};
  for (const o of world.towns) { if (o !== to) { delete o.wars[to.id]; o.relations[to.id] = o === from ? 100 : rel(o, from); to.relations[o.id] = o === from ? 100 : rel(o, from); } }
  to.name = `${to.name.replace(/\s*\(.*\)$/, '')} (${from.name.replace(/\s*\(.*\)$/, '')})`; // a town taken twice shows only its newest master
  to.master = from.id; // and pays tribute from its stockpiles
  to.mil = Math.max(to.mil, from.mil - 1); to.civ = Math.max(to.civ, from.civ - 1);
  log(`${from.name} annexes ${to.name}. Its people now answer to new masters.`, 'war');
}

// (raids now play out as battles; see startBattle/updateBattles/finishBattle)

function applyLosses(t, dead, cause) {
  dead = Math.min(dead, t.popLeft);
  if (dead <= 0) return;
  if (cause === 'battle' || cause === 'dragon' || cause === 'fallout') dead -= heal(t, dead, cause);
  if (dead <= 0) return;
  t.popLeft -= dead; world.popLeft -= dead; world.deaths += dead; t.deaths += dead;
  stat('deaths', cause || 'battle', dead); stat('deathsTown', t.name, dead);
  if (t.people && Math.random() < 0.5 * dead / Math.max(1, t.popLeft + dead)) killNotable(t, cause || 'battle');
}

// Allies send fire crews when a friend rallies.
function maybeSendAid(town) {
  for (const o of world.towns) {
    if (o === town || !isAlive(o) || o.mobilized || rel(o, town) < 60 || o.align.moral < 0 || o.popLeft < 30 || has(o, 'hermit')) continue;
    if (Math.random() > 0.6) continue;
    const k = 1 + Math.floor(Math.random() * 3);
    const home = musterPoint(o); if (home < 0) continue;
    const hx = home % world.n, hy = Math.floor(home / world.n);
    for (let c = 0; c < k; c++) town.crews.push({ x: hx, y: hy, px: hx, py: hy, size: 3 + Math.floor(Math.random() * 3), target: -1, progress: 0, mode: 'dig', face: 1 });
    log(`${o.name} sends ${k} crew${k > 1 ? 's' : ''} to help ${town.name}`, 'good');
  }
}

