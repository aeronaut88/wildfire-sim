// The crown over the elder: for every government, a faction of three towns whose elders are out of line with
// the ruler must reach into them (oustings) or vote (republics), with no exceptions along the way.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.WILDFIRE_CHROME || 'C:/Users/james/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';
const URL = 'file:///' + path.resolve(HERE, '..', 'index.html').split(path.sep).join('/');
const PORT = Number(process.env.WILDFIRE_PORT || 9416);
const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--window-size=1200,900', `--remote-debugging-port=${PORT}`, URL], { stdio: 'ignore' });
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
await evaluate(`window.__wildfire.setRunning(false)`);

// The trait furthest from a ruler's, so the elders start out of line.
const OPPOSITE = { tyrant: 'peacemaker', warmonger: 'peacemaker', hoarder: 'peacemaker', madman: 'peacemaker', miser: 'madman' };
const GOVS = ['kingdom', 'dominion', 'horde', 'theocracy', 'republic', 'merchant'];
let failures = 0;
for (const gov of GOVS) {
  const setup = JSON.parse(await evaluate(`(() => {
    const w = window.__wildfire; w.reset(200);
    const living = () => w.world.towns.filter(t => t.popLeft > 0 && t.people && t.people.length).map(t => t.id);
    for (let k = 0; k < 6 && living().length < 3; k++) for (let i = 0; i < 500; i++) w.step(); // settlers come in time
    const alive = living();
    if (alive.length < 3) return JSON.stringify({ error: 'only ' + alive.length + ' towns' });
    const [a, b, c] = alive;
    w.debugUnite(a, b); w.debugUnite(a, c);
    const r = w.debugCrown(a, '${gov}');
    return JSON.stringify({ a, b, c, ruler: r, towns: w.world.towns.length });
  })()`));
  if (setup.error) { console.log(gov, 'SKIP', setup.error); continue; }
  const opp = OPPOSITE[setup.ruler.trait] || 'tyrant';
  const before = JSON.parse(await evaluate(`(() => { const w = window.__wildfire; const el = [w.debugSetElderTrait(${setup.b}, '${opp}'), w.debugSetElderTrait(${setup.c}, '${opp}')]; const ev = (w.world.stats && w.world.stats.ev) || {}; return JSON.stringify({ elders: el, oustings: ev.oustings || 0, appointments: ev.appointments || 0, votes: ev.townElections || 0, gov: w.world.factions[w.world.towns[${setup.a}].faction].gov, n: w.world.factions[w.world.towns[${setup.a}].faction].towns.length }); })()`));
  // 6,000 ticks: two and a half years, one republic election cycle, many faction passes
  await evaluate(`(() => { const w = window.__wildfire; for (let k = 0; k < 6000; k++) w.step(); return w.world.tick; })()`);
  const after = JSON.parse(await evaluate(`(() => { const w = window.__wildfire; const ev = (w.world.stats && w.world.stats.ev) || {}; const f = w.world.factions[w.world.towns[${setup.a}].faction];
    const el = [${setup.b}, ${setup.c}].map(i => { const t = w.world.towns[i]; const l = t.people && t.people.find(p => p.alive && p.role === 'elder'); return l ? l.name + ' (' + l.trait + ')' : 'none'; });
    const lines = [...document.querySelectorAll('#log li')].map(l => l.textContent).filter(s => /writ|warbands|the crown|omens|shrine|ballot|votes|polls|names .* elder|the chair|election|out of favour|letter/i.test(s) && !/crowning/.test(s)).slice(0, 6);
    return JSON.stringify({ oustings: ev.oustings || 0, appointments: ev.appointments || 0, votes: ev.townElections || 0, elders: el, still: f ? f.towns.length : 0, gov: f ? f.gov : null, lines }); })()`));
  // The crown reached in if it ousted an elder or appointed one when a chair fell empty; a republic voted.
  // A realm that changed government mid-run (absorbed by a union) cannot be judged and is reported, not failed.
  const forceful = !(gov === 'republic' || gov === 'merchant');
  const reached = after.oustings + after.appointments > before.oustings + before.appointments;
  const ok = after.gov !== gov ? null : forceful ? reached : after.votes > before.votes;
  if (ok === false) failures++;
  console.log(`${gov.padEnd(9)} ${ok === null ? 'gov changed to ' + after.gov : ok ? 'ok ' : 'FAIL'} ruler ${setup.ruler.name} (${setup.ruler.trait}) · elders set ${opp} → now ${after.elders.join(', ')} · oustings ${before.oustings}→${after.oustings} · appointed ${before.appointments}→${after.appointments} · town votes ${before.votes}→${after.votes} · towns in realm ${before.n}→${after.still}`);
  for (const l of after.lines) console.log('    ' + l);
}
console.log('errors:', errs.length ? errs : 'none');
console.log(failures || errs.length ? `crown: ${failures} failures` : 'crown: ok');
ws.close(); chrome.kill();
process.exit(failures || errs.length ? 1 : 0);
