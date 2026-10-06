/* ───────────────────────── Traders from beyond the hills ─────────────────────────
   Now and then a caravan comes in off the map edge bound for a town, holds a market day, and
   leaves. It buys what the town has too much of and sells what the town cannot get for itself.
   Evil towns sometimes just take the goods, and then no caravan comes for a long while. */
function updateTrader() {
  const n = world.n, tr = world.trader;
  if (!tr) {
    // Caravans follow the roads' seasons: thick in summer and autumn, thin in spring, almost none in the snow.
    const sea = season(), seasonMul = world.weather.kind === 'snow' ? 0 : sea === 1 ? 1.7 : sea === 2 ? 1.3 : sea === 0 ? 0.9 : 0.3;
    if (world.tick < 250 || world.tick < world.nextTrader || world.tick < world.traderWary || Math.random() > 0.004 * seasonMul) return;
    const living = world.towns.filter(isAlive); if (!living.length) return;
    // Smaller towns get a little extra attention, so the valley is not just one superpower's market.
    const weights = living.map(t => (20 + t.popLeft * 0.5 + Math.max(0, 90 - t.popLeft)) * (has(t, 'merchant') ? 2.5 : has(t, 'hermit') ? 0.25 : 1)); let r = Math.random() * weights.reduce((a, b) => a + b, 0), town = living[0];
    for (let k = 0; k < living.length; k++) { r -= weights[k]; if (r <= 0) { town = living[k]; break; } }
    const edges = [[town.cx, 0], [town.cx, n - 1], [0, town.cy], [n - 1, town.cy]];
    edges.sort((a, b) => Math.hypot(a[0] - town.cx, a[1] - town.cy) - Math.hypot(b[0] - town.cx, b[1] - town.cy));
    let [ex, ey] = edges[Math.random() < 0.7 ? 0 : 1];
    for (let k = 0; k < n && !passable(world.type[ey * n + ex]); k++) { if (ey === 0 || ey === n - 1) ex = (ex + 1) % n; else ey = (ey + 1) % n; }
    const path = findPath(ex, ey, town.cx, town.cy); if (!path) { world.nextTrader = world.tick + 30; return; }
    // Modest loads: a little of this and that. Oil now and then; uranium once in a long while, and only a few units.
    const pool = ['wood', 'wood', 'stone', 'stone', 'iron', 'iron', 'copper', 'coal', 'coal', 'fish', 'fish', 'oil', 'herbs', 'cattle', 'pigs', 'sheep', 'chickens'];
    const stock = {}; const kinds = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < kinds; k++) { const kind = pool[Math.floor(Math.random() * pool.length)]; stock[kind] = (stock[kind] || 0) + (LIVESTOCK.includes(kind) ? (kind === 'chickens' ? 3 : 1) + Math.floor(Math.random() * 3) : 6 + Math.floor(Math.random() * 10)); }
    if (Math.random() < 0.04) stock.uranium = 1 + Math.floor(Math.random() * 3);
    world.trader = { x: ex, y: ey, px: ex, py: ey, face: 1, path, pi: 0, town: town.id, stock, coin: 50 + Math.floor(Math.random() * 60), phase: 'in', linger: 0, wait: 0 };
    stat('ev', 'caravans');
    log(`A trader's caravan appears on the ${ey === 0 ? 'north' : ey === n - 1 ? 'south' : ex === 0 ? 'west' : 'east'} edge, bound for ${town.name}`, 'build');
    return;
  }
  tr.px = tr.x; tr.py = tr.y;
  const here = tr.y * n + tr.x;
  if (world.burnLeft[here] > 0) { world.trader = null; world.nextTrader = world.tick + 400; log('The caravan burns on the road. Nothing is left of the goods.', 'loss'); return; }
  const town = world.towns[tr.town];
  if (tr.phase === 'market') {
    if (--tr.linger > 0) return;
    tr.phase = 'out'; tr.path = tr.path.slice(0, tr.pi).reverse(); tr.pi = 0;
    return;
  }
  if (tr.pi >= tr.path.length) {
    if (tr.phase === 'in') { tr.phase = 'market'; tr.linger = 25; holdMarket(tr, town); }
    else { world.trader = null; world.nextTrader = world.tick + 150 + Math.floor(Math.random() * 350); }
    return;
  }
  const next = tr.path[tr.pi];
  if (world.burnLeft[next] > 0 || !passable(world.type[next])) { if (++tr.wait > 60) { world.trader = null; world.nextTrader = world.tick + 300; log('The caravan turns back; the road is blocked.', 'build'); } return; }
  tr.wait = 0;
  const nx = next % n, ny = (next - nx) / n; if (nx !== tr.x) tr.face = Math.sign(nx - tr.x);
  tr.x = nx; tr.y = ny; tr.pi++;
}
function holdMarket(tr, town) {
  if (!town || !isAlive(town)) return;
  const [px, py] = cellCenter(town.cy * world.n + town.cx);
  if (town.align.moral < 0 && town.militia >= 10 && Math.random() < 0.35) {
    const took = []; for (const k in tr.stock) { if (LIVESTOCK.includes(k)) town.livestock[k] = (town.livestock[k] || 0) + tr.stock[k]; else addRes(town, k, tr.stock[k]); took.push(`${tr.stock[k]} ${k}`); }
    town.res.coin += tr.coin; tr.stock = {}; tr.coin = 0;
    world.traderWary = world.tick + 2500; stat('ev', 'caravansRobbed');
    for (const o of world.towns) if (o !== town) setRel(town, o, rel(town, o) - 8);
    popups.push({ x: px, y: py - town.R * cellPx - 14, text: 'ROBBED', color: '#ff4040', t0: performance.now(), dur: 2500 });
    log(`${town.name}'s militia seizes the caravan: ${took.join(', ')} and the strongbox. Word gets around; no trader will come for a long while.`, 'war');
    return;
  }
  const bought = [], sold = [];
  // Livestock first: a town with room on its pasture buys what it can afford.
  for (const k of LIVESTOCK) {
    if (!tr.stock[k]) continue;
    const amt = Math.min(tr.stock[k], Math.floor(town.res.coin / PRICE[k]), Math.max(0, pastureRoom(town)));
    if (amt <= 0) continue;
    town.res.coin -= amt * PRICE[k]; tr.coin += amt * PRICE[k]; tr.stock[k] -= amt; town.livestock[k] = (town.livestock[k] || 0) + amt; bought.push(`${amt} ${k}`);
    if (!town.tamed || !town.tamed[k]) { town.tamed = town.tamed || {}; town.tamed[k] = 1; stat('ev', 'tamed'); }
  }
  // Then what it is short of, cheapest first, as long as the coin holds out.
  if (!Number.isFinite(town.res.coin)) town.res.coin = 0;
  const thrifty = has(town, 'miser') || has(town, 'hoarder');
  const tw = techWants(town);
  const wants = Object.keys(tr.stock).filter(k => !LIVESTOCK.includes(k) && (tw.has(k) || (town.res[k] || 0) < resCap(town, k) * (thrifty ? 0.15 : 0.4))).sort((a, b) => (tw.has(b) - tw.has(a)) || PRICE[a] - PRICE[b]);
  for (const k of wants) {
    const amt = Math.min(tr.stock[k], Math.floor(town.res.coin / PRICE[k]), resCap(town, k) - town.res[k]);
    if (amt <= 0) continue;
    town.res.coin -= amt * PRICE[k]; tr.coin += amt * PRICE[k]; tr.stock[k] -= amt; addRes(town, k, amt); bought.push(`${amt} ${k}`);
  }
  // And sells its surplus.
  for (const k of RES_KINDS) {
    if (k === 'coin' || !PRICE[k]) continue;
    if (!Number.isFinite(town.res[k])) town.res[k] = 0;
    const cap = resCap(town, k), over = town.res[k] - Math.floor(cap * 0.5);
    if (town.res[k] < cap * 0.65 || over <= 0) continue;
    const amt = Math.min(over, Math.floor(tr.coin / PRICE[k]));
    if (amt <= 0) continue;
    town.res[k] -= amt; town.res.coin += amt * PRICE[k]; tr.coin -= amt * PRICE[k]; tr.stock[k] = (tr.stock[k] || 0) + amt; sold.push(`${amt} ${k}`);
  }
  stat('ev', 'markets');
  spawnCrowd(town, town.cy * world.n + town.cx, 25, 4 + Math.floor(Math.random() * 4));
  maybeSmuggle(tr, town);
  popups.push({ x: px, y: py - town.R * cellPx - 14, text: 'MARKET', color: '#f5a623', t0: performance.now(), dur: 2000 });
  if (!bought.length && !sold.length) log(`Market day at ${town.name}, but nobody has anything the other wants`, 'build');
  else log(`Market day at ${town.name}: ${bought.length ? 'buys ' + bought.join(', ') : ''}${bought.length && sold.length ? '; ' : ''}${sold.length ? 'sells ' + sold.join(', ') : ''}. ${town.res.coin} coin in the chest.`, 'build');
}

