/* ───────────────────────── Town card ─────────────────────────
   Click a town on the map for the whole picture: who runs it, what it has, who lives there. */
const cardEl = $('card');
let cardTown = -1, cardAt = 0;
function cardHtml(t) {
  const row = (k, v, cls) => `<div class="row${cls ? ' ' + cls : ''}"><span>${k}</span><b>${v}</b></div>`;
  // "Buckets · 62% to fire brigade", or what the finished plans are waiting on.
  const techNext = (t, track) => {
    const mil = track === 'mil', craft = track === 'craft', lv = mil ? t.mil : craft ? (t.craft || 0) : t.civ, names = mil ? MIL_TECH : craft ? CRAFT_TECH : CIV_TECH, costs = mil ? MIL_COST : craft ? CRAFT_COST : CIV_COST, needs = mil ? MIL_NEED : craft ? CRAFT_NEED : CIV_NEED;
    if (mil ? lv >= milCap(t) : craft ? lv >= CRAFT_CAP : lv >= 5) return ' <span class="dim">· the limit</span>';
    const pts = (mil ? t.milPts : craft ? t.craftPts : t.civPts) || 0, next = names[lv + 1].toLowerCase();
    if (pts < costs[lv + 1]) return ` <span class="dim">· ${Math.floor(100 * pts / costs[lv + 1])}% to ${next}</span>`;
    const k = lacking(t, needs[lv + 1]); return ` <span class="dim">· ${next} needs ${k ? k : 'building'}</span>`;
  };
  const l = leader(t), st = world.stats || newStats();
  const dead = t.housesLeft === 0 || t.popLeft <= 0;
  const alive = world.towns.filter(isAlive);
  const wars = world.towns.filter(o => o !== t && atWar(t, o)).map(o => o.name), allies = world.towns.filter(o => o !== t && isAlive(o) && rel(t, o) >= 60).map(o => o.name), foes = world.towns.filter(o => o !== t && isAlive(o) && rel(t, o) < -20 && !atWar(t, o)).map(o => o.name);
  const bld = {}; for (const i of t.buildings) { const ty = world.type[i]; if (ty === T.HOUSE || ty === T.FARM) continue; const nm = BUILDING_NAMES[ty] || (ty === T.STATION ? 'Fire station' : ty === T.SITE ? 'Under construction' : null); if (nm) bld[nm] = (bld[nm] || 0) + 1; }
  const resLine = RES_KINDS.filter(k => k !== 'coin' && t.res[k] > 0).map(k => row(k, `${t.res[k]} <span class="dim">/ ${resCap(t, k) >= 1e8 ? '' : resCap(t, k)}</span>`)).join('') || '<div class="dim">nothing in store</div>';
  const ls = t.livestock ? LIVESTOCK.filter(k => t.livestock[k]).map(k => `${t.livestock[k]} ${k}`).join(', ') : '';
  const folk = (t.people || []).slice().sort((a, b) => (b.alive - a.alive) || (a.role === 'elder' ? -1 : b.role === 'elder' ? 1 : a.born - b.born)).map(p => `<div class="${p.alive ? '' : 'dead'}"><b>${p.name}</b>, ${roleLabel(p)}${p.trait ? ' (' + TRAITS[p.trait].label + ')' : ''}${kinLabel(t, p) ? ', ' + kinLabel(t, p) : ''}${p.alive ? (p.role === 'child' ? `, aged ${personAge(p)}` : `, ${personAge(p)}`) : ` † ${p.cause || ''}`}.${p.alive && p.grudge ? ' <span class="d">Holds a grudge.</span>' : ''} ${p.story[0].toUpperCase() + p.story.slice(1)}.${p.deeds.length ? ` <span class="deed">Last: ${p.deeds[p.deeds.length - 1].text}.</span>` : ''}</div>`).join('');
  const chron = (t.chronicle || []).slice(0, 8).map(e => `<div class="${e.at >= 0 ? 'go' : ''}" data-at="${e.at >= 0 ? e.at : ''}"><span class="t">t${e.tick}</span><span>${e.text}</span></div>`).join('');
  return `<button class="x" data-act="close">close</button><h3>${t.name}</h3>` +
    `<div class="dim">${(f => f && f.towns.length > 1 ? `<span style="color:${f.color}">${factionName(f)}</span>${rulerOf(f) ? ', ' + rulerTitle(f) + ' ' + rulerOf(f).name + (rulerOf(f).trait ? ' (' + TRAITS[rulerOf(f).trait].label + ')' : '') : ''}${f.capital === t.id ? ' (the capital)' : t.master >= 0 ? ' (by conquest)' : ''} · ` : '')(factionOf(t))}${alignName(t.align)} · ${BIOME_NAMES[biomeAt(t.cx, t.cy)]} · founded Y${Math.floor(t.founded / YEAR) + 1} · ${dead ? '<span class="d">in ruins</span>' : t.mobilized ? '<span class="d">fighting a fire</span>' : t.famine ? '<span class="d">famine</span>' : 'calm'}</div>` +
    (l ? `<div class="lead">Elder ${l.name}, ${TRAITS[l.trait] ? TRAITS[l.trait].label : 'elder'}, ${personAge(l)}: ${TRAITS[l.trait] ? TRAITS[l.trait].blurb : ''}.</div>` : '') +
    (l ? (f => { if (!f || f.towns.length < 2) return ''; const r = rulerOf(f); if (!r) return ''; const rep = f.gov === 'republic' || f.gov === 'merchant'; const seasons = Math.max(0, Math.ceil((f.nextElection - world.tick) / (YEAR / 4)));
      const out = r !== l && r.trait && l.trait && traitDistance(l.trait, r.trait) > OUT_OF_LINE ? ` · <span class="d">${rep ? 'out of step with the capital' : 'out of favour with the crown'}</span>` : '';
      return `<div class="dim">${r === l ? 'rules' : 'answers to'} ${rulerTitle(f)} ${r.name}${r.trait ? ', ' + TRAITS[r.trait].label : ''}${rep ? ` · next election in ${seasons} season${seasons === 1 ? '' : 's'}` : ''}${out}</div>`; })(factionOf(t)) : '') +
    `<h4>people</h4><div class="grid">` + row('alive', t.popLeft) + row('ever lived here', t.popTotal) + row('dead', t.deaths, t.deaths ? 'd' : '') + row('of the valley', `${Math.round(t.popLeft / Math.max(1, world.popLeft) * 100)}%`) +
    row('homes', `${t.housesLeft} <span class="dim">(${t.homesLost} lost)</span>`) + row('housing for', housingCapacity(t)) + (stoneHomes(t) || (t.code && t.code.stone) ? row('in stone', `${stoneHomes(t)} homes${t.code && t.code.stone ? ' <span class="dim">· the stone code</span>' : ''}`) : '') + row('militia', t.militia) + (t.soldiers ? row('soldiers', `${t.soldiers} <span class="dim">of ${12 * countType(t, T.BARRACKS)} places</span>`) : '') + row('unrest', `${Math.round(t.unrest || 0)}%`, (t.unrest || 0) >= 70 ? 'd' : '') + row('spirits', `${Math.round(cheerOf(t))}% <span class="dim">${t.drank ? '· beer at the inn' : hasType(t, T.INN) ? '· the inn is dry' : ''}${t.smoked ? ' · pipe smoke' : ''}</span>`, cheerOf(t) >= 70 ? 'g' : cheerOf(t) < 30 ? 'd' : '') + `</div>` +
    (t.jobs ? `<h4>work</h4><div class="grid">` + JOB_LIST.filter(k => t.jobs[k] > 0 && k !== 'militia' && k !== 'soldier').map(k => row(JOB_LABEL[k], t.jobs[k], k === 'idle' && idleShare(t) > 0.15 ? 'd' : '')).join('') + (tools(t) > 1 ? row('tools', 'good <span class="dim">(the forge is working iron)</span>', 'g') : '') + (logistics(t) > 1 ? row('haulage', `${Math.round((logistics(t) - 1) * 100)}% faster`, 'g') : '') + `</div>` : '') +
    `<h4>food and water</h4><div class="grid">` + row('fed', t.famine ? 'famine' : t.fed === false ? 'hungry' : 'yes', t.fed === false ? 'd' : 'g') + row('eats per 16 ticks', Math.ceil(t.popLeft / 30)) + row('fields', `${countType(t, T.FARM)} <span class="dim">(${t.buildings.filter(i => world.type[i] === T.FARM && world.crop[i] >= 100).length} ripe)</span>`) + row('granaries', countType(t, T.GRANARY)) + (FOOD_KINDS.some(k => t.res[k]) ? row('larder', FOOD_KINDS.filter(k => t.res[k]).map(k => `${t.res[k]} ${k}`).join(', ')) : '') + ((t.res.beer || 0) ? row('beer', `${t.res.beer} <span class="dim">${hasType(t, T.INN) ? 'at the inn' : 'and nowhere to drink it'}</span>`) : '') + (t.buildings.some(i => world.type[i] === T.FARM && cropKindAt(i)) ? row('crops', [0, 1, 2, 3, 4].map(k => [k, t.buildings.filter(i => world.type[i] === T.FARM && cropKindAt(i) === k).length]).filter(([k, c]) => c).map(([k, c]) => `${c} ${CROP_NAMES[k]}`).join(', ')) : '') +
    row('water', `${t.res.water} / ${resCap(t, 'water')}`, t.water === false ? 'd' : '') + row('wells', `${countType(t, T.WELL)} <span class="dim">(${Object.values(t.wells || {}).filter(v => v <= 0).length} dry)</span>`) + (ls ? row('livestock', ls) : '') + (hasType(t, T.HEALER) || hasType(t, T.HOSPITAL) ? row('healer', `${person(t, 'healer') ? person(t, 'healer').name : 'nobody yet'} <span class="dim">· ${t.res.herbs || 0} herbs, ${t.healed || 0} saved</span>`) : '') + `</div>` +
    `<h4>stores</h4><div class="grid">` + resLine + `</div>` + row('coin', t.res.coin) +
    `<h4>works</h4><div class="grid">` + Object.entries(bld).map(([k, v]) => row(k, v)).join('') + (Object.keys(bld).length ? '' : '<div class="dim">only homes and fields</div>') + row('power', `${t.power || 0} / ${t.powerNeed || 0}`) + `</div>` +
    `<h4>tech</h4><div class="grid">` + row('arms', MIL_TECH[t.mil] + techNext(t, 'mil')) + row('learning', CIV_TECH[t.civ] + techNext(t, 'civ')) + row('craft', CRAFT_TECH[t.craft || 0] + techNext(t, 'craft')) + row('research', `${Math.round(t.research || 0)} <span class="dim">(${Math.round(100 * Math.min(0.85, militarism(t)))}% to arms)</span>`) +
    (hasType(t, T.AIRBASE) ? row('bombers', `${t.bombers || 0} / 3${world.bombers.some(b => b.from === t.id) ? ' <span class="dim">(one airborne)</span>' : ''}`) : '') + (hasType(t, T.AIRBASE) && t.civ >= 5 ? row('jets', `${t.fighters || 0} / 2${(world.fighters || []).some(f => f.from === t.id) ? ' <span class="dim">(scrambled)</span>' : ''}`) : '') + (t.nukes ? row('bombs', t.nukes, 'd') : '') + `</div>` +
    `<h4>law</h4><div class="grid">` + row('the law here', lawLabel(t)) + row('record', `${t.crimes || 0} crimes <span class="dim">(${t.caught || 0} caught)</span>`) +
    (t.case ? row('open case', `${CRIME_LABEL[t.case.kind]}${t.case.hunt ? `, hunting ${t.case.who}` : ', nobody on it'} <span class="dim">(${world.tick - t.case.started} ticks)</span>`, 'd') : '') +
    ((t.people || []).some(p => p.alive && p.role === 'convict') ? row('serving time', (t.people || []).filter(p => p.alive && p.role === 'convict').map(p => `${p.name}${p.labour ? ' (quarry)' : ''}`).join(', ')) : '') +
    (t.fear > world.tick ? row('mood', 'the gallows are fresh', 'd') : '') + (t.spy ? row('whispers', 'a stranger asks a lot of questions', 'd') : '') + (t.bounty ? row('bounty', `${t.bounty.coin} coin on ${t.bounty.name}`) : '') + ((t.wrongs || []).length ? row('doubt', `${t.wrongs.length} conviction${t.wrongs.length > 1 ? 's' : ''} people whisper about`, 'd') : '') + `</div>` +
    `<h4>neighbours</h4>` + (wars.length ? `<div class="d">at war with ${wars.join(', ')}</div>` : '') + (allies.length ? `<div class="g">allies: ${allies.join(', ')}</div>` : '') + (foes.length ? `<div>feuding with ${foes.join(', ')}</div>` : '') + (!wars.length && !allies.length && !foes.length ? '<div class="dim">keeps to itself</div>' : '') + (t.master >= 0 && world.towns[t.master] ? `<div class="d">pays tribute to ${world.towns[t.master].name}</div>` : '') + (t.covets && world.towns[t.covets.town] ? `<div>covets ${world.towns[t.covets.town].name}'s ${t.covets.res}</div>` : '') +
    `<h4>folk</h4><div class="folk">${folk || '<div class="dim">nobody of note</div>'}</div>` +
    `<h4>lately</h4><div class="chron">${chron || '<div class="dim">nothing yet</div>'}</div>` +
    `<div class="acts"><button data-act="missile">missile here</button><button data-act="lightning">lightning here</button><button data-act="history">history</button></div>`;
}
function openCard(t) { cardTown = t.id; cardEl.innerHTML = cardHtml(t); cardEl.classList.add('on'); cardAt = performance.now(); }
function closeCard() { cardTown = -1; cardEl.classList.remove('on'); }
cardEl.addEventListener('click', ev => {
  const g = ev.target.closest('.chron .go'); if (g && g.dataset.at) { stopFollowing(); goTo(+g.dataset.at); return; }
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

