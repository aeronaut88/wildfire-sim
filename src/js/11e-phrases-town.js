/* ───────────────────────── Town phrases: growth, building, stores, roads and markets ─────────────────────────
   The town's daily business, said the way a chronicler would: the first of a thing is news, the
   tenth is only worth a line when it means something to someone. Bags extend PHRASES from 11b, so
   say() gives them the same anti-repeat, weather, hour and memory. Every phrasing keeps the town's
   name and whatever number the old line carried. */

function twCap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
function twMood(town) { return twCap(moodWord(town)); }
// The mood after bad news: a happy town does not cheer a loss, it shrugs.
function twLossMood(town) { return (town.unrest || 0) <= 25 ? pick(['Nobody panics yet', 'People take it in their stride', 'Nobody says much about it', 'Life goes on']) : twMood(town); }
function twA(word) { return /^[aeiou]/i.test(word) ? 'an ' + word : 'a ' + word; }
// True, and stamped, when this town has not said `key` for `ticks`. Per town, saved with the town.
function twDue(town, key, ticks) {
  const m = town.saidAt || (town.saidAt = {});
  if (m[key] !== undefined && world.tick >= m[key] && world.tick - m[key] < ticks) return false;
  m[key] = world.tick; return true;
}
// The first of a kind is news (key + 'First'); after that at most once in `every` ticks, said as `key`.
function twNews(town, key, none, c, kind, at, every) {
  const s = town.saidFirst || (town.saidFirst = {});
  if (!s[key] && none && PHRASES[key + 'First']) { s[key] = world.tick; (town.saidAt || (town.saidAt = {}))[key] = world.tick; return say(town, key + 'First', c, kind, at); }
  s[key] = s[key] || world.tick;
  if (twDue(town, key, every || YEAR)) return say(town, key, c, kind, at);
  return null;
}
// Someone in town with a name: by role if asked, else anyone who is not hiding something.
const TW_QUIET_ROLES = new Set(['firebug', 'thief', 'spy', 'convict', 'sot', 'ousted', 'child']);
function twWho(town, roles) {
  const ps = (town.people || []).filter(p => p.alive && (roles ? roles.includes(p.role) : !TW_QUIET_ROLES.has(p.role)));
  return ps.length ? pick(ps).name : null;
}
function twFolk(town, roles, fallback) { return twWho(town, roles) || twWho(town) || fallback || 'a carter'; }
function twFamily(town) {
  const p = twWho(town), s = p ? surnameOf(p) : pick(LAST_NAMES);
  return 'the ' + (/(s|x|z|sh|ch)$/.test(s) ? s + 'es' : s + 's');
}
const TW_CROP = ['wheat', 'barley', 'turnips', 'apples', 'tobacco'];
function twCrop(town) {
  const c = [0, 0, 0, 0, 0];
  for (const i of town.buildings || []) if (world.type[i] === T.FARM) c[cropKindAt(i) || 0]++;
  let b = 0; for (let k = 1; k < 5; k++) if (c[k] > c[b]) b = k;
  return TW_CROP[b];
}
// What a town leans toward, when it leans hard: wood, stone, food, build or trade.
function twTemper(town) { const t = town.temper; if (!t) return null; let best = null, v = 1.15; for (const k in t) if (t[k] > v) { v = t[k]; best = k; } return best; }
function twElder(town) { return twCap(elderOf(town)); }

// ── Rebuilding: once when it starts, once when the last burned plot is built on. ──
function twRebuilt(town) {
  if (town.rebuilding) return;
  town.rebuilding = world.tick;
  if (twDue(town, 'rebuildStart', YEAR / 2)) say(town, 'rebuildStart', { homes: town.housesLeft, ruins: Math.max(1, townRubble(town).length) }, 'build');
}
function twRebuildCheck(town, ruinsLeft) {
  if (!town.rebuilding) return;
  const took = world.tick - town.rebuilding;
  if (ruinsLeft) { if (took > YEAR * 2 || took < 0) town.rebuilding = 0; return; }
  town.rebuilding = 0;
  if (took > 40 && twDue(town, 'rebuildDone', YEAR / 2)) say(town, 'rebuildDone', { homes: town.housesLeft, ago: agoWord(took) }, 'build');
}
// ── Fields: the first is news, then a line each time the town passes another eight. ──
function twFields(town, at) {
  const n = countPlanned(town, T.FARM);
  if (!town.fieldsMark) {
    town.fieldsMark = Math.max(1, Math.floor(n / 8));
    if (n <= 3) say(town, 'fieldsFirst', { farms: n, crop: twCrop(town) }, 'build', at);
    return;
  }
  const lvl = Math.floor(n / 8);
  if (lvl > town.fieldsMark && twDue(town, 'fields', YEAR / 2)) { town.fieldsMark = lvl; say(town, 'fields', { farms: n, crop: twCrop(town) }, 'build', at); }
}
// ── A building finished: the first of each kind says what it is for; later ones seldom, and as use. ──
const TW_DONE = { [T.GRANARY]: 'doneGranary', [T.WELL]: 'doneWell', [T.QUARRY]: 'doneQuarry', [T.PASTURE]: 'donePasture', [T.CISTERN]: 'doneCistern', [T.LUMBERYARD]: 'doneLumberyard', [T.MINE]: 'doneMine', [T.FISHERY]: 'doneFishery', [T.TOWNHALL]: 'doneHall', [T.FORGE]: 'doneForge', [T.BAKERY]: 'doneBakery', [T.INN]: 'doneInn', [T.SMOKEHOUSE]: 'doneSmokehouse', [T.BARRACKS]: 'doneBarracks', [T.HEALER]: 'doneHealer', [T.GAOL]: 'doneGaol', [T.BREWERY]: 'doneBrewery', [T.MILL]: 'doneMill' };
function twFinished(town, type, at) {
  const f = town.firstBuilt || (town.firstBuilt = {});
  const what = BUILDING_NAMES[type].toLowerCase();
  const c = { what, n: countType(town, type), ore: town.mineKind && town.mineKind[at] ? ORE_NAMES[town.mineKind[at]] : 'ore' };
  if (!f[type]) { f[type] = world.tick; if (c.n <= 1) { say(town, TW_DONE[type] || 'finishFirst', c, 'build', at); return; } }
  if (Math.random() < 0.1 && twDue(town, 'finishAgain', YEAR / 2)) say(town, 'finishAgain', c, 'build', at);
}
// ── Civic works: the first of each is said as it always was; the same work again, seldom. ──
function twCivic(town, type, verb, at) {
  const s = town.civicSaid || (town.civicSaid = {});
  if (!s[verb]) { s[verb] = world.tick; log(`${town.name} ${verb}`, 'build', at); return; }
  if (twDue(town, 'civicAgain', YEAR / 2)) say(town, 'civicAgain', { what: BUILDING_NAMES[type].toLowerCase() }, 'build', at);
}

