/* ───────────────────────── Alignment, militia, diplomacy, war ───────────────────────── */

function rollAlignment(rng) {
  const pick = () => { const r = rng(); return r < 0.33 ? -1 : r < 0.66 ? 0 : 1; };
  return { order: pick(), moral: pick() }; // order: 1 lawful, 0 neutral, -1 chaotic. moral: 1 good, 0 neutral, -1 evil.
}
function alignName(a) {
  const o = a.order > 0 ? 'Lawful' : a.order < 0 ? 'Chaotic' : 'Neutral';
  const m = a.moral > 0 ? 'Good' : a.moral < 0 ? 'Evil' : 'Neutral';
  return o === 'Neutral' && m === 'Neutral' ? 'True Neutral' : `${o} ${m}`;
}
const isAlive = t => t.housesLeft > 0 && t.popLeft > 0;
function rel(a, b) { return a.relations[b.id] || 0; }
function setRel(a, b, v) { v = Math.max(-100, Math.min(100, v)); a.relations[b.id] = v; b.relations[a.id] = v; }
function atWar(a, b) { return !!a.wars[b.id]; }
function declareWar(a, b, why) {
  stat('ev', 'wars');
  if (atWar(a, b)) return;
  a.wars[b.id] = world.tick; b.wars[a.id] = world.tick;
  setRel(a, b, Math.min(rel(a, b), -70));
  const el = person(a, 'elder'); deed(el, `declared war on ${b.name}`);
  say(a, 'warDeclared', { other: b.name, why, elder: el ? el.name : null }, 'war'); remember(a, 'war', { who: b.name }); remember(b, 'war', { who: a.name });
  for (const t of [a, b]) { const [x, y] = cellCenter(t.cy * world.n + t.cx); popups.push({ x, y: y - t.R * cellPx - 14, text: 'WAR', color: '#ff4040', t0: performance.now(), dur: 2500 }); }
  // Leagues: a friend of the one attacked may come in.
  if (!why || !/for its ally/.test(why)) for (const o of world.towns) {
    if (o === a || o === b || !isAlive(o) || atWar(o, a) || rel(o, b) < 60 || o.align.moral < 0 || has(o, 'peacemaker') || has(o, 'hermit') || o.militia < 6) continue;
    if (Math.random() < 0.5) { log(`${o.name} will not see ${b.name} stand alone`, 'war'); declareWar(o, a, `for its ally ${b.name}`); }
  }
}
// Every few years the towns send envoys to a council at the biggest town. Something comes of it, or nothing does.
function updateCouncil() {
  const c = world.council;
  if (!c) {
    if (world.tick % (YEAR * 3) !== YEAR) return;
    const towns = world.towns.filter(t => isAlive(t) && t.popLeft >= 20 && !has(t, 'hermit'));
    if (towns.length < 3) return;
    const host = towns.slice().sort((p, q) => q.popLeft - p.popLeft)[0];
    const members = towns.filter(t => t !== host && !atWar(t, host) && sendTraveller(t, host, 'council', {}));
    if (members.length < 2) return;
    world.council = { host: host.id, at: world.tick, members: members.map(t => t.id), arrived: 0 };
    stat('ev', 'councils');
    log(`${host.name} calls a council of the valley. Envoys set out from ${members.map(t => t.name).join(', ')}.`, 'diplo');
    return;
  }
  if (c.arrived < c.members.length && world.tick - c.at < 500) return;
  world.council = null;
  const host = world.towns[c.host]; if (!host || !isAlive(host)) return;
  const members = [host].concat(c.members.map(id => world.towns[id]).filter(t => t && isAlive(t)));
  const wars = []; for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) if (atWar(members[i], members[j])) wars.push([members[i], members[j]]);
  const r = Math.random();
  spawnCrowd(host, host.cy * world.n + host.cx, 40, 8);
  if (wars.length && r < 0.5) { for (const [a, b] of wars) makePeace(a, b, 'at the council'); log(`The council at ${host.name} ends ${wars.length === 1 ? 'the war' : 'the wars'} between ${wars.map(([a, b]) => a.name + ' and ' + b.name).join(', ')}. Not everyone goes home happy.`, 'diplo'); }
  else if (r < 0.35) { const pairs = []; for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) { const a = members[i], b = members[j], key = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id; if (!(world.tradeRoads || {})[key] && Math.hypot(a.cx - b.cx, a.cy - b.cy) <= 60) pairs.push([a, b]); } const p = pairs[Math.floor(Math.random() * pairs.length)]; if (p) { const [a, b] = p; const path = roadPath(a.cy * world.n + a.cx, b.cy * world.n + b.cx); if (path && path.filter(q => world.type[q] === T.WATER).length <= 6) { const key = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id; world.tradeRoads = world.tradeRoads || {}; world.tradeRoads[key] = { a: a.id, b: b.id, path, wagonT: 0, building: true }; world.roadProjects = world.roadProjects || []; world.roadProjects.push({ key, a: a.id, b: b.id, path, k: 0, x: a.cx, y: a.cy, px: a.cx, py: a.cy, face: 1, wait: 0, water: 0, halted: false }); setRel(a, b, rel(a, b) + 10); log(`The council at ${host.name} agrees a road between ${a.name} and ${b.name}, and the stone for it`, 'diplo'); return; } } log(`The council at ${host.name} talks of roads and agrees nothing`, 'diplo'); }
  else if (r < 0.6) { world.councilWatch = world.tick + YEAR * 2; for (const t of members) setRel(host, t, rel(host, t) + 5); log(`The council at ${host.name} agrees a shared fire watch: every town will ride to a neighbour's smoke for two years`, 'diplo'); }
  else if (r < 0.8) { const a = members[Math.floor(Math.random() * members.length)]; let b = members[Math.floor(Math.random() * members.length)]; if (b === a) b = members[(members.indexOf(a) + 1) % members.length]; setRel(a, b, rel(a, b) - 12); log(`The council at ${host.name} collapses in insults between ${a.name} and ${b.name}. The envoys go home early.`, 'diplo'); }
  else { for (const t of members) t.unrest = Math.max(0, (t.unrest || 0) - 2); log(`The council at ${host.name} agrees nothing but a feast, and that goes well`, 'diplo'); }
}
function makePeace(a, b, why) {
  if (!atWar(a, b)) return;
  delete a.wars[b.id]; delete b.wars[a.id];
  setRel(a, b, Math.max(rel(a, b), -25));
  const ea = person(a, 'elder'), eb = person(b, 'elder'); deed(ea, `made peace with ${b.name}`); deed(eb, `made peace with ${a.name}`);
  say(a, 'truce', { other: b.name, why, hands: ea && eb ? `${ea.name} and ${eb.name}` : null }, 'diplo');
}

