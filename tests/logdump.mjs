// Usage: node tests/logdump.mjs [index.html] [out.txt] [seconds]   (then: python tests/analyze_log.py out.txt)
// Capture EVERY log line the sim emits over a fast run, for repetition analysis.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.WILDFIRE_CHROME || 'C:/Users/james/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';
const PAGE = process.argv[2] || path.resolve(HERE, '..', 'index.html');
const URL = 'file:///' + path.resolve(PAGE).split(path.sep).join('/');
const PORT = Number(process.env.WILDFIRE_PORT || 9433);
const OUT = process.argv[3] || 'logdump.txt';
const SECONDS = parseInt(process.argv[4] || '150', 10);
const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--window-size=1400,1100', `--remote-debugging-port=${PORT}`, URL], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(200); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const errs = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('console.error ' + m.params.args.map(a => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails));
  return r.result.result.value;
};
await send('Runtime.enable'); await send('Page.enable');
await sleep(1500);
// Hook the log element's innerHTML setter: renderLog() rewrites it once per log() call, newest first.
await evaluate(`(() => {
  const el = document.getElementById('log'); window.__cap = [];
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(el, 'innerHTML', { set(v) { desc.set.call(this, v); const li = this.firstElementChild; if (li && !li.classList.contains('empty')) { const t = li.textContent.trim(); const last = window.__cap[window.__cap.length - 1]; if (!last || last.t !== t) window.__cap.push({ k: window.__wildfire.world.tick, t }); } }, get() { return desc.get.call(this); } });
  return 'hooked';
})()`);
await evaluate(`window.__wildfire.params.speed = 240; document.getElementById('speed').value = 240; document.getElementById('speed').dispatchEvent(new Event('input'));`);
const t0 = Date.now();
for (let s = 10; s <= SECONDS; s += 10) {
  await sleep(10 * 1000);
  const st = await evaluate(`JSON.stringify({tick: window.__wildfire.world.tick, n: window.__cap.length, towns: window.__wildfire.world.towns.length})`);
  console.log(`+${s}s`, st);
}
const cap = await evaluate(`JSON.stringify(window.__cap)`);
const entries = JSON.parse(cap);
writeFileSync(OUT, entries.map(e => `${e.k}\t${e.t}`).join('\n'));
console.log('captured', entries.length, 'lines to', OUT, 'in', ((Date.now() - t0) / 1000).toFixed(0), 's');
console.log('errors:', errs.length ? errs : 'none');
ws.close(); chrome.kill();