Object.assign(PHRASES, {
  // ── Fields ──
  fieldsFirst: [
    c => (w => `${c.name} turns its first furrow ${daypart()}. ${w} walks behind the plough, and the crows walk behind ${w}`)(twFolk(c.town)),
    c => `${c.name} grubs the stumps out beside the houses and sows ${c.crop}. One field, and the whole town has an opinion about it`,
    c => `The first field at ${c.name} is no bigger than a hall floor. ${twElder(c.town)} paces it out twice to be sure`,
    c => `${c.name} burns off a patch of scrub ${daypart()} and puts ${c.crop} into the ash. Its first field`,
  ],
  fields: [
    c => `${c.name} clears more ground for ${c.crop}: ${c.farms} fields now, and ${twFolk(c.town)} swears the stumps fought back`,
    c => ({ 0: `Ploughs out at ${c.name} ${daypart()}. ${c.farms} fields to sow this spring, ${c.crop} mostly`, 1: `${c.farms} fields around ${c.name} now; the new ones are still pale with the stubble of the burn`, 2: `${c.name} takes in new ground after the harvest. ${c.farms} fields will be sown come spring`, 3: `${c.name} fells scrub on the frozen ground so there will be ${c.farms} fields by the thaw` })[season()],
    c => `${twCap(twFamily(c.town))} take a new strip on the far side of ${c.name}'s ditch. ${c.farms} fields in all`,
    c => `${c.name}'s fields reach the old boundary stone. Somebody moves the stone. ${c.farms} fields`,
    c => has(c.town, 'greenthumb') ? `${elderOf(c.town)} walks the new rows at ${c.name} with a handful of soil, tasting it. ${c.farms} fields, and ${elderOf(c.town)} wants more` : `${twElder(c.town)} has the hedges grubbed out at ${c.name} to make room: ${c.farms} fields`,
    c => (c.town.unrest || 0) >= 45 ? `${c.name} clears more ground (${c.farms} fields). The stump-pulling is given to the grumblers, and ${moodWord(c.town)}` : `${c.farms} fields at ${c.name}, and the young ones race each other to the end of a row before the bell`,
    c => world.weather.kind === 'drought' ? `${c.name} ploughs dust and calls it a field. ${c.farms} of them now, all waiting on rain` : world.weather.kind === 'rain' || world.weather.kind === 'storm' ? `${c.name} breaks new ground in the wet, the oxen in it to the knees. ${c.farms} fields` : `Smoke from the stump fires at ${c.name} ${daypart()}: new ground, ${c.farms} fields in all`,
    c => `A child at ${c.name} counts the fields from the hall roof and gets ${c.farms}. ${twElder(c.town)} counts again and agrees`,
    c => twTemper(c.town) === 'food' ? `${c.name} would sooner plough than build. ${c.farms} fields, and the new houses can wait` : `${c.name} lays its new ground out in strips, so every family gets some of the good soil and some of the bad. ${c.farms} fields`,
    c => `${twCap(c.crop)} as far as the ditch at ${c.name}: ${c.farms} fields, and ${twFamily(c.town)} still say the old ones gave better`,
  ],
  wither: [
    c => `The drought withers ${c.n} of ${c.name}'s fields`,
    c => `${c.n} fields at ${c.name} go to straw on the stalk. ${twFolk(c.town)} pulls one up and the root is dust`,
    c => `${c.name} gives up on ${c.n} fields too far from water. The scrub will have them back`,
    c => `${c.name} loses ${c.n} fields to the dry. ${twLossMood(c.town)}`,
    c => `${twElder(c.town)} walks ${c.name}'s dead fields, all ${c.n} of them, and says nothing the whole way home`,
    c => has(c.town, 'greenthumb') ? `Even ${elderOf(c.town)} cannot keep the ${twCrop(c.town)} alive in this: ${c.n} fields lost at ${c.name}` : `The ${twCrop(c.town)} at ${c.name} lies down in the heat and does not get up. ${c.n} fields gone`,
  ],
  // ── Granaries ──
  granaryFirst: [
    c => `${c.name} raises a granary on stilts, a flat stone under each post to turn the rats. Until now the grain has slept under the beds`,
    c => `${c.name} builds its first granary ${weatherWord()}. ${twElder(c.town)} keeps the only key`,
    c => has(c.town, 'tyrant') || has(c.town, 'hoarder') ? `${c.name} raises a granary, and ${elderOf(c.town)} has a guard on the door before the roof is on` : `${c.name} raises a granary. ${twFolk(c.town)} hangs a basket by the door for the cat`,
  ],
  granary: [
    c => `The ${twCrop(c.town)} has outgrown the old store at ${c.name}. A new granary goes up beside it, and the mice move in before the grain does`,
    c => `${c.name} puts up another granary, because ${elderOf(c.town)} remembers ${c.town.hadFamine ? 'the famine' : 'a winter with nothing in the bins'} and does not mean to see it again`,
    c => `${twFolk(c.town)} of ${c.name} is given the keys to the new granary and wears them on a string round the neck`,
    c => season() === 2 ? `The harvest is coming in faster than ${c.name} can store it. Another granary, raised in a week` : season() === 3 ? `${c.name} builds a granary in the snow, for next year's grain` : `${c.name} raises another granary ${daypart()}, against a bad year that has not come yet`,
    c => `${c.name}'s granaries (${c.n} of them now) stand in a row along the lane like old men at a wedding`,
    c => has(c.town, 'miser') || has(c.town, 'hoarder') ? `${elderOf(c.town)} has another granary built at ${c.name} and fills it before the children are fed` : `${c.name} raises another granary. The old one leans, and nobody wants to be the one to say so`,
    c => (c.town.unrest || 0) <= 25 ? `Another granary at ${c.name}. ${twMood(c.town)}, and bread is cheap` : `Another granary at ${c.name}, and ${moodWord(c.town)}: people want to know who it is being filled for`,
  ],
  // ── Building done ──
  finishFirst: [
    c => `${c.name} has ${twA(c.what)} at last. ${twFolk(c.town)} was first through the door`,
    c => `The ${c.what} at ${c.name} is done ${daypart()}; the builders sit on its step and eat`,
    c => `${twFolk(c.town)} carves the year over the door of ${c.name}'s new ${c.what}`,
    c => `The roof goes on ${c.name}'s ${c.what} ${weatherWord()}, which the builders take as a sign of something`,
    c => `${c.name} finishes its ${c.what}, and ${elderOf(c.town)} makes a speech short enough to be remembered`,
    c => `${twCap(twFamily(c.town))} hold a supper in ${c.name}'s new ${c.what} before anything else goes in it`,
  ],
  finishAgain: [
    c => `${c.name}'s new ${c.what} is in use before the last nail is in`,
    c => `Nobody at ${c.name} remarks on the new ${c.what}. ${c.n} of them now; a town gets used to building`,
    c => `${c.name} finishes another ${c.what}, and the scaffold poles go straight to the next frame`,
    c => twTemper(c.town) === 'build' ? `${c.name} builds the way other towns breathe: another ${c.what}, ${c.n} in all` : `${c.name} takes its time over a new ${c.what}, and it shows in the joints. That makes ${c.n}`,
    c => `${twFolk(c.town)} of ${c.name} complains that the new ${c.what} has spoiled the view, and then uses it every day`,
    c => `The new ${c.what} at ${c.name} still smells of sawdust ${weatherWord()}; ${c.n} of them now`,
  ],
  doneGranary: [
    c => `The first bushels go up the ladder into ${c.name}'s granary. ${twFolk(c.town)} counts them, and counts them again`,
    c => `${c.name}'s granary is done, and for the first winter the seed corn is somewhere the damp cannot reach`,
  ],
  doneWell: [
    c => `${c.name}'s well is finished. The first bucket comes up cold enough to hurt the teeth`,
    c => `The well at ${c.name} is done, and the women who carried pails from the river do not know what to do with their mornings`,
  ],
  doneQuarry: [
    c => `${c.name}'s quarry is open. The first blocks come in on rollers and are looked at as if they were gold`,
    c => `The quarry at ${c.name} is cut back to good rock. ${twFolk(c.town)} taps a block and listens to it ring`,
  ],
  donePasture: [
    c => `The fence is closed round ${c.name}'s pasture, and the animals stand in the middle of it looking at the town`,
    c => `${c.name}'s pasture is fenced and gated. ${twFolk(c.town)} leans on the gate every evening after`,
  ],
  doneCistern: [
    c => `${c.name}'s cistern is sealed and lined. The first rain off the roofs runs into it with a sound like applause`,
    c => `The cistern at ${c.name} is done. ${twElder(c.town)} drops a stone in and listens for the splash`,
  ],
  doneLumberyard: [
    c => `${c.name}'s lumberyard is open. Planks stacked to dry, and the whine of the saw from first light`,
    c => `The lumberyard at ${c.name} is done; ${twFolk(c.town)} brings in the first log and gets the first splinter`,
  ],
  doneMine: [
    c => `${c.name}'s mine is through to the ${c.ore}. The first cart comes up with a lamp swinging on it`,
    c => `The ${c.ore} mine at ${c.name} is timbered and working. ${twFolk(c.town)} goes down first and comes up black`,
  ],
  doneFishery: [
    c => `${c.name}'s fisher's hut is done, and the nets are hung on the wall to dry like washing`,
    c => `The first catch comes up to ${c.name} from the new fisher's hut, still flapping in the basket`,
  ],
  doneHall: [
    c => `${c.name}'s town hall is finished. ${twElder(c.town)} sits in the big chair for the first time and finds it uncomfortable`,
    c => `The town hall at ${c.name} opens with a long table, a short bench, and an argument about who sits where`,
    c => `${c.name} has a hall to meet in at last. The first meeting is about the cost of the hall`,
  ],
  doneForge: [
    c => `The forge at ${c.name} is lit. ${twFolk(c.town, ['smith'])} makes a horseshoe first, though nobody in town owns a horse`,
    c => `${c.name}'s forge is finished. The ring of the hammer carries to the fields ${daypart()}`,
  ],
  doneBakery: [
    c => `${c.name}'s bakery is done. The oven is lit three days before the first loaf, to season the brick`,
    c => `The bakery at ${c.name} is finished; the smell reaches the far houses before the news does`,
  ],
  doneInn: [
    c => `${c.name}'s inn opens. ${twFolk(c.town)} is the first to drink in it and the last to leave`,
    c => `The inn at ${c.name} is done: a fire, a long bench, and a sign nobody can agree on`,
  ],
  doneSmokehouse: [
    c => `${c.name}'s smokehouse is done. Oak chips, a slow fire, and the first fish hung like washing`,
    c => `The smokehouse at ${c.name} is finished, and the whole east side of town smells of it from now on`,
  ],
  doneBarracks: [
    c => `${c.name}'s barracks is finished. The bunks are hard and the soldiers say so`,
    c => `The barracks at ${c.name} is done, and the drill yard is trodden flat inside a week`,
  ],
  doneHealer: [
    c => `${c.name}'s healer's house is done. Bundles of herbs hang from every beam`,
    c => `The healer's house at ${c.name} opens; the first patient is a builder who dropped a beam on a foot raising it`,
  ],
  doneGaol: [
    c => `${c.name}'s gaol is finished. It stands empty a while, which ${elderOf(c.town)} calls a waste`,
    c => `The gaol at ${c.name} is done: one door, one key, one small window facing the gallows field`,
  ],
  doneBrewery: [
    c => `${c.name}'s brewery is finished, and the first batch is drunk before it is ready`,
    c => `The brewery at ${c.name} is done. The barley has somewhere better to go than bread`,
  ],
  doneMill: [
    c => `${c.name}'s mill turns for the first time ${daypart()}; the miller stands and watches the wheel for an hour`,
    c => `The mill at ${c.name} is done. No more grinding by hand; the querns go into the wall of a shed`,
  ],
  civicAgain: [
    c => `${c.name} sets out the frame of a new ${c.what}. The old builders show the young ones where the posts go`,
    c => `A new ${c.what} going up at ${c.name}. ${twFolk(c.town)} has views on which way it should face`,
    c => `${c.name} pegs out ground for ${twA(c.what)} ${weatherWord()}`,
    c => `${twElder(c.town)} drives the first peg for ${c.name}'s new ${c.what} and makes the short speech, which is the best kind`,
    c => `${c.name} raises ${twA(c.what)} on old footings; the masons say the footings were the only good part of the last one`,
    c => `Carts of timber block ${c.name}'s square all day: ${twA(c.what)} is going up`,
  ],
  // ── Stone ──
  quarryFirst: [
    c => `${c.name} opens a quarry where the rock comes up through the grass. ${twFolk(c.town)} strikes the first wedge and the whole face rings`,
    c => `${c.name} finds good grey stone ${c.far ? 'a long walk out' : 'close to home'} and opens a quarry. Nobody here has built in stone before`,
    c => `A quarry for ${c.name}. The first block comes out crooked and is kept anyway, for the hall step`,
  ],
  quarry: [
    c => `${c.name} opens another quarry. The old face is cut back so deep it has started to echo`,
    c => `${twFolk(c.town)} takes a crew out of ${c.name} to a new quarry ${c.far ? 'beyond the last field' : 'past the well'}; the town is building faster than one face can feed it`,
    c => `The wedges go in at ${c.name}'s new quarry ${daypart()}. The white scar on the hill will be seen from the road for years`,
    c => person(c.town, 'mason') ? `${person(c.town, 'mason').name}, ${c.name}'s master mason, walks the hills a week before choosing the rock for a new quarry` : `${c.name} opens another quarry, and pays a mason from away to say where`,
    c => has(c.town, 'tyrant') ? `${elderOf(c.town)} sends ${c.name}'s debtors to cut a new quarry` : `${c.name} opens another quarry. Stone is cheaper than timber now, and ${elderOf(c.town)} has done the sums`,
    c => world.weather.kind === 'rain' || world.weather.kind === 'storm' ? `A new quarry at ${c.name}, cut in the rain; the first blocks come up slick and grey as fish` : season() === 3 ? `${c.name} opens a quarry in the frost, when the rock splits cleanest` : `${c.name} opens another quarry ${weatherWord()}. The quarriers come home white to the eyebrows`,
    c => `${c.name} is cutting stone at ${c.n} faces now. Somebody builds a pigsty out of the offcuts`,
  ],
  // ── The shore ──
  fisheryFirst: [
    c => `${c.name} builds a fisher's hut on the shore`,
    c => `${c.name} puts up a fisher's hut where the reeds thin out, with a jetty of three planks`,
    c => `${twFolk(c.town)} of ${c.name} builds a hut on the shore and hangs nets from the eaves. There will be fish on the table from now on`,
  ],
  fishery: [
    c => `${c.name} builds another fisher's hut; the first one's nets were never dry`,
    c => `Another fisher's hut on the shore below ${c.name}. The herons move further up the bank`,
    c => `${c.name} raises a fisher's hut on the shore again, and ${twFolk(c.town)} tars the boat before anything else`,
    c => `${twFolk(c.town)} of ${c.name} wants to fish further from the gossip. A new hut goes up down the shore`,
    c => season() === 3 ? `${c.name} builds a fisher's hut on the frozen shore, ready for the thaw` : `${c.name} builds a fisher's hut ${weatherWord()}; the gulls are on the roof before the thatch is`,
  ],
  // ── Water ──
  wellFirst: [
    c => `${c.name} digs a well${c.timber ? ', lined with timber for want of stone' : ''}. ${twFolk(c.town)} is let down on a rope to look, and comes up wet and grinning`,
    c => `${c.name} digs until the spade comes up dark and cold. A well${c.timber ? ', timbered for want of stone' : ', lined with fieldstone'}, and ${elderOf(c.town)} drinks first`,
    c => `No more walking to the river for ${c.name}: a well in the square${c.timber ? ', boarded with timber for want of stone' : ''}`,
  ],
  well: [
    c => `${c.name} digs another well${c.timber ? ', lined with timber for want of stone' : ''}. The old one has started to taste of iron`,
    c => world.weather.kind === 'drought' ? `${c.name} digs another well in the dust${c.timber ? ', timbered for want of stone' : ''}. ${twLossMood(c.town)}` : `${c.name} sinks a new well ${weatherWord()}${c.timber ? ', lined with timber because there is no stone to spare' : ''}`,
    c => `${twCap(twFamily(c.town))} at ${c.name} are tired of queueing at the pump. A new well goes in at the end of their lane${c.timber ? ', timbered, for want of stone' : ''}`,
    c => `${twFolk(c.town)} dowses a new well at ${c.name} with a hazel fork. It strikes water at twenty feet, which proves something to someone${c.timber ? '. Timber lines it; there is no stone' : ''}`,
    c => `Another well at ${c.name}${c.timber ? ', boarded with timber because the quarry has nothing to give' : ''}. That makes ${c.n}`,
    c => `A new well at ${c.name}. The children drop pebbles down it to hear how deep, until ${elderOf(c.town)} stops them${c.timber ? '. It is lined with timber for want of stone' : ''}`,
    c => has(c.town, 'madman') ? `${elderOf(c.town)} says the river told ${c.name} where to dig. A well goes in there${c.timber ? ', timber-lined,' : ''} and, oddly, finds water` : `${c.name} digs a well where the dock grows thickest, which is the old way of finding water${c.timber ? '. Timber lines it, for want of stone' : ''}`,
    c => season() === 3 ? `${c.name} digs a well through the frozen crust${c.timber ? ' and lines it with timber for want of stone' : ''}. Iron for the first foot, mud after` : `${c.name} digs another well${c.timber ? ', timber-lined for want of stone,' : ''} and puts a roof over it to keep the leaves out`,
  ],
  wellDry: [
    c => `${c.name}'s well runs dry. The bucket comes up with mud in it`,
    c => `A well at ${c.name} gives out ${daypart()}. ${twFolk(c.town)} lowers the bucket twice more anyway`,
    c => world.weather.kind === 'drought' ? `${c.name} loses a well to the drought. ${twLossMood(c.town)}` : `${c.name}'s oldest well goes dry. Rain will fill it again, slowly`,
    c => `The water in ${c.name}'s well sinks below the rope. They tie on another length, and then there is no more water to reach`,
    c => `${c.name} puts a lid on a dry well and a stone on the lid`,
    c => `${c.name} has a well fewer. The carriers take the yokes down from the wall and go back to the river`,
  ],
  cisternFirst: [
    c => `${c.name} builds a cistern against the dry months`,
    c => `${c.name} lines a pit with stone and pitch and calls it a cistern. Every gutter in town is turned to run into it`,
    c => `${twFolk(c.town)} has ${c.name} dig a cistern ${world.weather.kind === 'drought' ? 'with the drought already on them' : 'while it is still raining, which is the right time'}`,
  ],
  cistern: [
    c => `${c.name} builds another cistern. ${c.town.thirsted ? 'Nobody has forgotten the summer the water ran out' : 'Rain off every roof goes into it'}`,
    c => `Another cistern at ${c.name}, under the square. Children shout into it to hear their voices come back`,
    c => world.weather.kind === 'drought' ? `${c.name} sinks a new cistern while the sky stays empty, against the day it fills` : `A new cistern at ${c.name} ${weatherWord()}; ${c.n} of them now`,
    c => `${twElder(c.town)} orders another cistern for ${c.name}, and the masons grumble that you cannot drink stone`,
    c => `${c.name} digs a cistern behind the house of ${twFamily(c.town)}, who are paid for the lost garden in water`,
    c => `${c.name} can hold more water than ever (${c.n} cisterns), and still watches the sky`,
  ],
  // ── Wishes and shortages ──
  wants: [
    c => `${c.name} wants ${twA(c.what)} and has no ${c.lack} to build it`,
    c => `${twFolk(c.town)} of ${c.name} has the plans for ${twA(c.what)} pinned up in the hall. There is no ${c.lack} for it`,
    c => `${c.name}'s ${c.what} is still a line scratched in the dirt behind the hall. No ${c.lack}`,
    c => `No ${c.lack} at ${c.name}, so no ${c.what}. ${twElder(c.town)} says next year`,
    c => `${c.name} has the ground cleared for ${twA(c.what)} and nothing to raise on it: the ${c.lack} has all gone elsewhere`,
    c => `The builders at ${c.name} sit on their tools ${daypart()}, waiting on ${c.lack} for the ${c.what}`,
    c => has(c.town, 'miser') ? `${elderOf(c.town)} will not pay for ${c.lack} from away, so ${c.name} goes without its ${c.what}` : has(c.town, 'merchant') ? `${elderOf(c.town)} is trying to buy ${c.lack} for ${c.name}'s ${c.what} from anyone who will sell` : `${c.name} talks about its ${c.what} the way other towns talk about the weather. No ${c.lack}, and so no ${c.what}`,
  ],
  wantsSaving: [
    c => `${c.name} wants ${twA(c.what)} but is saving for the next step`,
    c => `${twElder(c.town)} tells ${c.name} the ${c.what} can wait; everything is going on the next step`,
    c => `${c.name} puts off its ${c.what}. The coin and the timber are spoken for`,
  ],
  // ── Houses ──
  rebuildStart: [
    c => `${c.name} starts to rebuild. ${c.ruins} burned plots to clear, ${c.homes} homes still standing`,
    c => `The ash is barely cold at ${c.name} when ${twFolk(c.town)} is out with a barrow. ${c.homes} homes standing, ${c.ruins} to raise again`,
    c => `${c.name} begins again ${daypart()}: ${c.ruins} plots of black ground, and ${c.homes} homes to sleep in meanwhile`,
    c => world.weather.kind === 'rain' ? `${c.name} rebuilds in the rain, which at least keeps the ash down. ${c.homes} homes standing, ${c.ruins} to go` : `The first new frame goes up over the ash at ${c.name}. ${c.homes} homes standing, ${c.ruins} to go`,
    c => `${c.name} counts what it has (${c.homes} homes) and starts on what it lost (${c.ruins}). ${twLossMood(c.town)}`,
    c => `${twCap(twFamily(c.town))} of ${c.name} are first to rebuild, on the same stones. ${c.ruins} more plots wait; ${c.homes} homes stand`,
  ],
  rebuildDone: [
    c => `${c.name} has rebuilt. ${c.homes} homes, and the last burned plot has a roof on it ${daypart()}`,
    c => `You would hardly know ${c.name} had burned, except for the smell when it rains. ${c.homes} homes`,
    c => `It took ${c.ago} for ${c.name} to build back what the fire took. ${c.homes} homes`,
    c => `${twFolk(c.town)} moves back into a new house on the old stones. ${c.name} is whole again: ${c.homes} homes`,
    c => `${c.name} is done rebuilding. The new houses are paler than the old and stand out like new teeth. ${c.homes} homes`,
    c => `No more ash in the streets of ${c.name}. ${c.homes} homes, and ${elderOf(c.town)} calls a supper`,
  ],
  noTimber: [
    c => `${c.name} wants to rebuild but has no timber`,
    c => `The ash at ${c.name} has gone cold and there is nothing to build with. ${twCap(twFamily(c.town))} are still sleeping in the hall`,
    c => `${twFolk(c.town)} of ${c.name} walks the burn looking for one beam worth saving and finds none`,
    c => `${c.name}'s loggers cannot keep up. The burned plots wait, and the families on them put up canvas`,
    c => season() === 3 ? `${c.name} spends the winter in the hall and the barns; there is no timber for the burned houses` : `${c.name} sweeps its burned foundations clean and has no timber to raise on them`,
    c => `No timber at ${c.name}. ${twElder(c.town)} sends to the woods for anything standing, and the near woods are thin`,
    c => has(c.town, 'tyrant') ? `${elderOf(c.town)} has the timber for the hall roof first. ${c.name}'s burned-out families wait` : `${c.name} has more people than roofs and no timber to close the gap. ${twLossMood(c.town)}`,
  ],
  scavenged: [
    c => `${c.name} rebuilds with timber scavenged from the ruins`,
    c => `${c.name} pulls charred beams out of the rubble, scrapes them, and puts them back up. The house smells of smoke for years`,
    c => `${twFolk(c.town)} of ${c.name} builds one house out of three burned ones. It leans, and it stands`,
    c => `Nothing new to build with at ${c.name}, so the old comes back: doors from one house, rafters from another`,
    c => `${c.name} raises a house from what the fire left. ${twCap(twFamily(c.town))} know their own lintel in it and say nothing`,
  ],
  tenement: [
    c => `${c.name} raises a tenement block`,
    c => `A house near ${c.name}'s square comes down and a tenement goes up in its place, three families high`,
    c => `${c.name} builds upward: a stone tenement where ${twFamily(c.town)} had a garden`,
    c => `${twFolk(c.town)} of ${c.name} moves into the top floor of the new tenement and complains about the stairs to anyone who will listen`,
  ],
  newStreet: [
    c => `${c.name} lays a new ${c.what}`,
    c => `${c.name} stakes out a new ${c.what} ${daypart()}, and the first house on it goes to ${twFamily(c.town)}`,
    c => `A new ${c.what} at ${c.name}; it has a name before it has a house, and the name is a joke about ${elderOf(c.town)}`,
    c => `${c.name} pushes a ${c.what} through the old cabbage plots. The owners are paid in promises`,
    c => `${c.name} has outgrown its old lanes. Carts and children try out the new ${c.what} ${weatherWord()}`,
  ],
  // ── Stores and trades ──
  boilerCold: [
    c => `${c.name}'s boiler goes cold. Nothing left to burn.`,
    c => `The lamps go out at ${c.name} ${daypart()}: the boiler has eaten the last of the coal and the woodpile`,
    c => `${c.name}'s stokers rake out the boiler and find nothing to feed it. The workshops stand quiet`,
    c => season() === 3 ? `${c.name}'s boiler dies in the cold, and families sit in the dark with their coats on` : `The boiler at ${c.name} goes cold. ${twFolk(c.town)} sits on what was the coal heap, which is only dust now`,
  ],
  smokeCold: [
    c => `The smokehouse at ${c.name} stands cold for want of firewood, and the catch is going off`,
    c => `No firewood for the smokehouse at ${c.name}, and the flies have found the catch`,
    c => `${twFolk(c.town, ['smoker'])} stands at ${c.name}'s cold smokehouse with a deer on the hook and nothing to light under it`,
    c => `${c.name} buries a cartload of spoiled fish behind the smokehouse. Nobody cut the wood`,
  ],
  bakersOut: [
    c => `${c.name}'s bakers are out of grain`,
    c => `The ovens at ${c.name} are cold ${daypart()}: no grain to grind`,
    c => `${twFolk(c.town, ['baker'])} sweeps the last flour off the board at ${c.name} and closes the bakery shutters`,
    c => `The bakery at ${c.name} has nothing to bake this week. ${twLossMood(c.town)}`,
  ],
  mint: [
    c => `${c.name} mints its first coin from its own gold`,
    c => `${c.name} mints its first coin. ${twElder(c.town)}'s face is on it, ${has(c.town, 'tyrant') ? 'scowling' : 'not very like'}`,
    c => `${twFolk(c.town, ['smith'])} strikes the die, and ${c.name} mints its first coin from its own gold. Every child is given one to hold, and then to give back`,
  ],
  pastureFirst: [
    c => `${c.name} fences a pasture`,
    c => `${c.name} fences a pasture on the wet ground by the stream, where nothing else will grow`,
    c => `${twFolk(c.town)} of ${c.name} fences a pasture with split rails and a gate that has to be lifted to close`,
  ],
  pasture: [
    c => `${c.name} fences a new pasture where the old one burned`,
    c => `${c.name} puts up fresh rails round a pasture. The animals are herded in from the lanes, complaining`,
    c => `A new pasture fence at ${c.name}; ${twFamily(c.town)} lend their dog for the herding and do not get it back`,
  ],
  mine: [
    c => `${c.name} digs ${c.a} mine`,
    c => `${c.name} digs ${c.a} mine ${c.far ? 'a long walk out in the hills' : 'within sight of the hall'}. ${twFolk(c.town)} brings up the first basket`,
    c => `${twFolk(c.town)} has found ${c.ore} in the rock, and ${c.name} digs ${c.a} mine before the week is out`,
    c => `${c.name} digs ${c.a} mine. ${c.ore === 'coal' ? 'Black hands at supper from now on' : c.ore === 'copper' ? 'The spoil heap is streaked green by the first rain' : c.ore === 'uranium' ? 'Nobody quite knows what it is for, and the dogs will not go near it' : 'The spoil heap is rust-red by the first rain'}`,
  ],
  // ── Roads ──
  roadStart: [
    c => `${c.name} and ${c.other} agree to build a road between them${c.water ? ', with a bridge over the river' : ''}. A crew sets out from ${c.name}`,
    c => `A crew sets out from ${c.name} with stakes and a cart of stone: ${c.name} and ${c.other} mean to build a road between them${c.water ? ', bridge and all' : ''}`,
    c => `${c.name} and ${c.other} shake on it and build a road between them, starting from ${c.name}${c.water ? '. There will be a bridge where it meets the river' : ''}`,
  ],
  roadDone: [
    c => `The road between ${c.name} and ${c.other} is finished${c.water ? '; wagons can cross the bridge' : ''}`,
    c => `The two crews meet in the middle ${daypart()}, and the road between ${c.name} and ${c.other} is done${c.water ? '. The bridge holds a loaded cart; wagons can cross' : ''}`,
    c => `${c.name} and ${c.other} are joined by a road${c.water ? ' and a bridge that wagons can cross' : ''}. ${twFolk(c.town)} walks the whole length of it the first day, to see`,
  ],
  workRoad: [
    c => `${c.name} sends a crew to lay a road out to its ${c.what}`,
    c => `${c.name}'s ${c.what} is a long walk out; a road crew goes after it with stakes and a cart of stone`,
    c => `${twFolk(c.town)} leads a crew out of ${c.name} to lay a road to the ${c.what}, so the carts can come back loaded`,
    c => `${c.name} starts a road out to its ${c.what} ${weatherWord()}`,
  ],
  workRoadDone: [
    c => `${c.name} finishes the road to its ${c.what}`,
    c => `The road out to ${c.name}'s ${c.what} is done, and the first cart comes back on it ${daypart()} with a squeal in its axle`,
    c => `${c.name}'s ${c.what} road is finished. The path the haulers wore beside it grows over by the next season`,
    c => `A road all the way to the ${c.what} now. The haulers of ${c.name} have nothing left to complain about but the hills`,
  ],
  roadHalts: [
    c => c.work ? `${c.name}'s road work halts for want of ${c.lack}` : `Road work between ${c.name} and ${c.other} halts for want of ${c.lack}`,
    c => `${c.work ? `${c.name}'s road crew` : `The crew on the road between ${c.name} and ${c.other}`} sits down by the unfinished end and waits for ${c.lack}`,
    c => `${c.name} has no ${c.lack} to give the road${c.work ? ` to its ${c.what}` : ` to ${c.other}`}. The crew mends its boots`,
    c => `The ${c.work ? `${c.what} road` : `road to ${c.other}`} stops at a stake in the ground a day out of ${c.name}. No ${c.lack}`,
    c => `${twFolk(c.town)} of ${c.name} comes in from the road crew with nothing to do: the ${c.lack} has run out${c.work ? '' : ` halfway to ${c.other}`}`,
    c => world.weather.kind === 'rain' || world.weather.kind === 'storm' ? `The road ${c.work ? `to ${c.name}'s ${c.what}` : `between ${c.name} and ${c.other}`} stands half made in the rain, waiting on ${c.lack}` : `Grass is coming up through the unfinished end of ${c.name}'s ${c.work ? `${c.what} road` : `road to ${c.other}`}. No ${c.lack}`,
    c => `${c.name} stops paying the road crew. There is no ${c.lack} left for the ${c.work ? `${c.what} road` : `road to ${c.other}`}, and no point`,
  ],
  // ── Leaving for a happier town ──
  emigrate: [
    c => `${c.k} leave ${c.name} for ${c.other}, where the inn is open and nobody is hungry`,
    c => `A handful of families walk out of ${c.name} ${daypart()}, ${c.k} people in all. They are bound for ${c.other}, which is said to be a better place`,
    c => `${c.name} loses ${c.k} people to ${c.other}. There is nothing to keep them.`,
    c => `Empty houses at ${c.name}: ${c.k} have gone to ${c.other} this season, and some left the doors open behind them`,
    c => `${twFolk(c.town)} of ${c.name} watches a neighbour load a cart for ${c.other}. ${c.k} gone, and the street is quieter for it`,
    c => has(c.town, 'tyrant') ? `${c.k} slip away from ${c.name} to ${c.other} by night, before ${elderOf(c.town)} can forbid it` : `${c.other} is the talk of ${c.name}: better bread, a warmer inn. ${c.k} have gone to see if it is true`,
  ],
  // ── Wagons and markets ──
  wagonFirst: [
    c => `The first wagons come down the new road from ${c.from} to ${c.name}${c.goods ? `, with ${c.goods}` : ''}. Half the town goes out to meet them`,
    c => `${c.name} sees its first wagons from ${c.from}${c.goods ? `: ${c.goods}` : ''}. ${twElder(c.town)} says the road has paid for itself`,
    c => `Wagons from ${c.from} reach ${c.name} for the first time${c.goods ? `, bringing ${c.goods}` : ''}. The children run beside the wheels all the way to the square`,
    c => `The road between ${c.from} and ${c.name} carries its first load${c.goods ? `, ${c.goods}` : ''}. Wagons, at last, instead of backs`,
  ],
  wagonGoods: [
    c => `Wagons from ${c.from} bring ${c.amt} ${c.res} to ${c.name}${c.paid ? ` for ${c.paid} coin` : ', on credit'}`,
    c => `${c.amt} ${c.res} off the ${c.from} wagons at ${c.name}'s market${c.paid ? `, ${c.paid} coin across the table` : ', and the carter takes a promise instead of coin'}`,
    c => `The ${c.from} wagons are in at ${c.name} ${daypart()}. ${twFolk(c.town, ['trader'])} takes the ${c.amt} ${c.res}${c.paid ? ` for ${c.paid} coin, and complains about the price` : ' on credit, and promises to pay at harvest'}`,
    c => `Talk at ${c.name}'s market is all of the ${c.amt} ${c.res} that came on the wagons from ${c.from}${c.paid ? `, and the ${c.paid} coin it cost` : ', and who is going to pay for it'}`,
    c => `Wagons from ${c.from} come into ${c.name} ${weatherWord()} with ${c.amt} ${c.res} under oilcloth${c.paid ? `, ${c.paid} coin the load` : ', on credit'}`,
    c => c.long ? `After ${c.cells} cells of road, the wagons from ${c.from} unload ${c.amt} ${c.res} at ${c.name}${c.paid ? ` for ${c.paid} coin` : ', on credit'}` : `${c.from} sends ${c.amt} ${c.res} down the road to ${c.name} by wagons${c.paid ? `, for ${c.paid} coin` : ', on credit'}. ${twElder(c.town)} counts the bushels twice`,
    c => `${c.name} is short of ${c.res}, and ${c.from} is not: ${c.amt} come on the wagons${c.paid ? ` for ${c.paid} coin` : ', on credit'}`,
    c => has(c.town, 'merchant') ? `${elderOf(c.town)} meets the wagons from ${c.from} at ${c.name}'s gate and has the ${c.amt} ${c.res} sold on before they are unloaded${c.paid ? `; they cost ${c.paid} coin` : ''}` : `The wagons from ${c.from} leave ${c.amt} ${c.res} at ${c.name}${c.paid ? ` for ${c.paid} coin` : ', on credit'}, and take home the gossip`,
  ],
  wagonArrives: [
    c => `The wagons from ${c.from} roll into ${c.name}'s market with nothing anybody needs. They stay the night anyway`,
    c => `Wagons from ${c.from} at ${c.name} ${daypart()}: news, letters, a crate of hens nobody ordered`,
    c => `${c.name} hears the wagons from ${c.from} before it sees them; an axle has been squealing since the ford`,
    c => c.long ? `A long haul for the wagons from ${c.from}: ${c.cells} cells of road to ${c.name}, and not much to show for it at the end` : `The wagons from ${c.from} unload at ${c.name}'s market and load up again with whatever ${c.name} has too much of`,
    c => `${twFolk(c.town)} of ${c.name} meets the wagons from ${c.from} every time, for a letter that has not come yet`,
    c => `Market talk at ${c.name}: the wagons from ${c.from} say the road is ${world.weather.kind === 'rain' || world.weather.kind === 'storm' ? 'axle-deep in mud' : world.weather.kind === 'snow' ? 'hard going in the drifts' : world.weather.kind === 'drought' ? 'dust to the knees' : 'good as far as the ford, and bad after'}`,
  ],
});