function militiaRate(t) {
  let r = 0.10 + 0.05 * t.align.order + 0.02 * (t.align.moral < 0 ? 1 : 0) + 0.015 * (t.mil || 0);
  r += 0.06 * countType(t, T.BARRACKS);
  if (govOf(t) === 'dominion') r += 0.03; // the dictator's levy
  return Math.max(0.05, r);
}

// Called every growth check (about every 16 ticks per town).
function updateMilitia(t) {
  const target = Math.round(t.popLeft * militiaRate(t));
  if (t.militia < target) t.militia += 1 + (t.align.order > 0 ? 1 : 0);
  else if (t.militia > target) t.militia = target;
  if (t.raidCooldown > 0) t.raidCooldown--;
  // Lawful towns wall themselves in once they can afford it. Walls also stop fire.
  if (t.align.order > 0 && t.popLeft >= 60 && t.R >= 3 && (t.wallR === 0 || t.R > t.wallR + 2) && canAfford(t, COST.wall) && Math.random() < 0.15) { pay(t, COST.wall); buildWall(t); } // a town that outgrows its wall rings a new one; the old ring stays as a firebreak
}

function buildWall(t) {
  const n = world.n, type = world.type, r = t.R + 1;
  let laid = 0;
  for (let dy = -r - 2; dy <= r + 2; dy++) for (let dx = -r - 2; dx <= r + 2; dx++) {
    const ra = radiusAt(t, dx, dy) + 1;
    if (Math.abs(Math.hypot(dx, dy) - ra) >= 0.55) continue;
    const x = t.cx + dx, y = t.cy + dy;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const i = y * n + x, tt = type[i];
    if (tt === T.WATER || tt === T.ROCK || isBuilding(tt) || tt === T.PAD || tt === T.HANGAR || world.road[i] || world.burnLeft[i] > 0) continue;
    if (isTree(tt)) world.treeCount--;
    type[i] = T.WALL; dirty.add(i); laid++;
  }
  if (laid < 6) return;
  t.wallR = r;
  log(`${t.name} raises a stone wall`, 'build');
}

