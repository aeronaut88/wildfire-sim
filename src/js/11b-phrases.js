/* ───────────────────────── Phrases, memory and kin ─────────────────────────
   The log is the game. Every common event has a bag of ways to be said, coloured by the weather,
   the hour, the season, the elder in charge and the town's mood, and never said the same way twice
   running. Towns remember what happened to them and the engine calls back to it. People come in
   families, and a family remembers too. */

const DAYPARTS = ['before dawn', 'at first light', 'in the morning', 'at midday', 'in the afternoon', 'toward evening', 'at dusk', 'in the night'];
function daypart() { return DAYPARTS[Math.floor((world.tick % 16) / 2)]; }
function weatherWord() {
  const k = world.weather.kind;
  if (k === 'rain') return 'in the rain'; if (k === 'storm') return 'in the storm'; if (k === 'drought') return 'in the dust of the drought';
  if (k === 'snow') return 'with snow coming down';
  if (params.windStrength > 0.7) return 'with the wind up';
  return season() === 1 ? 'under a hot sky' : season() === 3 ? 'in the cold' : 'under a clear sky';
}
function seasonWord() { return ['spring', 'summer', 'autumn', 'winter'][season()]; }
function elderOf(town) { const l = leader(town); return l ? l.name : 'the elder'; }
function moodWord(town) { const u = town.unrest || 0; return u >= 70 ? pick(['patience is running out', 'people are close to the end of it', 'the mood is ugly']) : u >= 45 ? pick(['tempers are short', 'there is muttering in the square', 'nobody is in the mood for it']) : u <= 15 ? pick(['spirits are high', 'people are in good spirits', 'nobody is complaining']) : pick(['people take it in their stride', 'life goes on', 'nobody says much about it']); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
// Say an event one of several ways, never repeating the last two phrasings for that key.
const phraseUsed = {};
function say(town, key, c, kind, at) {
  const bag = PHRASES[key]; if (!bag) return;
  const used = phraseUsed[key] || (phraseUsed[key] = []);
  let idx = Math.floor(Math.random() * bag.length), tries = 0;
  while (used.includes(idx) && tries++ < 6) idx = Math.floor(Math.random() * bag.length);
  used.push(idx); if (used.length > Math.min(2, bag.length - 1)) used.shift();
  c = c || {}; c.town = town; c.name = town ? town.name : '';
  let text = bag[idx](c);
  if (town && Math.random() < 0.12) { const back = recall(town, key); if (back) text += (/[.!?]$/.test(text) ? ' ' : '. ') + back; }
  log(text, kind, at);
  return text;
}
// A town's memory: the handful of things that defined it lately, for the log to call back to.
const MEMORY_SHORT = { hanging: c => `the hanging of ${c.who}`, famine: () => 'the famine', dragon: c => `${c.who}'s visit`, bigfire: () => 'the great fire', flood: () => 'the flood', war: c => `the war with ${c.who}`, plague: () => 'the plague', festival: () => 'the festival', wedding: c => `${c.who}'s wedding`, sack: c => `the sack by ${c.who}`, revolt: c => `the revolt against ${c.who}`, slain: c => `the killing of ${c.who}`, meteor: () => 'the night the sky fell', exile: c => `the casting out of ${c.who}` };
function remember(town, kind, c) {
  if (!town) return;
  const m = town.memory || (town.memory = []);
  m.unshift({ tick: world.tick, kind, short: (MEMORY_SHORT[kind] || (() => kind))(c || {}) });
  if (m.length > 10) m.length = 10;
}
function agoWord(ticks) {
  const seasons = Math.round(ticks / (YEAR / 4));
  if (seasons <= 0) return 'only days'; if (seasons === 1) return 'a season'; if (seasons < 4) return `${['', '', 'two', 'three'][seasons]} seasons`;
  const y = Math.round(ticks / YEAR); return y <= 1 ? 'a year' : y === 2 ? 'two years' : y === 3 ? 'three years' : `${y} years`;
}
// A town's memory is called back at most once a season: a burst of lines about one town (a raid: the dead,
// the funeral, the new chief) must not echo the same memory three times.
function recall(town, aboutKey) {
  if (!town || world.tick - (town.recallTick || -1e9) < YEAR / 4) return null;
  const m = (town.memory || []).find(e => world.tick - e.tick < YEAR * 3 && world.tick - e.tick > YEAR / 4 && !(aboutKey || '').startsWith(e.kind));
  if (!m) return null;
  town.recallTick = world.tick;
  const S = m.short[0].toUpperCase() + m.short.slice(1);
  return pick([`It is ${agoWord(world.tick - m.tick)} since ${m.short}.`, `${S} is still talked about.`, `Nobody has forgotten ${m.short}.`, `The old people say it was like this before ${m.short}.`, `${S} was ${agoWord(world.tick - m.tick)} ago, and it feels like yesterday.`]);
}

// ── People come in families ──
function surnameOf(name) { return name.split(' ').slice(1).join(' '); }
function kinOf(town, p) { const s = surnameOf(p.name); return (town.people || []).filter(q => q !== p && surnameOf(q.name) === s); }
// A new person in a town: often a member of a family already there, sometimes kin of a named person.
function makePersonIn(town, role, ageYears, kin) {
  const p = makePerson(Math.random, role, ageYears);
  const living = (town.people || []).filter(q => q.alive);
  if (kin) { p.name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + ' ' + surnameOf(kin.name); p.kin = kin.name; }
  else if (living.length && Math.random() < 0.45) { const rel = pick(living); p.name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + ' ' + surnameOf(rel.name); p.kin = rel.name; }
  return p;
}
function kinLabel(town, p) {
  if (!p.kin) return '';
  const k = (town.people || []).find(q => q.name === p.kin);
  if (!k) return '';
  return `${k.alive ? 'kin' : 'kin'} of ${k.name}${k.role === 'elder' ? ' the elder' : k.cause === 'hanged' ? ', who was hanged' : k.cause === 'banished' ? ', who was cast out' : ''}`;
}
// A wrong done to one of the family is remembered by the rest.
function grudgeKin(town, p, against, why) {
  for (const q of kinOf(town, p)) if (q.alive && !q.grudge) { q.grudge = { against, why, since: world.tick, over: p.name }; deed(q, `swore to remember ${why}`); }
}
function grudgeHolders(town) { return (town.people || []).filter(q => q.alive && q.grudge && world.tick - q.grudge.since < YEAR * 6); }

// ── The phrases ──
const PHRASES = {
  idleHands: [
    c => `${c.n} idle hands in ${c.name} and nothing to put them to. ${moodWord(c.town)[0].toUpperCase() + moodWord(c.town).slice(1)}.`,
    c => `${c.name} has ${c.n} people with no work. They stand about the square ${daypart()} and ${elderOf(c.town)} pretends not to notice.`,
    c => `No work for ${c.n} in ${c.name}. A workshop would help; so would a war, say the worst of them.`,
  ],
  alarm: [
    c => `${c.name} sounds the alarm ${daypart()}, ${c.crews} rally${c.chief ? `, Chief ${c.chief} at their head` : ''}`,
    c => `Smoke over ${c.name} ${weatherWord()}. ${c.crews} rally${c.chief ? ` behind Chief ${c.chief}` : ''}`,
    c => `The bell rings in ${c.name} and ${c.crews} turn out${c.chief ? `; Chief ${c.chief} is already at the edge of town` : ''}`,
    c => `Fire ${weatherWord()} and ${c.name} rallies: ${c.crews}${c.chief ? `, ${c.chief} shouting the orders` : ''}`,
    c => `${c.name} sees the glow ${daypart()} and ${c.crews} go out to meet it`,
    c => `Every able body in ${c.name} is on the line: ${c.crews}${c.chief ? ` under Chief ${c.chief}` : ''}, ${moodWord(c.town)}`,
  ],
  saved: [
    c => `${c.name} stands down, all ${c.homes} homes saved`,
    c => `The line holds at ${c.name}. ${c.homes} homes, not one lost`,
    c => `${c.name} beats the fire back ${daypart()} and keeps every one of its ${c.homes} homes`,
    c => `Quiet again in ${c.name}. Nothing lost, and the crews come home black to the elbows`,
    c => `${c.name} stands down with the ${c.homes} homes it started with. ${moodWord(c.town)[0].toUpperCase() + moodWord(c.town).slice(1)}`,
  ],
  lost: [
    c => `${c.name} stands down, lost ${c.lost} of ${c.had} homes`,
    c => `The fire is out at ${c.name}; ${c.lost} of ${c.had} homes are ash`,
    c => `${c.name} counts the cost ${daypart()}: ${c.lost} homes gone of ${c.had}`,
    c => `${c.name} stands down. ${c.lost} families are sleeping in the hall tonight`,
    c => `Smoke clears over ${c.name}: ${c.lost} homes lost, ${c.had - c.lost} standing`,
  ],
  reaches: [
    c => `Fire reaches ${c.name}`,
    c => `The fire is in ${c.name}'s streets ${weatherWord()}`,
    c => `Flames at the first houses of ${c.name}`,
    c => `${c.name} is burning`,
  ],
  buildingLost: [
    c => `${c.name} loses its ${c.what}`,
    c => `The ${c.what} at ${c.name} burns`,
    c => `${c.name}'s ${c.what} goes up ${weatherWord()}`,
    c => `Nothing left of the ${c.what} in ${c.name}`,
  ],
  famine: [
    c => `Famine in ${c.name}: the granary is empty and ${c.pop} mouths to feed`,
    c => `The granary at ${c.name} is scraped bare. ${c.pop} people and nothing to put on the table`,
    c => `${c.name} goes hungry ${weatherWord()}. ${elderOf(c.town)} orders the last of the stores shared out`,
    c => `No bread in ${c.name}. The children are quiet, which is the worst of it`,
    c => `Famine at ${c.name}, ${c.pop} mouths and an empty granary. ${moodWord(c.town)[0].toUpperCase() + moodWord(c.town).slice(1)}`,
  ],
  famineEnds: [
    c => `The famine in ${c.name} ends`,
    c => `There is bread again in ${c.name}`,
    c => `The granary at ${c.name} has something in it. The hunger lifts`,
    c => `${c.name} eats a full meal for the first time in weeks`,
  ],
  grows: [
    c => `${c.name} grows: new road, ${c.homes} homes`,
    c => `${c.name} pushes out a new street, ${c.homes} homes now`,
    c => `A new road out of ${c.name}; the town is ${c.homes} homes`,
    c => `${c.name} spreads a little further ${seasonWord() === 'winter' ? 'even in the snow' : 'this ' + seasonWord()}: ${c.homes} homes`,
  ],
  addsHomes: [
    c => `${c.name} adds homes (${c.homes})`,
    c => `New roofs in ${c.name}: ${c.homes} homes`,
    c => `${c.name} is ${c.homes} homes now`,
    c => `Hammers in ${c.name} ${daypart()}. ${c.homes} homes`,
  ],
  market: [
    c => `Market day at ${c.name}: ${c.deal}. ${c.coin} coin in the chest.`,
    c => `The caravan opens its wagons at ${c.name} ${daypart()}: ${c.deal}. ${c.coin} coin left in the chest`,
    c => `Haggling in the square at ${c.name}: ${c.deal}. The chest holds ${c.coin}`,
    c => `${c.name} trades ${weatherWord()}: ${c.deal}. ${c.coin} coin in the chest`,
  ],
  marketNothing: [
    c => `Market day at ${c.name}, but nobody has anything the other wants`,
    c => `The caravan opens its wagons at ${c.name} and closes them again. No trade`,
    c => `A thin market at ${c.name}: the trader shrugs and moves on`,
  ],
  caravan: [
    c => `A trader's caravan appears on the ${c.edge} edge, bound for ${c.name}`,
    c => `Wagons on the ${c.edge} road ${daypart()}: a caravan for ${c.name}`,
    c => `A caravan comes over the ${c.edge}ern hills making for ${c.name}`,
    c => `Dust on the ${c.edge} edge: traders, heading to ${c.name}`,
  ],
  industryFire: [
    c => `Fire breaks out at the ${c.what} in ${c.name}`,
    c => `Sparks from the ${c.what} at ${c.name} catch ${daypart()}`,
    c => `The ${c.what} in ${c.name} is alight; somebody left the furnace open`,
  ],
  arson1: [
    c => `Someone from ${c.name} set a fire on the edge of town. Nobody saw who.`,
    c => `A fire on the edge of ${c.name} ${daypart()} that nobody can explain`,
    c => `Flames in the scrub outside ${c.name}. It did not start itself.`,
  ],
  arson2: [
    c => `Another fire set on the edge of ${c.name}. People are starting to talk about ${c.who}.`,
    c => `A second fire outside ${c.name}. ${c.who}'s name comes up at the well`,
    c => `${c.name} burns again at the edge. Somebody saw ${c.who} out late`,
  ],
  arson3: [
    c => `${c.who} set a fire on the edge of ${c.name} again. This time they were seen.`,
    c => `${c.who} was seen with a torch outside ${c.name}. Nobody is surprised.`,
    c => `Once more a fire outside ${c.name}, and this time ${c.who} did not get away clean`,
  ],
  warDeclared: [
    c => `${c.name} declares war on ${c.other}${c.why ? ' ' + c.why : ''}${c.elder ? `. Elder ${c.elder} signed the order` : ''}`,
    c => `${c.name} marches on ${c.other}${c.why ? ' ' + c.why : ''}. ${c.elder ? `${c.elder} says it had to be done` : 'Nobody is sure who decided'}`,
    c => `War. ${c.name} against ${c.other}${c.why ? ', ' + c.why : ''}${c.elder ? `, by ${c.elder}'s hand` : ''}`,
    c => `${c.name} sends ${c.other} a declaration of war ${daypart()}${c.why ? ' ' + c.why : ''}`,
  ],
  truce: [
    c => `${c.name} and ${c.other} agree a truce${c.why ? ' ' + c.why : ''}${c.hands ? `, ${c.hands} shaking on it` : ''}`,
    c => `The war between ${c.name} and ${c.other} ends${c.why ? ' ' + c.why : ''}. ${c.hands ? `${c.hands} meet on the road and shake` : 'Both sides go home'}`,
    c => `Peace between ${c.name} and ${c.other}${c.why ? ' ' + c.why : ''}. The widows do not celebrate`,
  ],
  meet: [
    c => `${c.name}'s ${c.att} meet ${c.other}'s ${c.def} ${c.wall ? 'at the wall' : 'outside the town'}`,
    c => `${c.att} from ${c.name} come up against ${c.def} of ${c.other} ${c.wall ? 'under the wall' : 'in the fields'} ${weatherWord()}`,
    c => `Battle at ${c.other}: ${c.name}'s ${c.att} against ${c.def} defenders${c.wall ? ' on the wall' : ''}`,
  ],
  holds: [
    c => `${c.other} holds. ${c.name} lost all ${c.att0}${c.wall ? ' at the wall' : ''}, ${c.defLost} defenders fell`,
    c => `${c.other} throws ${c.name} back${c.wall ? ' from the wall' : ''}. ${c.att0} attackers dead, ${c.defLost} of the town's own`,
    c => `The attack on ${c.other} breaks ${daypart()}. ${c.name}'s ${c.att0} are all dead; ${c.other} buries ${c.defLost}`,
  ],
  withdraws: [
    c => `${c.name} withdraws from ${c.other} after a bloody day: ${c.attLost} attackers and ${c.defLost} defenders dead`,
    c => `${c.name} pulls back from ${c.other} ${daypart()}, leaving ${c.attLost} dead against ${c.defLost}`,
    c => `Neither side wins at ${c.other}. ${c.name} goes home ${c.attLost} fewer; ${c.other} is ${c.defLost} fewer`,
  ],
  dragonSeen: [
    c => `${c.who.toUpperCase()}, a ${c.kind} dragon, has been sighted making for ${c.name}${c.then ? ' and then ' + c.then : ''}`,
    c => `A ${c.kind} shape in the sky ${daypart()}: ${c.who.toUpperCase()}, and it is coming for ${c.name}${c.then ? ', then ' + c.then : ''}`,
    c => `${c.who.toUpperCase()} is in the valley. The ${c.kind} dragon turns toward ${c.name}${c.then ? ' and after that ' + c.then : ''}`,
  ],
  dragonLeaves: [
    c => `${c.who} leaves ${c.name} burning. ${c.lit} building${c.lit === 1 ? '' : 's'} set ablaze${c.loot ? `, and it flies off with ${c.loot} for its hoard` : ''}.`,
    c => `${c.who} is done with ${c.name}: ${c.lit} building${c.lit === 1 ? '' : 's'} alight${c.loot ? ` and ${c.loot} gone with it` : ''}. The sky is empty again.`,
    c => `${c.who} climbs away from ${c.name} ${weatherWord()}, ${c.lit} fires behind it${c.loot ? ` and ${c.loot} in its claws` : ''}.`,
  ],
  dragonDriven: [
    c => `${c.name}'s militia drives the dragon off! ${c.lost} archers lost. It will remember.`,
    c => `Arrows from ${c.name}'s wall find ${c.who}, and it turns away. ${c.lost} archers paid for it. It will remember.`,
    c => `${c.who} breaks off from ${c.name} with ${c.name}'s arrows in its hide. ${c.lost} dead on the wall. It will remember.`,
  ],
  plague: [
    c => `Plague in the crowded streets of ${c.name}: ${c.dead} dead${c.saved ? `, ${c.saved} pulled through under the healer's roof` : ''}. A waterworks would help.`,
    c => `Sickness runs through ${c.name}'s tenements ${weatherWord()}: ${c.dead} dead${c.saved ? `, ${c.saved} saved by the healer` : ''}. Clean water would stop it.`,
    c => `${c.name} buries ${c.dead} of plague${c.saved ? `; ${c.saved} more would have gone without the healer` : ''}. The streets are too crowded and the water too foul.`,
  ],
  crewLost: [
    c => `${c.name}: crew of ${c.n} ${c.why}`,
    c => `${c.name} loses a crew of ${c.n}, ${c.why}`,
    c => `${c.n} of ${c.name}'s firefighters ${c.why}`,
  ],
  settlersFound: [
    c => `${c.n} settlers found ${c.name}, ${c.homes} homes raised${c.leader ? `. ${c.leader} led them` : ''}`,
    c => `${c.name} is founded by ${c.n} settlers ${weatherWord()}${c.leader ? `, ${c.leader} driving the first stake` : ''}. ${c.homes} homes`,
    c => `A new town: ${c.name}, ${c.n} people and ${c.homes} roofs${c.leader ? `, named by ${c.leader}` : ''}`,
  ],
  refugees: [
    c => `${c.n} refugees leave the ruins of ${c.name} for ${c.host}`,
    c => `${c.n} people walk out of what is left of ${c.name}, bound for ${c.host}`,
    c => `${c.name} empties: ${c.n} refugees on the road to ${c.host} ${weatherWord()}`,
  ],
  lightning: [
    c => `Lightning strikes just outside ${c.name}`,
    c => `A bolt comes down ${daypart()} within sight of ${c.name}`,
    c => `Thunder over ${c.name}, and a strike in the timber close by`,
  ],
  crowning: [
    c => c.name ? `Fire is crowning in the timber near ${c.name}` : 'Fire is crowning in the timber',
    c => c.name ? `The fire is crowning in the timber above ${c.name}; whole trees go up at once` : 'Fire is crowning in the timber, tree to tree, faster than a man can run',
    c => c.name ? `Crowning in the timber within sight of ${c.name} ${daypart()}: the tops are burning before the trunks` : `A crown run ${daypart()}: fire is crowning in the timber and the smoke stands up like a wall`,
    c => c.name ? `${c.name} watches it crowning in the timber ${weatherWord()}, a roar you feel in the ground` : 'Fire is crowning in the timber, and the embers go out ahead of it',
    c => c.name ? `Crowning in the timber near ${c.name}, the ${seasonWord()} canopy catching like paper` : 'The fire has got into the crowns. Crowning in the timber, and nothing stops a crown run but weather',
  ],
  lightningWild: [
    () => 'Lightning strike in the forest',
    () => `Lightning in the far timber ${daypart()}`,
    () => 'A strike somewhere in the wilds; smoke follows',
  ],
};
