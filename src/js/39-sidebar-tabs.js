/* ───────────────────────── Sidebar tabs ───────────────────────── */
let showTab = () => {};
(function buildTabs() {
  const panel = document.querySelector('aside.panel'), nav = $('tabs');
  const TABS = [['Play', ['Run', 'Ignite', 'Dispatch', 'Save / Load', 'Valley seed']], ['Towns', ['Settlements']], ['History', ['History']], ['Settings', ['World', 'Fire', 'Wind', 'Terrain']], ['Info', ['Achievements', '__foot']]];
  const groups = [...panel.children].filter(el => el !== nav);
  const byTitle = {};
  for (const g of groups) { const t = g.querySelector(':scope > .title'); byTitle[g.classList.contains('foot') ? '__foot' : (t ? t.firstChild.textContent.trim() : '')] = g; } // first text node: titles may carry a button
  const panes = {};
  for (const [name, titles] of TABS) {
    const pane = document.createElement('div'); pane.className = 'tabpane'; pane.dataset.tab = name;
    for (const t of titles) if (byTitle[t]) pane.appendChild(byTitle[t]);
    panel.appendChild(pane); panes[name] = pane;
    const b = document.createElement('button'); b.textContent = name; b.dataset.tab = name; b.addEventListener('click', () => showTab(name)); nav.appendChild(b);
  }
  for (const g of groups) if (g.parentElement === panel) panes.Info.appendChild(g);
  showTab = name => {
    if (!panes[name]) name = 'Play';
    for (const b of nav.children) b.classList.toggle('on', b.dataset.tab === name);
    for (const k in panes) panes[k].classList.toggle('on', k === name);
    try { localStorage.setItem('wildfire.tab', name); } catch (e) { /* private window */ }
    if (name === 'History') { histLastLen = -1; drawHistory(); }
  };
  let start = 'Play'; try { start = localStorage.getItem('wildfire.tab') || 'Play'; } catch (e) { /* ignore */ }
  showTab(start);
})();