// More ways to say what 11b already says.
PHRASES.addsHomes.push(
  c => `${twCap(twFamily(c.town))} move out of the hall at ${c.name} into a house with a door that shuts. ${c.homes} homes`,
  c => `${c.name} is ${c.homes} homes, and ${twFolk(c.town)} can no longer name everyone in every one of them`,
  c => `Fresh thatch on new roofs at ${c.name} ${weatherWord()}: ${c.homes} homes`,
  c => `${c.name} builds for the children who will need houses next: ${c.homes} homes now`,
);
PHRASES.grows.push(
  c => `${c.name} spills past its old edge ${daypart()}; ${c.homes} homes, and the last field before the woods is a street now`,
  c => `The edge of ${c.name} moves out again. ${c.homes} homes, and the newest families are a long walk from the well`,
  c => `${c.name} grows by a lane. ${c.homes} homes, and ${elderOf(c.town)} needs a map to visit them all`,
);
PHRASES.market.push(
  c => `${twFolk(c.town, ['trader'])} of ${c.name} haggles with the caravan master ${daypart()} until both are hoarse. In the end ${c.name} ${c.deal}, and has ${c.coin} coin in the chest`,
  c => `The caravan sets out its awnings in ${c.name}'s square. ${c.name} ${c.deal}, and the chest holds ${c.coin} coin when it is done`,
  c => has(c.town, 'tyrant') ? `${elderOf(c.town)} takes a tenth of every sale at ${c.name}'s market and calls it a toll. ${twCap(c.deal)}. ${c.coin} coin in the chest` : `Market at ${c.name}: ${c.deal}. ${twElder(c.town)} counts the ${c.coin} coin in the chest twice`,
  c => world.weather.kind === 'rain' || world.weather.kind === 'storm' ? `A wet market at ${c.name}: ${c.deal}. ${c.coin} coin, and everyone's boots ruined` : `The caravan's dogs fight ${c.name}'s dogs while the people trade: ${c.deal}. ${c.coin} coin in the chest`,
  c => `${c.name} ${c.deal} at the caravan's tailboard ${weatherWord()}. ${c.coin} coin left, and a song nobody in town knew yesterday`,
);
PHRASES.marketNothing.push(
  c => `The caravan unpacks at ${c.name}, looks at what is on offer, and packs again`,
  c => `${c.name} has nothing the caravan wants and no coin for what it has. The traders water their mules and go`,
  c => `A long day in the square at ${c.name} and not a coin changes hands. The caravan is gone by dusk`,
);
PHRASES.caravan.push(
  c => `Mules and a caravan coming down off the ${c.edge}ern hills ${weatherWord()}, bound for ${c.name}`,
  c => `${c.name} gets word ${daypart()}: a caravan on the ${c.edge} road, a day out`,
  c => `Bells on the ${c.edge} road. A caravan, and it is ${c.name} it wants`,
);

