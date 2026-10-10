/* ───────────────────────── Phrases: diplomacy, war, factions, battles ─────────────────────────
   The bags the towns speak in when they deal with each other: envy, friendship, quarrels, councils,
   columns on the road, sacks, crowns and coups. Same mechanism as 11b (say() and its anti-repeat);
   this file only adds words, plus a few small helpers for lines about two towns at once.
   Matchers in 32 read some of these lines: keep "envoy sets out", "wedding party sets out",
   "calls a council", "posse", "marches|raiding party|column", "sacks", "is razed", "annexes",
   "raises a stone wall", and the war reason ("over the iron seams") passed through verbatim. */

function cap1(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function andList(arr) { return arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]; }
// The same draw as say(), but hands the text back instead of logging it (for lines logged later, on arrival).
function phraseOf(town, key, c) {
  const bag = PHRASES[key]; if (!bag) return '';
  const used = phraseUsed[key] || (phraseUsed[key] = []);
  let idx = Math.floor(Math.random() * bag.length), tries = 0;
  while (used.includes(idx) && tries++ < 6) idx = Math.floor(Math.random() * bag.length);
  used.push(idx); if (used.length > Math.min(2, bag.length - 1)) used.shift();
  c = c || {}; c.town = town; c.name = town ? town.name : '';
  return bag[idx](c);
}
// Who speaks for a town: the ruler of its realm if it has one, else its elder.
function headOf(town) {
  const f = town && factionOf(town);
  if (f && f.towns.length > 1) { const r = rulerOf(f); if (r) return `${rulerTitle(f)} ${r.name}`; }
  return elderOf(town);
}
function wxIs(k) { return world.weather && world.weather.kind === k; }
function cold() { return season() === 3 || wxIs('snow'); }
// News about a pair of towns lives on the one with the lower id, keyed by the other.
function pairNote(a, b) { const [lo, hi] = a.id < b.id ? [a, b] : [b, a]; const m = lo.pairNews || (lo.pairNews = {}); return m[hi.id] || (m[hi.id] = {}); }
const BREAK_WHY = { 'the succession': 'It will not kneel to a stranger', 'the people have had enough': 'The people have had enough' };