// Relations drift and random events. Runs every 50 ticks across all living pairs.
const DIPLO_GOOD = ['sign a trade pact', 'exchange harvest surpluses', 'marry their children into each other\'s families', 'share a fire watch', 'settle an old border quarrel'];
const DIPLO_BAD = ['quarrel over grazing land', 'trade insults at the river crossing', 'accuse each other of poaching', 'come to blows at a market day', 'refuse each other\'s refugees'];
function updateDiplomacy() {
  if (--world.diploTimer > 0) return;
  world.diploTimer = 50;
  const towns = world.towns.filter(isAlive);
  for (let i = 0; i < towns.length; i++) for (let j = i + 1; j < towns.length; j++) {
    const a = towns[i], b = towns[j];
    // Drift: like attracts like, evil and chaos corrode everything.
    let d = 0;
    d += a.align.moral === b.align.moral ? 2 : (a.align.moral * b.align.moral < 0 ? -3 : -0.5);
    d += a.align.order === b.align.order ? 1 : (a.align.order * b.align.order < 0 ? -1.5 : 0);
    if (a.align.moral < 0 || b.align.moral < 0) d -= 1;
    if (a.align.order < 0 || b.align.order < 0) d += (Math.random() - 0.5) * 8;
    if (atWar(a, b)) d -= 2;
    setRel(a, b, rel(a, b) + d);
    // Events.
    if (Math.random() < 0.06) {
      const good = Math.random() < 0.5 + 0.15 * (a.align.moral + b.align.moral) - (atWar(a, b) ? 0.3 : 0);
      const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a];
      if (good) {
        const what = DIPLO_GOOD[Math.floor(Math.random() * DIPLO_GOOD.length)];
        if (/marry/.test(what)) { if (sendTraveller(x, y, 'wedding', { delta: 12 })) log(`A wedding party sets out from ${x.name} for ${y.name}`, 'diplo'); }
        else if (sendTraveller(x, y, 'envoy', { delta: 12, text: `${a.name} and ${b.name} ${what}` }) && Math.random() < 0.3) log(`An envoy sets out from ${x.name} for ${y.name}`, 'diplo');
      } else {
        const what = DIPLO_BAD[Math.floor(Math.random() * DIPLO_BAD.length)];
        if (/river crossing|market day/.test(what)) { setRel(a, b, rel(a, b) - 14); log(`${a.name} and ${b.name} ${what}`, 'diplo'); }
        else if (sendTraveller(x, y, 'envoy', { delta: -14, text: `${a.name} and ${b.name} ${what}` }) && Math.random() < 0.3) log(`An envoy sets out from ${x.name} for ${y.name}, and nobody expects good news`, 'diplo');
      }
    }
    // Envy: a militaristic town that cannot reach a metal its neighbour digs sours on that neighbour.
    for (const [x, y] of [[a, b], [b, a]]) {
      const want = militarism(x) >= 0.6 ? coveted(x, y) : null;
      if (want) {
        setRel(x, y, rel(x, y) - 2.5);
        x.covets = { town: y.id, res: want };
        if (x.covetLogged !== y.id + ':' + want) { x.covetLogged = y.id + ':' + want; log(`${x.name} covets the ${want} seams of ${y.name}`, 'diplo'); }
      } else if (x.covets && x.covets.town === y.id) x.covets = null;
    }
    // War and peace.
    const r = rel(a, b);
    if (!atWar(a, b) && r < -60) {
      const agg = a.align.moral < 0 || a.align.order < 0 ? a : (b.align.moral < 0 || b.align.order < 0 ? b : null);
      if (agg && Math.random() < 0.35 * (has(agg, 'warmonger') ? 2.5 : has(agg, 'peacemaker') ? 0.15 : has(agg, 'tyrant') ? 1.5 : 1)) { const vic = agg === a ? b : a; declareWar(agg, vic, agg.covets && agg.covets.town === vic.id ? `over the ${agg.covets.res} seams` : ''); }
    } else if (atWar(a, b)) {
      const since = world.tick - a.wars[b.id];
      const exhausted = since > 700 || Math.min(a.popLeft, b.popLeft) < 12 || (a.militia < 3 && b.militia < 3);
      const peaceful = has(a, 'peacemaker') || has(b, 'peacemaker'), stubborn = has(a, 'warmonger') || has(b, 'warmonger');
      if ((exhausted && Math.random() < (peaceful ? 0.7 : stubborn ? 0.12 : 0.3)) || r > (peaceful ? -45 : -30)) makePeace(a, b, exhausted ? 'out of exhaustion' : peaceful ? 'at the peacemaker\'s urging' : '');
    } else if (r > 60 && Math.random() < 0.05) log(`${a.name} and ${b.name} renew their alliance`, 'diplo');
  }
}

