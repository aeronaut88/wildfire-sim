/* ───────────────────────── Town card ─────────────────────────
   Click a town on the map for the whole picture: who runs it, what it has, who lives there. */
const cardEl = $('card');
let cardTown = -1, cardAt = 0;
function cardHtml(t) {
  const row = (k, v, cls) => `<div class="row${cls ? ' ' + cls : ''}"><span>${k}</span><b>${v}</b></div>`;
  const l = leader(t), st = world.stats || newStats();
  const dead = t.housesLeft === 0 || t.popLeft <= 0;
  const alive = world.towns.filter(isAlive);
  const wars = world.towns.filter(o => o !== t && atWar(t, o)).map(o => o.name), allies = world.towns.filter(o => o !== t && isAlive(o) && rel(t, o) >= 60).map(o => o.name), foes = world.towns.filter(o => o !== t && isAlive(o) && rel(t, o) < -20 && !atWar(t, o)).map(o => o.name);
  const bld = {}; for (const i of t.buildings) { const ty = world.type[i]; if (ty === T.HOUSE || ty === T.FARM) continue; const nm = BUILDING_NAMES[ty] || (ty === T.STATION ? 'Fire station' : ty === T.SITE ? 'Under construction' : null); if (nm) bld[nm] = (bld[nm] || 0) + 1; }
  const resLine = RES_KINDS.filter(k => k !== 'coin' && t.res[k] > 0).map(k => row(k, `${t.res[k]} <span class="dim">/ ${resCap(t, k) >= 1e8 ? '' : resCap(t, k)}</span>`)).join('') || '<div class="dim">nothing in store</div>';
  const ls = t.livestock ? LIVESTOCK.filter(k => t.livestock[k]).map(k => `${t.livestock[k]} ${k}`).join(', ') : '';
  const folk = (t.people || []).slice().sort((a, b) => (b.alive - a.alive) || (a.role === 'elder' ? -1 : b.role === 'elder' ? 1 : a.born - b.born)).map(p => `<div class="${p.alive ? '' : 'dead'}"><b>${p.name}</b>, ${roleLabel(p)}${p.trait ? ' (' + TRAITS[p.trait].label + ')' : ''}${p.alive ? `, ${personAge(p)}` : ` † ${p.cause || ''}`}. ${p.story[0].toUpperCase() + p.story.slice(1)}.${p.deeds.length ? ` <span class="deed">Last: ${p.deeds[p.deeds.length - 1].text}.</span>` : ''}</div>`).join('');
  const chron = (t.chronicle || []).slice(0, 8).map(e => `<div><span class="t">t${e.tick}</span><span>${e.text}</span></div>`).join('');
  return `<button class="x" data-act="close">close</button><h3>${t.name}</h3>` +
    `<div class="dim">${alignName(t.align)} · ${BIOME_NAMES[biomeAt(t.cx, t.cy)]} · founded Y${Math.floor(t.founded / YEAR) + 1} · ${dead ? '<span class="d">in ruins</span>' : t.mobilized ? '<span class="d">fighting a fire</span>' : t.famine ? '<span class="d">famine</span>' : 'calm'}</div>` +
    (l ? `<div class="lead">Elder ${l.name}, ${TRAITS[l.trait] ? TRAITS[l.trait].label : 'elder'}, ${personAge(l)}: ${TRAITS[l.trait] ? TRAITS[l.trait].blurb : ''}.</div>` : '') +
    `<h4>people</h4><div class="grid">` + row('alive', t.popLeft) + row('ever lived here', t.popTotal) + row('dead', t.deaths, t.deaths ? 'd' : '') + row('of the valley', `${Math.round(t.popLeft / Math.max(1, world.popLeft) * 100)}%`) +
    row('homes', `${t.housesLeft} <span class="dim">(${t.homesLost} lost)</span>`) + row('housing for', housingCapacity(t)) + row('militia', t.militia) + row('unrest', `${Math.round(t.unrest || 0)}%`, (t.unrest || 0) >= 70 ? 'd' : '') + `</div>` +
    `<h4>food and water</h4><div class="grid">` + row('fed', t.famine ? 'famine' : t.fed === false ? 'hungry' : 'yes', t.fed === false ? 'd' : 'g') + row('eats per 16 ticks', Math.ceil(t.popLeft / 30)) + row('fields', `${countType(t, T.FARM)} <span class="dim">(${t.buildings.filter(i => world.type[i] === T.FARM && world.crop[i] >= 100).length} ripe)</span>`) + row('granaries', countType(t, T.GRANARY)) +
    row('water', `${t.res.water} / ${resCap(t, 'water')}`, t.water === false ? 'd' : '') + row('wells', `${countType(t, T.WELL)} <span class="dim">(${Object.values(t.wells || {}).filter(v => v <= 0).length} dry)</span>`) + (ls ? row('livestock', ls) : '') + `</div>` +
    `<h4>stores</h4><div class="grid">` + resLine + `</div>` + row('coin', t.res.coin) +
    `<h4>works</h4><div class="grid">` + Object.entries(bld).map(([k, v]) => row(k, v)).join('') + (Object.keys(bld).length ? '' : '<div class="dim">only homes and fields</div>') + row('power', `${t.power || 0} / ${t.powerNeed || 0}`) + row('arms', MIL_TECH[t.mil]) + row('learning', CIV_TECH[t.civ]) + `</div>` +
    `<h4>neighbours</h4>` + (wars.length ? `<div class="d">at war with ${wars.join(', ')}</div>` : '') + (allies.length ? `<div class="g">allies: ${allies.join(', ')}</div>` : '') + (foes.length ? `<div>feuding with ${foes.join(', ')}</div>` : '') + (!wars.length && !allies.length && !foes.length ? '<div class="dim">keeps to itself</div>' : '') + (t.master >= 0 && world.towns[t.master] ? `<div class="d">pays tribute to ${world.towns[t.master].name}</div>` : '') + (t.covets && world.towns[t.covets.town] ? `<div>covets ${world.towns[t.covets.town].name}'s ${t.covets.res}</div>` : '') +
    `<h4>folk</h4><div class="folk">${folk || '<div class="dim">nobody of note</div>'}</div>` +
    `<h4>lately</h4><div class="chron">${chron || '<div class="dim">nothing yet</div>'}</div>` +
    `<div class="acts"><button data-act="missile">missile here</button><button data-act="lightning">lightning here</button><button data-act="history">history</button></div>`;
}
function openCard(t) { cardTown = t.id; cardEl.innerHTML = cardHtml(t); cardEl.classList.add('on'); cardAt = performance.now(); }
function closeCard() { cardTown = -1; cardEl.classList.remove('on'); }
cardEl.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  const t = world.towns[cardTown];
  if (b.dataset.act === 'close') closeCard();
  else if (b.dataset.act === 'missile' && t) launchMissile(t.cy * world.n + t.cx);
  else if (b.dataset.act === 'lightning' && t) lightning(t.cy * world.n + t.cx);
  else if (b.dataset.act === 'history') { showTab('History'); histState.hidden = new Set(Object.keys(world.history.towns).map(Number).filter(id => id !== cardTown)); drawHistory(); }
});
function refreshCard(now) {
  if (cardTown < 0 || now - cardAt < 700) return;
  const t = world.towns[cardTown]; if (!t) { closeCard(); return; }
  const scroll = cardEl.scrollTop; cardEl.innerHTML = cardHtml(t); cardEl.scrollTop = scroll; cardAt = now;
}