Object.assign(PHRASES, {
  // ── Envy: said when it begins, when it finds something new to want, and now and then while it lasts ──
  covetBegins: [
    c => `${c.name} has begun to look at its neighbours' ${c.res}. The smiths talk of little else`,
    c => `There is no ${c.res} in ${c.name}'s hills, and ${c.name} has started to notice who has some`,
    c => `${headOf(c.town)} spends ${daypart()} on the ridge above ${c.name}, watching the smoke from other people's ${c.res} pits`,
    c => `In ${c.name} they have started saying "our ${c.res}" about seams that belong to somebody else`,
    c => `${c.name} sends a boy to count the carts of ${c.res} on the neighbours' roads. He comes back with a number nobody likes`,
    c => cold() ? `A cold ${seasonWord()} in ${c.name}, and the ${c.res} it does not have is all anyone talks about at the fire` : `${c.name}'s militia drills on the side of town that faces the neighbours' ${c.res} workings`,
    c => has(c.town, 'tyrant') ? `${headOf(c.town)} has a map drawn of every ${c.res} seam in the valley. None of them is ${c.name}'s, and the map hangs in the hall` : `A pedlar sells ${c.name} a lump of ${c.res} for twice what it is worth, and the whole town comes to look at it`,
  ],
  covetShifts: [
    c => `${c.name} wanted its neighbours' ${c.was}. Now it wants their ${c.res} as well`,
    c => `It is ${c.res} now. ${c.name}'s envy has found a second thing to want`,
    c => `${c.name}'s traders come home talking about ${c.res}, and the old talk of ${c.was} does not stop`,
    c => `The smiths of ${c.name} have learned what ${c.res} is for, and that it is dug next door`,
    c => `${headOf(c.town)} adds ${c.res} to the list of things ${c.name} says the valley owes it`,
    c => `${c.name} looks past the ${c.was} seams to the ${c.res} beyond them`,
  ],
  covetStill: [
    c => `${c.name} covets every seam of ${c.list} its neighbours dig`,
    c => `Still the talk in ${c.name} is of ${c.list}, and who has it, and who should`,
    c => `${c.name} has not stopped wanting its neighbours' ${c.list}. The want has gone hard, like a callus`,
    c => `A year on and ${c.name} still counts other people's ${c.list}. ${cap1(moodWord(c.town))}`,
    c => `Children in ${c.name} play a game where one side has the ${c.list} and the other side takes it`,
    c => `Nobody in ${c.name} says the word war. They say ${c.list}, and look over the hill`,
  ],

  // ── Friends: what allies do together, at most once a pair every two years ──
  allies: [
    c => cold() ? `Hunters from ${c.name} and ${c.other} go out on the snow together and split a stag at the boundary stone` : `${c.name} sends reapers to ${c.other} for a week, and gets them back fed and sunburnt`,
    c => `${c.name} and ${c.other} keep a shared beacon on the ridge between them: one town cuts the wood, the other lights it`,
    c => `A feast at ${c.other} for the people of ${c.name}. Somebody's uncle sings, and nobody stops him`,
    c => `${c.name} and ${c.other} water their herds at the same pool ${daypart()} and nobody counts whose is whose`,
    c => `${headOf(c.town)} of ${c.name} and ${headOf(c.o)} of ${c.other} walk the boundary together, as their grandparents did, and find the stones where they were left`,
    c => wxIs('drought') ? `In the dry, ${c.other} opens its deep well to ${c.name}. Nobody writes it down; nobody needs to` : `${c.name} lends ${c.other} its best ox for the ploughing and gets it back fatter`,
    c => `A game of stick-ball between ${c.name} and ${c.other} on the common. ${c.other} wins, and ${c.name} buys the beer, as agreed`,
    c => `${c.name}'s children go to ${c.other} for the ${seasonWord()} to learn their letters. It is an old arrangement and both towns are proud of it`,
    c => wxIs('rain') || wxIs('storm') ? `When ${c.other}'s mill-race floods ${weatherWord()}, there are spades from ${c.name} on the bank before noon` : `${c.name} and ${c.other} raise a barn together on the road between them, and argue amiably about who owns it`,
    c => `A ${c.name} girl and a ${c.other} boy are caught kissing behind the tithe barn. Neither town minds; both towns talk`,
  ],

  // ── Good news carried by envoys (logged when the envoy arrives) ──
  dgTrade: [
    c => `${c.name} and ${c.other} sign a trade pact: salt one way, timber the other`,
    c => `${c.other} and ${c.name} spit and shake. They will trade without tolls until somebody forgets`,
    c => `A trade pact between ${c.name} and ${c.other}, written on a calfskin that both towns claim to be keeping`,
    c => cold() ? `Over a winter fire at ${c.other}, the envoy from ${c.name} agrees a trade pact: wool for nails` : `In the shade of ${c.other}'s market cross, ${c.name}'s envoy agrees a trade pact and then a second one about the first`,
    c => govOf(c.town) === 'merchant' ? `The counting-house of ${c.name} sends ${c.other} a pact of eleven clauses. ${c.other} signs the first page and uses the rest to light the stove` : `${c.name} and ${c.other} agree weights and measures at last. The ${c.other} bushel was always smaller, says ${c.name}, and now it is not`,
    c => `${c.other}'s potters and ${c.name}'s smiths will sell in each other's markets from now on. The potters of ${c.name} are not consulted`,
  ],
  dgHarvest: [
    c => `${c.name} sends ${c.other} its spare grain, and ${c.other} sends back cheese`,
    c => `${c.name} and ${c.other} trade what they have too much of: apples for barley, and an argument about which is worth more`,
    c => `Carts go between ${c.name} and ${c.other} all ${seasonWord()}, each carrying what the other is short of`,
    c => `${c.other} had too many turnips and ${c.name} too many eggs. Both towns eat better this week`,
    c => wxIs('drought') ? `${c.name} shares what the drought left it with ${c.other}. It is not much, which is why it counts` : `${c.name}'s envoy reaches ${c.other} with a sack of seed beans and a list of what is wanted in return`,
    c => `A barge of onions leaves ${c.name} for ${c.other}. The bargeman swears he will never carry onions again`,
  ],
  dgWatch: [
    c => `${c.name} and ${c.other} share a fire watch: one lookout on the ridge, paid by both`,
    c => `${c.name} and ${c.other} build a beacon on the hill between them. Whoever sees smoke first lights it`,
    c => season() === 1 || wxIs('drought') ? `With the woods this dry, ${c.name} and ${c.other} put a shared watchman on the high rock and send him up with a week of bread` : `A bell is hung at the halfway post between ${c.name} and ${c.other}. Ring it and both towns come`,
    c => `${c.other} lends ${c.name} its best pair of eyes, a girl who can see smoke at ten miles, for the dry months`,
    c => `${c.name} and ${c.other} swap fire wardens for a season, so each learns the other's woods`,
    c => `The watchers of ${c.name} and ${c.other} agree a signal: two smokes for fire, three for come now, one for the cook's chimney`,
  ],
  dgBorder: [
    c => `${c.name} and ${c.other} settle the old quarrel about the boundary oak. It belongs to both, and the acorns to whoever gets there first`,
    c => `A border stone goes back where it was, between ${c.name} and ${c.other}, and the grudge over it is buried with a jug`,
    c => `Forty years of argument about a ditch between ${c.name} and ${c.other} end in an afternoon, because nobody alive remembers how it started`,
    c => `${c.name} and ${c.other} walk the border ${daypart()} with the oldest people of both towns, and agree with whatever they say`,
    c => `The stream between ${c.name} and ${c.other} is agreed as the border. It moved last spring, so the agreement is already wrong`,
    c => `${headOf(c.town)} of ${c.name} gives ${c.other} the disputed meadow, and gets a promise of half the hay`,
  ],

  // ── Bad blood: quarrels at the crossing and the market are logged at once; the rest by the envoy who carries them ──
  dbGrazing: [
    c => `${c.name} and ${c.other} quarrel over grazing land: whose sheep, whose grass`,
    c => `${c.other}'s cattle are found on ${c.name}'s common again. Words are exchanged, then a fence post`,
    c => `A herdsman from ${c.name} is chased off the high meadow by men from ${c.other}, who say it was always theirs`,
    c => cold() ? `Even under snow, ${c.name} and ${c.other} argue about the grazing, which tells you it is not about the grass` : wxIs('drought') ? `In the drought the last green grass between ${c.name} and ${c.other} is worth a fight, and nearly gets one` : `${c.name} and ${c.other} both claim the water meadow, and both send their geese onto it to prove it`,
    c => `${c.name} impounds three goats belonging to ${c.other}. ${c.other} wants them back. ${c.name} has eaten one`,
    c => `${c.other} digs a ditch across the old drove road, and ${c.name}'s shepherds have to go round by the marsh`,
  ],
  dbInsults: [
    c => `${c.name} and ${c.other} trade insults at the river crossing`,
    c => `Ferrymen from ${c.name} and ${c.other} shout across the water ${daypart()}. By evening both towns know what was said about whose mother`,
    c => `At the ford, a carter from ${c.name} calls ${c.other}'s toll-keeper a name. It is repeated in both taverns for a week`,
    c => wxIs('rain') || wxIs('storm') ? `The river is up ${weatherWord()} and so are tempers at the crossing between ${c.name} and ${c.other}. Somebody's hat goes in the water` : `${c.other} makes up a song about ${c.name}. It is not a kind song, and it rhymes`,
    c => `Somebody from ${c.name} carves a word about ${c.other} into the crossing post. ${c.other} reads it and does not laugh`,
    c => `The bridge-keeper from ${c.other} makes ${c.name}'s carts wait ${daypart()} for no reason he will give`,
  ],
  dbPoaching: [
    c => `${c.name} and ${c.other} accuse each other of poaching`,
    c => `Snares in ${c.name}'s wood, tied with ${c.other} knots. ${c.other} says anybody can tie a knot`,
    c => `A man from ${c.other} is caught in ${c.name}'s woods with a hare in each pocket. He says they followed him`,
    c => cold() ? `A hard winter, and the deer between ${c.name} and ${c.other} grow fewer every week. Each town blames the other's bows` : `${c.name} finds a deer gutted on its side of the stream, and only one town upstream: ${c.other}`,
    c => `${c.other}'s gamekeeper names three families in ${c.name} as poachers. Two of them are guilty`,
    c => `${c.name}'s fish traps come up empty and cut. The knife marks lead back toward ${c.other}`,
  ],
  dbBlows: [
    c => `${c.name} and ${c.other} come to blows at a market day`,
    c => `Market day at ${c.other} ends with a cooper from ${c.name} in the horse trough and the stalls kicked over`,
    c => `Somebody from ${c.name} says ${c.other}'s scales are crooked. They are, a little. The fight costs a tooth`,
    c => `A pig is sold twice at market ${weatherWord()}, once to ${c.name} and once to ${c.other}, and settled with fists`,
    c => `The stallholders from ${c.other} pack up early when the lads from ${c.name} come down the road. Not early enough`,
    c => `Blood on the cobbles at market. ${c.name} and ${c.other} each send a man home with a broken nose and a story`,
  ],
  dbRefuse: [
    c => `${c.name} and ${c.other} each turn back the other's homeless at the boundary`,
    c => `A family burned out of ${c.other} comes to ${c.name}'s gate and is sent away. ${c.other} has started keeping a list`,
    c => `${c.name} shuts its gate to anyone from ${c.other}, and ${c.other} does the same, out of spite more than need`,
    c => cold() ? `Turned away in the snow: ${c.other}'s homeless at ${c.name}'s gate, and ${c.name}'s at ${c.other}'s` : `${c.name} sends ${c.other}'s widows back up the road with a loaf each and a shut door`,
    c => `${headOf(c.town)} of ${c.name} says there is no room for strangers from ${c.other}. There is room; there is no welcome`,
    c => `${c.other} will not take in the burned-out families of ${c.name}. ${c.name} will not forget the name of the man at the gate`,
  ],

  // ── Who sets out ──
  envoyGood: [
    c => `An envoy sets out from ${c.name} for ${c.other}`,
    c => `${c.name}'s envoy sets out for ${c.other} ${daypart()} with a letter and a cheese`,
    c => `In ${c.name}, an envoy sets out for ${c.other} in a borrowed coat`,
    c => `An envoy sets out from ${c.name} for ${c.other} ${weatherWord()}, practising the speech on the mule`,
    c => `${headOf(c.town)} sees ${c.name}'s man to the edge of town. The envoy sets out for ${c.other} alone`,
    c => `The envoy sets out from ${c.name} for ${c.other} with a gift wrapped three times, in case the first two are opened on the road`,
  ],
  envoyBad: [
    c => `An envoy sets out from ${c.name} for ${c.other}, and nobody expects good news`,
    c => `${c.name}'s envoy sets out for ${c.other} with a short letter and a long face`,
    c => `An envoy sets out from ${c.name} for ${c.other}. The town sees them off in silence`,
    c => has(c.town, 'tyrant') ? `${headOf(c.town)} gives the envoy one sentence to say. The envoy sets out from ${c.name} for ${c.other} hoping to forget it` : `${c.name}'s envoy sets out for ${c.other} ${daypart()}, carrying a complaint and no gift`,
    c => `The envoy sets out from ${c.name} for ${c.other} with an escort of two, which is an insult in itself`,
    c => `${c.name}'s envoy sets out for ${c.other} ${weatherWord()}. The innkeeper at the halfway house has already heard why`,
  ],
  weddingOut: [
    c => `A wedding party sets out from ${c.name} for ${c.other}`,
    c => `Ribbons on the mules: a wedding party sets out from ${c.name} for ${c.other} ${daypart()}`,
    c => `${c.name} sends a daughter down the road. The wedding party sets out for ${c.other} with half the town walking it to the first bend`,
    c => cold() ? `A wedding party sets out from ${c.name} for ${c.other} through the cold, the bride in three cloaks` : `A wedding party sets out from ${c.name} for ${c.other}, the groom's mother already counting the spoons`,
    c => wxIs('rain') || wxIs('storm') ? `A wedding party sets out from ${c.name} for ${c.other} ${weatherWord()}. Rain on a wedding is lucky, they say in ${c.name}, and they say it loudly` : `The fiddler is sober, for now. A wedding party sets out from ${c.name} for ${c.other}`,
    c => `A wedding party sets out from ${c.name} for ${c.other} with a cart of linen and a goat that was not invited`,
  ],

  // ── The council of the valley ──
  councilCalled: [
    c => `${c.name} calls a council of the valley. Envoys set out from ${c.members}.`,
    c => `${headOf(c.town)} of ${c.name} calls a council, and the roads fill with envoys from ${c.members}`,
    c => `${c.name} calls a council this ${seasonWord()}, airs the hall and borrows chairs. ${c.members} send their people`,
    c => `The long table at ${c.name} is scrubbed white: it calls a council of the valley, and ${c.members} answer`,
  ],
  councilPeace: [
    c => `The council at ${c.name} ends ${c.wars} between ${c.pairs}. Not everyone goes home happy.`,
    c => `Three days of talk at ${c.name}, and on the fourth ${c.wars} between ${c.pairs} are over. The envoys who lost sons do not stay for the feast`,
    c => `The council at ${c.name} makes peace: ${c.wars} between ${c.pairs}, ended at a table instead of a field`,
  ],
  councilRoad: [
    c => `The council at ${c.name} agrees a road between ${c.a} and ${c.b}, and the stone for it`,
    c => `${c.a} and ${c.b} will be joined by a road, says the council at ${c.name}. The quarrymen are told last`,
    c => `A road from ${c.a} to ${c.b}: the council at ${c.name} draws it with a finger in spilt beer, and it is agreed`,
  ],
  councilNoRoad: [
    c => `The council at ${c.name} talks of roads and agrees nothing`,
    c => `At ${c.name} the envoys argue about roads for a week. Not one stone is promised`,
    c => `The council at ${c.name} talks roads until the candles are out, and goes home on the same old tracks`,
  ],
  councilWatch: [
    c => `The council at ${c.name} agrees a shared fire watch: every town will ride to a neighbour's smoke for two years`,
    c => `A promise from the council at ${c.name}: for two years, any town that sees a neighbour's smoke will go to it`,
    c => `The envoys at ${c.name} swear the fire oath on the hall's iron bell. For two years, nobody burns alone`,
  ],
  councilInsult: [
    c => `The council at ${c.name} collapses in insults between ${c.a} and ${c.b}. The envoys go home early.`,
    c => `${c.a}'s envoy says something about ${c.b}'s founders, and the council at ${c.name} is over before the soup`,
    c => `The council at ${c.name} ends with ${c.a} and ${c.b} on their feet and the host sweeping up a jug`,
  ],
  councilFeast: [
    c => `The council at ${c.name} agrees nothing but a feast, and that goes well`,
    c => `Nothing is decided at ${c.name}'s council. The roast pig, however, is remembered for years`,
    c => `The council at ${c.name} talks itself hoarse and then sings itself hoarse. Everyone goes home a little friendlier`,
  ],

  // ── Going to war beside a friend, and a war that will not stay ended ──
  standsWithAlly: [
    c => `${c.name} will not see ${c.other} stand alone`,
    c => `${c.name} takes the spears down from the hall wall for ${c.other}'s sake`,
    c => `An old promise is called in: ${c.name} goes to war beside ${c.other}`,
    c => `${headOf(c.town)} of ${c.name} reads ${c.other}'s letter twice and sends for the militia`,
  ],
  warFlaps: [
    c => `The war between ${c.name} and ${c.other} will not stay ended. Every truce lasts about as long as it takes to sign it`,
    c => `${c.name} and ${c.other} make peace and break it again before the ink is dry. The farmers on the border have stopped unpacking`,
    c => `Peace, war, peace, war: ${c.name} and ${c.other} have done it so often that the heralds take the same road both ways`,
    c => `Nobody in ${c.name} can say any longer whether they are at war with ${c.other}. The answer changes by the week`,
    c => `${c.name}'s people call it the long war with ${c.other}, though it has been ended a dozen times`,
  ],

  // ── Walls ──
  wall: [
    c => `${c.name} raises a stone wall`,
    c => `Every spare back in ${c.name} is at the quarry: ${c.name} raises a stone wall around what it has`,
    c => `${c.name} raises a stone wall, and the first argument is over who gets to be inside it`,
    c => c.again ? `${c.name} has outgrown its old wall and raises a stone wall further out. The old ring becomes a place to sit in the evening` : `${c.name} raises a stone wall ${weatherWord()}. The mortar will want a season to set`,
    c => has(c.town, 'tyrant') ? `${headOf(c.town)} orders it, and ${c.name} raises a stone wall. It faces outward, mostly` : `${c.name} raises a stone wall, with a gate wide enough for two carts and a gatekeeper narrow enough for none`,
    c => `${c.name} raises a stone wall and sets the old hearthstone of the founders over the gate`,
  ],

  // ── Columns and raids ──
  marchWar: [
    c => `${c.name} marches ${c.size} soldiers on ${c.other}${c.kit}`,
    c => `A column of ${c.size} leaves ${c.name} for ${c.other} ${daypart()}${c.kit}`,
    c => `${c.name}'s column, ${c.size} strong, takes the road to ${c.other} ${weatherWord()}`,
    c => `Drums in ${c.name}. ${c.size} soldiers form a column and set off for ${c.other}${c.kit}`,
    c => cold() ? `${c.name} marches ${c.size} through the snow toward ${c.other}, wrapped in everything the town owns` : `${c.name} marches ${c.size} toward ${c.other}; the wives line the road and do not wave`,
    c => `${headOf(c.town)} marches ${c.size} out of ${c.name} to settle things with ${c.other}${c.kit}`,
    c => `The column from ${c.name} is ${c.size} strong and in a hurry. ${c.other} will see its dust by evening`,
    c => `${c.name} empties its barracks: ${c.size} soldiers in a column, bound for ${c.other}`,
  ],
  raid: [
    c => `A raiding party of ${c.size} leaves ${c.name} for ${c.other}`,
    c => `A raiding party of ${c.size} goes out of ${c.name} ${daypart()}, faces blacked, making for ${c.other}`,
    c => `${c.name} sends a raiding party of ${c.size} toward ${c.other}. No declaration, no warning`,
    c => `Torches and empty sacks: a raiding party of ${c.size} from ${c.name}, bound for ${c.other}'s barns`,
    c => `${c.size} ride out of ${c.name}, a raiding party with ${c.other} in its eye and nothing in writing`,
    c => `In ${c.name} they call it a hunting trip. It is a raiding party of ${c.size}, and the quarry is ${c.other}`,
  ],
  posseLost: [
    c => `${c.name}'s posse loses the trail and rides home`,
    c => `The posse from ${c.name} finds a cold campfire and nothing else, and turns for home`,
    c => wxIs('rain') || wxIs('storm') || wxIs('snow') ? `The tracks go under ${wxIs('snow') ? 'fresh snow' : 'the rain'}, and ${c.name}'s posse comes home empty-handed` : `${c.name}'s posse comes home ${daypart()} with sore backsides and no prisoners`,
    c => `${c.name}'s posse follows the trail into the river and does not find where it comes out`,
  ],
  columnFire: [
    c => `${c.name}'s column marches into the fire, ${c.dead} lost`,
    c => `The fire finds ${c.name}'s column on the road. ${c.dead} do not come out of the smoke`,
    c => `${c.name}'s column tries to push through the burning wood and leaves ${c.dead} behind`,
    c => `Smoke across the road, and ${c.name}'s column walks into it. ${c.dead} lost`,
    c => `${c.dead} of ${c.name}'s column are lost to the fire before they ever see the enemy`,
  ],
  raidersBack: [
    c => `${c.name}'s raiders turn back`,
    c => `The way to ${c.other} is blocked, and ${c.name}'s raiders come home with nothing to show`,
    c => `${c.name}'s raiders find no way through and turn for home, grumbling`,
    c => `Burnt country between them and ${c.other}: ${c.name}'s raiders give it up`,
  ],
  deserters: [
    c => `${c.name}'s deserters reach ${c.other}'s lines, ${c.n} spears for the other side`,
    c => `${c.n} who left ${c.name} in the night walk into ${c.other} with their hands up and their weapons still on`,
    c => `${c.other} gains ${c.n} spears from ${c.name}: people who know the way in and the word at the gate`,
    c => `The deserters from ${c.name} reach ${c.other}: ${c.n} of them, hungry, and very willing`,
  ],

  // ── Help from neighbours, all in one line ──
  aid: [
    c => `Help for ${c.name}: ${c.crews}`,
    c => `The neighbours answer ${c.name}'s bell: ${c.crews}`,
    c => `Smoke over ${c.name}, and the road fills with spades: ${c.crews}`,
    c => `${c.name} does not fight this one alone. On the way ${daypart()}: ${c.crews}`,
    c => `${c.name}'s friends come ${weatherWord()}: ${c.crews}`,
    c => `Whatever is said about ${c.name} on market day, the neighbours come when it burns: ${c.crews}`,
    c => `${c.name} hears the shovels before it sees them: ${c.crews}`,
    c => (world.councilWatch || 0) > world.tick ? `The council's fire watch is kept, and ${c.name} sees what it is worth: ${c.crews}` : `Nobody in ${c.name} sent for them, and still they come: ${c.crews}`,
  ],

  // ── Sack, ruin, conquest ──
  sack: [
    c => `${c.name} sacks ${c.other}: ${c.toll}`,
    c => `The gate goes in ${daypart()}, and ${c.name} sacks ${c.other}. ${cap1(c.toll)}`,
    c => `${c.name} sacks ${c.other} ${weatherWord()}. ${cap1(c.toll)}`,
    c => `${c.name} sacks ${c.other}, and the smoke can be seen from every town in the valley. ${cap1(c.toll)}`,
    c => `There is a word for what ${c.name} does to ${c.other}: it sacks the place. ${cap1(c.toll)}`,
    c => `${c.other} falls to ${c.name}, who sacks it street by street. ${cap1(c.toll)}`,
  ],
  razed: [
    c => `${c.other} is razed to the ground by ${c.name}`,
    c => `${c.other} is razed. ${c.name} leaves nothing standing taller than a man`,
    c => `${c.other} is razed by ${c.name}. Where the hall stood, a dog waits for someone`,
  ],
  annex: [
    c => `${c.name} annexes ${c.other}. Its people now answer to new masters.`,
    c => `${c.name} annexes ${c.other}, and the town's seal is broken in front of the hall`,
    c => `${c.name} annexes ${c.other}. The bell still rings at the old hours; the tithe goes somewhere else`,
  ],
  loot: [
    c => `${c.name} carries off ${c.loot} from ${c.other}`,
    c => `Carts leave ${c.other} loaded for ${c.name}: ${c.loot}`,
    c => `${c.name} empties ${c.other}'s storehouses: ${c.loot}, and the hall door, hinges and all`,
    c => `The plunder from ${c.other} is counted twice in ${c.name}'s square: ${c.loot}`,
    c => `${c.other} watches ${c.loot} go up the road to ${c.name}`,
  ],
  rustle: [
    c => `${c.name} drives off ${c.taken} from ${c.other}'s pastures`,
    c => `${c.other}'s herds go down the road to ${c.name}: ${c.taken}`,
    c => `${c.name} takes ${c.taken} out of ${c.other} at spearpoint, and the dogs follow them`,
    c => `${c.other}'s pastures are empty by evening. ${c.name} has ${c.taken} more than it had`,
  ],

  // ── The long road ──
  longWagon: [
    c => `A wagon sets out from ${c.name} for ${c.other} by way of ${c.via}`,
    c => `A wagon leaves ${c.name} on the long road to ${c.other}, through ${c.via}`,
    c => `${c.name} sends a wagon to ${c.other} the long way, through ${c.via}, and pays a toll at every gate`,
    c => `A carter from ${c.name} sets off ${daypart()} for ${c.other}, with ${c.via} to cross first`,
    c => `${c.via} will see a wagon from ${c.name} pass through, bound for ${c.other} and in no mood to stop`,
    c => `A wagon from ${c.name} takes the through road to ${c.other} by ${c.via}, ${weatherWord()}`,
  ],

  // ── Realms ──
  joinsRealm: [
    c => `${c.name} joins ${c.realm}${c.why ? ', ' + c.why : ''}`,
    c => `${c.name} hangs the colours of ${c.realm} over its hall${c.why ? ', ' + c.why : ''}`,
    c => `${c.name} is part of ${c.realm} now${c.why ? ', ' + c.why : ''}. The old town seal goes into a drawer`,
    c => `${c.name} swears to ${c.realm}${c.why ? ' ' + c.why : ''}. ${headOf(c.town)} takes the oath with a straight face`,
  ],
  breaksAway: [
    c => `${c.name} breaks away from ${c.realm}${c.why ? ': ' + c.why : ''}`,
    c => `${c.name} tears down the banner of ${c.realm} and burns it in the square. ${c.why ? BREAK_WHY[c.why] || cap1(c.why) : 'Nobody puts it out'}`,
    c => `${cap1(c.realm)} loses ${c.name}. ${c.why ? BREAK_WHY[c.why] || cap1(c.why) : 'The tax collector is sent home on foot'}`,
    c => `${c.name} sends the tax collector of ${c.realm} home on foot, with a letter. ${c.why ? BREAK_WHY[c.why] || cap1(c.why) : ''}`,
  ],
  realmEnds: [
    c => `${cap1(c.realm)} is no more; ${c.name} stands alone again`,
    c => `The seal of ${c.realm} is broken in ${c.name}'s hall. What is left is a town and its own fields`,
    c => `${c.name} takes the realm's banner down and folds it. ${cap1(c.realm)} is finished`,
  ],
  realmFalls: [
    c => `${cap1(c.realm)} falls with ${c.cap}. Its towns go their own ways.`,
    c => `With ${c.cap} gone, ${c.realm} comes apart like a wet loaf. Every town goes its own way`,
    c => `${cap1(c.realm)} dies with ${c.cap}. The towns that answered to it stop answering`,
  ],
  realmFounded: [
    c => `${c.names} are now ${c.realm}${c.why ? ', ' + c.why : ''}. ${c.crowning}`,
    c => `A realm is made at ${c.capName}: ${c.names}, now ${c.realm}${c.why ? ', ' + c.why : ''}. ${c.crowning}`,
    c => `${c.names} go to bed as neighbours and wake up as ${c.realm}${c.why ? ', ' + c.why : ''}. ${c.crowning}`,
    c => `New colours on the halls of ${c.names}: ${c.realm}${c.why ? ', ' + c.why : ''}. ${c.crowning}`,
  ],
  union: [
    c => `${c.name} and ${c.other} unite under one banner${c.hands ? `; ${c.hands} shake on it at the ${c.place}` : ''}`,
    c => `${c.name} and ${c.other} become one${c.hands ? `. ${c.hands} seal it at the ${c.place} with a cup` : ''}, and the road between them is just a street now`,
    c => `The road between ${c.name} and ${c.other} has done its work: the two towns join under one banner${c.hands ? `, ${c.hands} shaking at the ${c.place}` : ''}`,
    c => `${c.name} and ${c.other} pool their granaries and their grudges and unite under one banner${c.hands ? `. ${c.hands} make the speeches at the ${c.place}` : ''}`,
  ],

  // ── Rulers: votes, deaths, crowns, knives ──
  election: [
    c => `${cap1(c.realm)} goes to the polls: ${c.win} takes it with ${c.share}% over ${c.lose}. ${pick(['There is dancing in the capital.', 'The losers concede with reasonable grace.', 'The count takes three days and a fistfight.', 'Beer is poured in every member town.'])}`,
    c => `${c.win} is ${c.title} of ${c.realm}, with ${c.share}% of the vote. ${c.lose} goes home to ${wxIs('rain') ? 'a wet garden' : 'the garden'}`,
    c => `The ballots of ${c.realm} are counted in the hall ${daypart()}: ${c.share}% for ${c.win}. ${c.lose} asks for a recount and is given a drink`,
    c => `${cap1(c.realm)} chooses ${c.win}, ${c.share}% of it anyway. ${c.lose} shakes hands in public and says other things in private`,
    c => `${c.win} wins ${c.realm} with ${c.share}% over ${c.lose}. The posters are scraped off the walls by morning`,
    c => `${cap1(c.realm)} votes ${weatherWord()} and gives ${c.win} ${c.share}%. ${c.lose} takes it well, which surprises everyone`,
  ],
  electionStolen: [
    c => `${cap1(c.realm)} goes to the polls and ${c.win} is declared the winner. Nobody believes it; ${c.real} had the towns behind them. ${c.mood}.`,
    c => `The count in ${c.realm} is done behind a locked door, and ${c.win} comes out still ${c.title}. ${c.real} won it and everyone knows. ${c.mood}.`,
    c => `${c.win} keeps the seat of ${c.realm}. The ballot boxes from ${c.realTown}, which went for ${c.real}, turn up in the millpond. ${c.mood}.`,
  ],
  rulerDiesVote: [
    c => `${c.title} ${c.dead} of ${c.realm} is dead. The towns will vote.`,
    c => `${cap1(c.realm)} buries ${c.title} ${c.dead}, and before the grave is filled the towns are arguing about who comes next. There will be a vote`,
    c => `${c.title} ${c.dead} is gone. ${cap1(c.realm)} draws up the rolls for a vote and hangs the old portrait in the corridor`,
  ],
  heir: [
    c => `${c.title} ${c.dead} is dead. ${c.newTitle} ${c.heir}, ${c.how}, takes the throne of ${c.realm} in ${c.name}.`,
    c => `The bells of ${c.name} ring for ${c.title} ${c.dead}, then ring again for ${c.newTitle} ${c.heir}, ${c.how}. ${cap1(c.realm)} goes on`,
    c => `${c.heir}, ${c.how}, is crowned in ${c.name}. ${c.title} ${c.dead} lies in the hall where ${c.heir} stands, and ${c.realm} has a new ${c.newTitle}`,
  ],
  noHeir: [
    c => `${c.title} ${c.dead} dies without an heir. ${c.gone}${cap1(c.realm)} ${c.fate}.`,
    c => `No child, no cousin: ${c.title} ${c.dead} is dead, and the line with them. ${c.gone}${cap1(c.realm)} ${c.fate}.`,
    c => `${cap1(c.realm)} has a dead ${c.title} and an empty cradle. ${c.gone}It ${c.fate}.`,
  ],
  newHouse: [
    c => `${c.title} ${c.who} of a new house is crowned in ${c.name}`,
    c => `A new house takes the crown in ${c.name}: ${c.title} ${c.who}, whose grandfather sold eels`,
    c => `${c.name} crowns ${c.title} ${c.who}, of no house anybody had heard of until this morning`,
  ],
  hordeSuccession: [
    c => `${c.title} ${c.dead} is dead and the warbands of ${c.strong} ride into ${c.name} before the body is cold. ${c.who} is Supreme Leader now. ${pick(['Nobody argues.', 'Those who argued are not seen again.', 'The old guard is sent to the mines.'])}`,
    c => `The warbands of ${c.strong} settle the succession in ${c.name} by arriving first. ${c.who} is Supreme Leader; ${c.title} ${c.dead} is buried with fewer guards than expected`,
    c => `${c.title} ${c.dead} dies, and ${c.who} comes out of ${c.strong} with the warbands at their back. By morning ${c.name} has a Supreme Leader and a new list`,
  ],
  omenSuccession: [
    c => `${c.title} ${c.dead} goes to the gods. The omens name ${c.who} ${c.newTitle} of ${c.realm}: ${pick(['a crow on the hall roof', 'a fish with two tails', 'a dream three people had on the same night', 'the way the smoke went'])}.`,
    c => `${cap1(c.realm)} mourns ${c.title} ${c.dead} for seven days and then reads the entrails. They say ${c.who}`,
    c => `The priests of ${c.realm} climb the hill above ${c.name} and come down with a name: ${c.who}, ${c.newTitle} after ${c.dead}`,
  ],
  dominionSuccession: [
    c => `${c.title} ${c.dead} is dead. ${c.who} of the militia takes the hall in ${c.name} and does not call it a coup.`,
    c => `${c.who} of the militia has the keys to ${c.name}'s hall before ${c.title} ${c.dead} is in the ground. Nobody uses the word coup`,
    c => `${c.title} ${c.dead} is buried with honours, and ${c.who}, who commands the guard, is ${c.newTitle} of ${c.realm}. The honour guard does not leave the hall`,
  ],
  coup: [
    c => `COUP in ${c.name}: the militia of ${c.angry} march on the hall. ${c.fall} ${c.who} is ${c.title} of ${c.realm} by nightfall.`,
    c => `The soldiers of ${c.angry} come into ${c.name} ${daypart()} with the gate already open. ${c.fall} ${c.who} rules ${c.realm} now, as ${c.title}`,
    c => `COUP. ${c.angry}'s militia takes ${c.name}'s hall in an hour. ${c.fall} ${c.who} is ${c.title} of ${c.realm}, and the curfew starts tonight`,
  ],
  assassin: [
    c => `${c.oldTitle} ${c.old} of ${c.realm} is found dead ${daypart()}. ${pick(['A knife.', 'Poison, says the healer.', 'A fall from a window that does not open.'])} ${c.who} takes the hall in ${c.name} before anyone asks questions.`,
    c => `${cap1(c.realm)} wakes without its ${c.oldTitle}: ${c.old}, dead in bed with the door barred from inside. ${c.who} is in the chair at ${c.name} by noon`,
    c => `${c.oldTitle} ${c.old} eats the fish at supper. ${c.who} does not. ${cap1(c.realm)} has a new master in ${c.name}`,
  ],
  purge: [
    c => `${cap1(c.ruler)} purges the towns of ${c.realm}: ${c.dead} taken ${daypart()} and not seen again. ${pick(['The streets are quiet after.', 'Nobody speaks of it.', 'The lists were long this year.'])}`,
    c => `Doors are knocked on across ${c.realm}, ${daypart()}. ${c.dead} people go with the soldiers. ${cap1(c.ruler)} calls it housekeeping`,
    c => `${c.dead} names on ${c.ruler}'s list, and ${c.realm} is ${c.dead} people lighter. The neighbours of the taken say they never knew them`,
  ],
});

