/* ───────────────────────── The debug menu ─────────────────────────
   Hidden until asked for: press the backtick key, type "god", or run __wildfire.debug() in the
   console. A small panel over the map with every hand of god on a button and a town picker for
   the ones that need a target. Remembers whether it was open. */
let debugPanel = null, debugTyped = '';
function debugTownOptions(sel) {
  const cur = sel.value;
  sel.innerHTML = world.towns.map(t => `<option value="${t.id}"${isAlive(t) ? '' : ' disabled'}>${t.id}: ${t.name} (${t.popLeft})</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function debugAimedComet(town, offset) {
  const n = world.n, x = Math.max(12, Math.min(n - 13, town.cx + offset)), y = Math.max(12, Math.min(n - 13, town.cy));
  const i = y * n + x, [tx, ty] = cellCenter(i);
  missiles.push({ sx: tx + (Math.random() - 0.5) * canvas.width * 0.8, sy: -80, tx, ty, target: i, t0: performance.now(), dur: 2600, arc: 0, lastSmoke: 0, radius: 2, nuke: false, meteor: true, comet: true });
  world.cometLand = { i, t0: performance.now() };
  log('A SECOND SUN. Something very large is falling out of the sky, and the whole valley stops to watch it.', 'alarm', i);
  stat('ev', 'comets');
}
function buildDebugPanel() {
  const el = document.createElement('div');
  el.id = 'debugPanel'; el.className = 'debug';
  el.innerHTML = `<div class="dhead"><b>HAND OF GOD</b><span class="dim">backtick or "god" to hide</span><button data-act="close">x</button></div>
    <div class="drow"><label>town</label><select id="dbgTown"></select><label>other</label><select id="dbgOther"></select></div>
    <div class="dgrid">
      <button data-act="comet">comet (random)</button><button data-act="cometAt">comet on town</button>
      <button data-act="quake">earthquake</button><button data-act="meteor">meteor</button>
      <button data-act="dragon">dragon</button><button data-act="flood">flood</button>
      <button data-act="wolves">wolves</button><button data-act="beavers">beavers</button>
      <button data-act="freeze">freeze the water</button><button data-act="ashfall">ashfall sky</button>
      <button data-act="drought">drought</button><button data-act="storm">dry storm</button>
      <button data-act="settlers">settlers</button><button data-act="craft">town learns all crafts</button>
      <button data-act="tech">town: rifles + aviation</button><button data-act="rich">town: full stores</button>
      <button data-act="war">town declares war on other</button><button data-act="bomber">town bombs other</button>
      <button data-act="nuke">town nukes other</button><button data-act="fire">fire at town's edge</button>
      <button data-act="lightning">lightning (random)</button><button data-act="pause">pause / play</button>
    </div>`;
  el.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const act = b.dataset.act, town = world.towns[+$('dbgTown').value], other = world.towns[+$('dbgOther').value];
    const need = t => { if (!t) { log('Pick a living town first', 'alarm'); return false; } return true; };
    switch (act) {
      case 'close': toggleDebug(false); break;
      case 'comet': comet(); break;
      case 'cometAt': if (need(town)) debugAimedComet(town, 6); break;
      case 'quake': earthquake(); break;
      case 'meteor': { const i = randomFuelCell(); const [tx, ty] = cellCenter(i); missiles.push({ sx: tx - 200, sy: -60, tx, ty, target: i, t0: performance.now(), dur: 900, arc: 0, lastSmoke: 0, radius: 4, nuke: false, meteor: true }); break; }
      case 'dragon': maybeDragon(true); break;
      case 'flood': floodArea(world.river, 0.018, 3, false, 'Flood (forced)'); break;
      case 'wolves': { const n = world.n; world.packs.push({ kind: 'wolves', x: 1, y: Math.floor(n / 2), px: 1, py: Math.floor(n / 2), face: 1, size: 5, wx: -1, wy: -1, rest: 0, t0: world.tick, hunger: 100, next: world.tick }); log('Wolves come in off the west edge', 'weather'); break; }
      case 'beavers': { world.beavers = null; let k = 0; while (!world.beavers && k++ < 2000) { world.tick = Math.max(world.tick, 300); updateBeavers(); } break; }
      case 'freeze': for (const i of world.water) { world.snow[i] = 60; world.snowLv[i] = snowLevel(60); } world.snowCells = Math.max(world.snowCells, world.water.length); dirtyAll(); log('The water freezes over in a night', 'weather'); break;
      case 'ashfall': setWeather('ashfall', true); break;
      case 'drought': setWeather('drought', true); break;
      case 'storm': setWeather('drystorm', true); break;
      case 'settlers': updateSettlers(true); break;
      case 'craft': if (need(town)) { town.craft = 8; town.craftPts = CRAFT_COST[8]; log(`${town.name} knows every craft there is`, 'tech'); } break;
      case 'tech': if (need(town)) { town.mil = Math.max(town.mil, 4); town.civ = 5; log(`${town.name} has rifles and aviation`, 'tech'); } break;
      case 'rich': if (need(town)) { for (const k of RES_KINDS) if (k !== 'coin') town.res[k] = resCap(town, k); town.res.coin += 500; log(`${town.name}'s stores are full and its chest is heavy`, 'build'); } break;
      case 'war': if (need(town) && need(other) && town !== other) declareWar(town, other, '(forced)'); break;
      case 'bomber': if (need(town) && need(other) && town !== other) launchBomber(town, other); break;
      case 'nuke': if (need(town) && need(other) && town !== other) { town.nukes = Math.max(1, town.nukes || 0); launchNuke(town, other); } break;
      case 'fire': if (need(town)) { const n = world.n, a = Math.random() * Math.PI * 2, r = town.R + 2; const i = Math.max(0, Math.min(n * n - 1, Math.round(town.cy + Math.sin(a) * r) * n + Math.round(town.cx + Math.cos(a) * r))); if (!ignite(i)) { for (let k = 0; k < 40 && !ignite(Math.max(0, Math.min(n * n - 1, i + Math.floor(Math.random() * 7) - 3 + (Math.floor(Math.random() * 7) - 3) * n))); k++); } } break;
      case 'lightning': lightning(randomFuelCell()); break;
      case 'pause': setRunning(!running); break;
    }
  });
  viewport.appendChild(el);
  return el;
}
function dirtyAll() { const N = world.n * world.n; for (let i = 0; i < N; i++) dirty.add(i); }
function toggleDebug(on) {
  if (!debugPanel) debugPanel = buildDebugPanel();
  const show = on === undefined ? debugPanel.style.display === 'none' || !debugPanel.style.display : on;
  debugPanel.style.display = show ? 'block' : 'none';
  if (show) { debugTownOptions($('dbgTown')); debugTownOptions($('dbgOther')); if ($('dbgOther').options.length > 1) $('dbgOther').selectedIndex = 1; }
  try { localStorage.setItem('wildfireDebug', show ? '1' : '0'); } catch (e) {}
  if (show && !world.debugShown) { world.debugShown = true; log('The hand of god is at your side. Use it wisely, or do not.', 'tech'); }
}
window.addEventListener('keydown', ev => {
  if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'TEXTAREA')) return;
  if (ev.key === '`') { ev.preventDefault(); toggleDebug(); return; }
  if (ev.key.length === 1) { debugTyped = (debugTyped + ev.key.toLowerCase()).slice(-3); if (debugTyped === 'god') { debugTyped = ''; toggleDebug(); } }
});
try { if (localStorage.getItem('wildfireDebug') === '1') setTimeout(() => toggleDebug(true), 0); } catch (e) {}
window.__wildfire.debug = toggleDebug;
window.__wildfire.debugAimedComet = debugAimedComet;