// Raids. Evil and chaotic towns start them; anyone at war does.
function maybeRaid(t) {
  if (!isAlive(t) || t.militia < 6 || t.raidCooldown > 0 || t.mobilized) return;
  const others = world.towns.filter(o => o !== t && isAlive(o));
  if (!others.length) return;
  let target = null, p = 0;
  const enemies = others.filter(o => atWar(t, o));
  if (enemies.length) { target = enemies[Math.floor(Math.random() * enemies.length)]; p = 0.009 * (has(t, 'warmonger') ? 2 : has(t, 'peacemaker') ? 0.4 : 1); }
  else if (t.align.moral < 0 || t.align.order < 0) {
    const grudges = others.filter(o => rel(t, o) < -20);
    if (grudges.length) { target = grudges[Math.floor(Math.random() * grudges.length)]; p = (t.align.moral < 0 ? 0.0015 : 0.0008) * (has(t, 'warmonger') ? 2.5 : has(t, 'tyrant') ? 1.5 : 1); }
    else if (t.align.order < 0 && t.align.moral <= 0) { target = others[Math.floor(Math.random() * others.length)]; p = 0.0003; }
  }
  if (target && target.spy && target.spy.from === t.id) p *= 1.5; // somebody inside is telling them when the walls are thin
  if (!target || Math.random() > p) return;
  // Scouts report the odds: nobody raids a garrison three times their strength unless there is a war on.
  if (!atWar(t, target) && target.militia > t.militia * 1.5) return;
  const size = Math.min(t.militia, 5 + Math.floor(Math.random() * Math.min(20, t.militia)));
  const n = world.n;
  const path = findPath(t.cx, t.cy, target.cx, target.cy);
  if (!path) return;
  t.militia -= size; t.raidCooldown = 120 + Math.floor(Math.random() * 120); t.raidsMade++;
  let armour = t.mil >= 5 ? 1 + Math.floor(size / 12) : 0, guns = t.mil >= 3 && t.mil < 5 ? 1 + Math.floor(size / 15) : 0;
  const fuel = 'oil', perTank = 2; // tanks burn oil; a town without it marches on foot
  armour = Math.min(armour, Math.floor(t.res.iron / 10), Math.floor(t.res[fuel] / perTank)); // tanks are iron and fuel
  guns = Math.min(guns, Math.floor((t.res.iron - armour * 10) / 6));
  pay(t, { iron: armour * 10 + guns * 6, [fuel]: armour * perTank });
  world.warbands.push({ from: t.id, to: target.id, x: t.cx, y: t.cy, px: t.cx, py: t.cy, face: 1, path, pi: 0, size, wait: 0, armour, guns });
  log(atWar(t, target) ? `${t.name} marches ${size} soldiers on ${target.name}` : `A raiding party of ${size} leaves ${t.name} for ${target.name}`, 'war');
}