// More ways to say the old war bags in 11b. Every war line keeps "declares war", "marches on", "War. " or "declaration of war".
PHRASES.warDeclared.push(
  c => `${c.name} declares war on ${c.other}${c.why ? ' ' + c.why : ''}. The smith is paid in advance`,
  c => `A rider from ${c.name} nails a declaration of war to ${c.other}'s gate ${daypart()}${c.why ? ', ' + c.why : ''}`,
  c => `${c.name} declares war on ${c.other}${c.why ? ' ' + c.why : ''}. ${season() === 3 ? 'Nobody fights in the snow, so both sides sharpen and wait' : season() === 2 ? 'The harvest will have to come in without the young men' : cap1(moodWord(c.town))}`,
  c => `${c.elder || 'The elder'} of ${c.name} declares war on ${c.other}${c.why ? ' ' + c.why : ''}, and the bell is rung backwards, as it has not been rung in years`,
);
PHRASES.truce.push(
  c => `${c.name} and ${c.other} lay down their spears${c.why ? ' ' + c.why : ''}. The fields on both sides have gone to thistle`,
  c => `A truce between ${c.name} and ${c.other}${c.why ? ' ' + c.why : ''}. Each side keeps the other's prisoners a week longer than agreed, out of habit`,
  c => `${c.hands ? c.hands + ' sign' : 'Somebody signs'} a truce for ${c.name} and ${c.other}${c.why ? ' ' + c.why : ''}, in a barn halfway between`,
  c => `Peace between ${c.name} and ${c.other}${c.why ? ' ' + c.why : ''}. The dead are sent home wrapped, both ways`,
);
PHRASES.meet.push(
  c => `${c.att} from ${c.name} reach ${c.other} and find ${c.def} waiting ${c.wall ? 'on the wall' : 'in the ditches'}`,
  c => `${c.other} counts ${c.att} coming up the road from ${c.name} and sends ${c.def} out to meet them${c.wall ? ' at the wall' : ''}`,
  c => `The fight for ${c.other} begins ${daypart()}: ${c.name} with ${c.att}, ${c.other} with ${c.def}${c.wall ? ' and a wall' : ''}`,
);
PHRASES.holds.push(
  c => `${c.other} holds${c.wall ? ' its wall' : ''}. All ${c.att0} who came from ${c.name} are dead; ${c.other} lost ${c.defLost}`,
  c => `${c.name} sent ${c.att0} against ${c.other} and none come home. ${c.other} buries ${c.defLost} of its own and keeps the boots`,
);
PHRASES.withdraws.push(
  c => `${c.name} gives up on ${c.other} ${weatherWord()}: ${c.attLost} attackers dead, ${c.defLost} defenders`,
  c => `A bloody draw at ${c.other}. ${c.name} carries ${c.attLost} home on doors; ${c.other} buries ${c.defLost}`,
);
