// Headless check: drives the built page over the Chrome DevTools Protocol. Needs a Chromium
// binary: set WILDFIRE_CHROME, or install Playwright's chromium (the default path below).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.WILDFIRE_CHROME || 'C:/Users/james/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';
const URL = 'file:///' + path.resolve(HERE, '..', 'index.html').split(path.sep).join('/');
const PORT = Number(process.env.WILDFIRE_PORT || 9411);
const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--window-size=1200,900', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target; for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(200); }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const logs = [];
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') logs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 600)); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: URL }); await sleep(2500);
console.log(logs.length ? logs.join('\n---\n') : 'no startup errors');
ws.close(); chrome.kill(); process.exit(0);
