// Headless check: drives the built page over the Chrome DevTools Protocol. Needs a Chromium
// binary: set WILDFIRE_CHROME, or install Playwright's chromium (the default path below).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.WILDFIRE_CHROME || 'C:/Users/james/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';
const URL = 'file:///' + path.resolve(HERE, '..', 'index.html').split(path.sep).join('/');
const PORT = Number(process.env.WILDFIRE_PORT || 9413);
const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--window-size=1200,900', `--remote-debugging-port=${PORT}`, URL], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target; for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(200); }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const logs = [];
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description)); return r.result.result.value; };
await send('Runtime.enable'); await sleep(1500);
const out = await evaluate(`(async () => {
  const W = window.__wildfire; const w = W.world; let g = 0; while (!w.towns.length && g++ < 20) W.reset(100);
  W.setRunning(false);
  // Make the world interesting: fires, a settler on the road, weather forced, some params changed.
  W.params.spread = 0.41; W.params.weatherMode = 'drought'; W.params.townCap = 11; W.params.speed = 17;
  for (let k = 0; k < 3; k++) W.lightning(Math.floor(Math.random() * w.n * w.n));
  for (let k = 0; k < 400; k++) W.step();
  W.forceSettlers();
  for (let k = 0; k < 5; k++) W.step();
  const fp = () => { let h = 2166136261; const mix = v => { h = Math.imul(h ^ v, 16777619) >>> 0; };
    for (const a of [w.type, w.burnLeft, w.wet, w.road, w.since, w.intensity, w.glow, w.wetKind, w.townOf, w.fert]) for (let i = 0; i < a.length; i++) mix(a[i] & 0xffff);
    return h; };
  const before = { tick: w.tick, fp: fp(), burning: w.burning.length, towns: w.towns.map(t => t.name + ':' + t.popLeft + ':' + t.housesLeft + ':' + t.crews.length + ':' + t.trucks.length + ':' + (t.workers || []).length), settlers: !!w.settlers, weather: w.weather.kind, wind: w.wind.angle.toFixed(4), pop: w.popLeft, deaths: w.deaths, log: document.querySelectorAll('#log li').length, params: JSON.stringify(W.params) };
  // File round trip (gzip JSON).
  const blob = await W.encodeFile(W.snapshot());
  const size = blob.size, type = blob.type;
  const obj = await W.decodeFile(await blob.arrayBuffer());
  // Scramble the world, then restore.
  W.reset(60);
  W.restore(obj);
  const after = { tick: w.tick, fp: fp(), burning: w.burning.length, towns: w.towns.map(t => t.name + ':' + t.popLeft + ':' + t.housesLeft + ':' + t.crews.length + ':' + t.trucks.length + ':' + (t.workers || []).length), settlers: !!w.settlers, weather: w.weather.kind, wind: w.wind.angle.toFixed(4), pop: w.popLeft, deaths: w.deaths, log: document.querySelectorAll('#log li').length, params: JSON.stringify(W.params) };
  // Keep simulating after restore to shake out broken references.
  for (let k = 0; k < 300; k++) W.step();
  // Slot round trip.
  const okSave = await W.saveToSlot('2'); const tickBeforeLoad = w.tick; for (let k = 0; k < 50; k++) W.step(); const okLoad = await W.loadFromSlot('2');
  const slotMeta = document.querySelector('.slot[data-slot="2"] .meta').textContent;
  const ui = { speed: document.getElementById('speed').value, spread: document.getElementById('spreadOut').textContent, weatherOn: document.querySelector('#weatherSeg button.on').dataset.w, townCap: document.getElementById('townCapOut').textContent, size: document.getElementById('sizeOut').textContent };
  return { size, type, same: JSON.stringify(before) === JSON.stringify(after), before, after, stepped300: w.tick, okSave, okLoad, slotRestoredTick: w.tick, tickBeforeLoad, slotMeta, ui, raw: JSON.stringify(W.snapshot()).length };
})()`);
console.log('file:', out.size, 'bytes', out.type, '| raw json:', out.raw, 'bytes | ratio', (out.raw / out.size).toFixed(1) + 'x');
console.log('roundtrip identical:', out.same);
if (!out.same) { for (const k of Object.keys(out.before)) if (JSON.stringify(out.before[k]) !== JSON.stringify(out.after[k])) console.log('  DIFF', k, JSON.stringify(out.before[k]).slice(0, 120), '!=', JSON.stringify(out.after[k]).slice(0, 120)); }
console.log('kept simulating after restore to tick', out.stepped300);
console.log('slot save/load:', out.okSave, out.okLoad, '| tick restored to', out.slotRestoredTick, '(saved at', out.tickBeforeLoad + ') meta:', out.slotMeta);
console.log('ui after load:', JSON.stringify(out.ui));
console.log('errors:', logs.length ? logs : 'none');
ws.close(); chrome.kill(); process.exit(0);
