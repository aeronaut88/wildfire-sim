// v3 soak: run fast for a while and watch the living world evolve.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:/Users/james/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';
const URL = 'file:///C:/Users/james/Projects/random/forest-fire/index.html';
const PORT = Number(process.env.WILDFIRE_PORT || 9412);
const OUT = process.argv[2] || 'soak';
const SECONDS = parseInt(process.argv[3] || '70', 10);
const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--window-size=1400,1100', `--remote-debugging-port=${PORT}`, URL], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(200); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const logs = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('console.error ' + m.params.args.map(a => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails));
  return r.result.result.value;
};
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}_${name}.png`, Buffer.from(r.result.data, 'base64')); };
await send('Runtime.enable'); await send('Page.enable');
await sleep(1500);
await shot('start');

await evaluate(`window.__wildfire.params.speed = 240; document.getElementById('speed').value = 240; document.getElementById('speed').dispatchEvent(new Event('input'));`);

const snap = () => evaluate(`(() => { const w = window.__wildfire.world; return JSON.stringify({
  tick: w.tick, weather: w.weather.kind, burning: w.burning.length, trees: w.treeCount, burned: w.burnedCount,
  bld: w.buildingsLeft + ' (lost ' + w.buildingsLost + ')', pop: w.popLeft + ' (dead ' + w.deaths + ')',
  towns: w.towns.map(t => t.name + ' R' + t.R + ' h' + t.housesLeft + ' p' + t.popLeft + (t.hasStation ? ' S' + t.trucks.filter(x=>x.alive).length : '') + (t.mobilized ? ' !' : '')),
  air: w.air ? (w.air.owner + ' ' + w.air.sorties + '/' + w.air.max) : null,
  settlers: !!w.settlers,
}); })()`);
const fps = () => evaluate(`new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res((n / 1.5).toFixed(0)); }; requestAnimationFrame(f); })`);

const every = 10;
for (let s = every; s <= SECONDS; s += every) {
  await sleep(every * 1000);
  console.log(`+${s}s`, await snap());
  if (s === every * 3) await shot('mid');
}
console.log('fps', await fps());
const logAll = await evaluate(`[...document.querySelectorAll('#log li')].map(l => l.textContent)`);
console.log('--- log (newest first, ' + logAll.length + ') ---');
for (const l of logAll.slice(0, 45)) console.log('  ' + l);
await evaluate(`window.__wildfire.params.speed = 4;`);
await shot('end');
console.log('errors:', logs.length ? logs : 'none');
ws.close(); chrome.kill(); process.exit(0);