function updateWarbands() {
  const n = world.n;
  const keep = [];
  for (const b of world.warbands) {
    const from = world.towns[b.from], to = world.towns[b.to];
    b.px = b.x; b.py = b.y;
    if (b.posse) {
      const gang = (world.firebugs || []).find(g => g.kind === 'gang' && g.name === b.posse);
      if (!gang) { from.militia += b.size; continue; }
      if (Math.hypot(b.x - gang.x, b.y - gang.y) <= 2) { posseArrives(b, gang); continue; }
      if (b.pi >= b.path.length || Math.hypot(b.path[b.path.length - 1] % n - gang.x, Math.floor(b.path[b.path.length - 1] / n) - gang.y) > 4) { const alt = findPath(b.x, b.y, gang.x, gang.y); if (alt) { b.path = alt; b.pi = 0; } else { from.militia += b.size; log(`${from.name}'s posse loses the trail and rides home`, 'war'); continue; } }
      const next = b.path[b.pi]; if (next !== undefined && passable(world.type[next]) && world.burnLeft[next] <= 0) { const nx = next % n, ny = (next - nx) / n; if (nx !== b.x) b.face = Math.sign(nx - b.x); b.x = nx; b.y = ny; b.pi++; }
      keep.push(b); continue;
    }
    if (!isAlive(to)) { from.militia += b.size; continue; } // nothing left to raid, go home
    if (world.burnLeft[b.y * n + b.x] > 0) {
      const dead = Math.max(1, Math.ceil(b.size * 0.25));
      b.size -= dead; applyLosses(from, dead, 'fire');
      if (!b.burnedOnce) { b.burnedOnce = true; log(`${from.name}'s column marches into the fire, ${dead} lost`, 'loss'); }
      if (b.size <= 0) continue;
      // Get out: step to any neighbouring cell that is not burning, then find a new route.
      let fled = false;
      for (const [ox, oy] of OFFS8) { const nx = b.x + ox, ny = b.y + oy; if (nx >= 0 && ny >= 0 && nx < n && ny < n && passable(world.type[ny * n + nx]) && world.burnLeft[ny * n + nx] <= 0) { b.x = nx; b.y = ny; fled = true; break; } }
      const alt = findPath(b.x, b.y, to.cx, to.cy); if (alt) { b.path = alt; b.pi = 0; }
      if (!fled) continue; // trapped
      keep.push(b); continue;
    }
    if (b.pi < b.path.length) {
      const next = b.path[b.pi];
      if (world.burnLeft[next] > 0 || !passable(world.type[next])) {
        if (++b.wait > 10) { const alt = findPath(b.x, b.y, to.cx, to.cy); if (alt) { b.path = alt; b.pi = 0; b.wait = 0; } else if (b.wait > 50) { from.militia += b.size; log(`${from.name}'s raiders turn back`, 'war'); continue; } }
        keep.push(b); continue;
      }
      b.wait = 0;
      const nx = next % n, ny = (next - nx) / n;
      if (nx !== b.x) b.face = Math.sign(nx - b.x);
      b.x = nx; b.y = ny; b.pi++;
    }
    if (Math.hypot(b.x - to.cx, b.y - to.cy) <= to.R + 2.5) { if (b.defect) { to.militia += b.size; log(`${from.name}'s deserters reach ${to.name}'s lines, ${b.size} spears for the other side`, 'war'); continue; } startBattle(b, from, to); continue; }
    keep.push(b);
  }
  world.warbands = keep;
  updateBattles();
}