// ── Sprawl: the slums burn and the far edge catches. Said once in a half-year per town; the fires happen regardless. ──
Object.assign(PHRASES, {
  slumTorch: [
    c => `Riots in ${c.name}. Someone put a torch to the slums.`,
    c => `The slums at ${c.name} are burning ${daypart()}, and nobody in the crowd will say who struck the match. ${twMood(c.town)}`,
    c => `A riot in the tenement streets of ${c.name} ${weatherWord()}; a lamp goes through a window and the back row catches`,
    c => `${c.name}'s poorest street is alight and the crowd that lit it is still in it, shouting at ${twElder(c.town)}`,
    c => `Smoke from the slums of ${c.name}. ${twFolk(c.town)} says it was the rent; ${twElder(c.town)} says it was the drink. It was both`,
    c => `The tenements at ${c.name} burn again. The same families, the same street, and the constable does not hurry`,
  ],
  sprawlFire: [
    c => `A kitchen fire on the far edge of sprawling ${c.name} goes unnoticed`,
    c => `${c.name} has grown past the reach of its own bell. A hearth on the far edge catches ${daypart()} and nobody is near enough to smell it`,
    c => `Out where ${c.name} thins into sheds and gardens, a stove is left burning. The town will hear of it when the wind brings the smoke`,
    c => `A pot boils over in the last house on the ${seasonWord()} road out of ${c.name}, and the thatch takes it. No one is watching that end of town`,
    c => `${c.name} sprawls, and the far edge pays for it: a fire starts there ${weatherWord()} with the nearest crew a long run away`,
    c => `A chimney spark in the new streets at the edge of ${c.name}. ${twFolk(c.town)} sees it from the fields and starts running`,
  ],
});
