// Headless check: drives the built page over the Chrome DevTools Protocol. Needs a Chromium
// binary: set WILDFIRE_CHROME, or install Playwright's chromium (the default path below).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.WILDFIRE_CHROME || 'C:/Users/james/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';
const URL = 'file:///' + path.resolve(HERE, '..', 'index.html').split(path.sep).join('/');
const PORT = Number(process.env.WILDFIRE_PORT || 9414);
const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--window-size=1200,900', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target; for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(200); }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const logs = [];
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') logs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 600)); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: URL }); await sleep(2500);
const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? JSON.stringify(r.result?.exceptionDetails?.exception?.description || r.result?.exceptionDetails); };
const out = await evalJs(`(() => {
  const W = window.__wildfire, w = W.world, n = w.n;
  W.setRunning(false);
  const hist = new Map(); let agentTicks = 0, pingPong = 0, traders = 0, lastTrader = null, markets = 0; const by = {};
  const key = (o, tag) => { if (!o._id) o._id = tag + ':' + Math.random(); return o._id; };
  for (let k = 0; k < 4000; k++) {
    W.step();
    if (w.trader && w.trader !== lastTrader) { traders++; lastTrader = w.trader; }
    for (const t of w.towns) {
      const agents = [...(t === w.towns[0] ? (w.herds || []).map(a => [a, 'h']) : []), ...(t.workers || []).map(a => [a, 'w']), ...(t.crews || []).map(a => [a, 'c']), ...(t.trucks || []).filter(a => a.alive && a.state !== 'idle').map(a => [a, 't'])];
      for (const [a, tag] of agents) {
        const id = key(a, tag), h = hist.get(id) || []; h.push(a.y * n + a.x); if (h.length > 8) h.shift(); hist.set(id, h);
        agentTicks++;
        if (h.length === 8 && h[0] !== h[1] && h.every((c, i) => c === h[i % 2])) { pingPong++; const lab = tag + ':' + (a.job || a.mode || a.state || '?') + (a.soldier ? '/soldier' : '') + (a.gather ? '/' + a.phase : ''); by[lab] = (by[lab] || 0) + 1; }
      }
    }
  }
  const all = w.towns.flatMap(x => x.chronicle || []); const seen = new Set();
  for (const e of all) { if (seen.has(e.tick + e.text)) continue; seen.add(e.tick + e.text); if (/^Market day/.test(e.text)) markets++; }
  return { by, agentTicks, pingPong, pingPongShare: +(pingPong / Math.max(1, agentTicks)).toFixed(4), traders, markets, tick: w.tick };
})()`);
console.log(JSON.stringify(out));
console.log(logs.length ? logs.join('\n---\n') : 'errors: none');
ws.close(); chrome.kill(); process.exit(0);
