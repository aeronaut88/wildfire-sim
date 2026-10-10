/* ───────────────────────── Phrases: fire and folk ─────────────────────────
   Fire response and losses, settlers, the wild, notable folk, technology, the acts of god and the
   law. Every bag extends PHRASES (11b) and goes through say(), so anti-repeat, dayparts, weather,
   mood and the town's memory all apply. Matchers in 32 read some of these lines: every phrasing
   keeps the words they look for (noted beside the bag). */

const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const aAn = w => /^[aeiou]/i.test(w) ? 'an' : 'a';
const ppl = n => `${n} ${n === 1 ? 'person' : 'people'}`;
const were = n => n === 1 ? 'was' : 'were';
const NUMW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const countWord = n => n < NUMW.length ? NUMW[n] : String(n);
function chiefName(town) { const c = town && person(town, 'chief'); return c ? c.name : null; }
function namedOf(town, roles) { const xs = (town && town.people || []).filter(p => p.alive && roles.includes(p.role)); return xs.length ? pick(xs) : null; }
const isWinter = () => season() === 3, isSummer = () => season() === 1;
// A phrasing without the log: for lines another file logs itself (the weather).
function phraseText(key, c) {
  const bag = PHRASES[key]; if (!bag) return '';
  const used = phraseUsed[key] || (phraseUsed[key] = []);
  let idx = Math.floor(Math.random() * bag.length), tries = 0;
  while (used.includes(idx) && tries++ < 6) idx = Math.floor(Math.random() * bag.length);
  used.push(idx); if (used.length > Math.min(2, bag.length - 1)) used.shift();
  return bag[idx](c || {});
}
// What a building was for, so its loss means something.
const BUILDING_MEANT = {
  granary: ['the winter\'s bread', 'every bushel put by since harvest', 'the seed corn for next spring'],
  quarry: ['the cut stone stacked for the new wall', 'the winch and the masons\' sheds'],
  pasture: ['the fences and the hay', 'the winter fodder'],
  mine: ['the pit-head and the winding gear', 'the props that held the drift up'],
  "fisher's hut": ['the nets and the drying racks', 'the boats pulled up on the shingle'],
  graveyard: ['the wooden markers, so the dead go nameless for a season', 'the lychgate and every name carved on it'],
  well: ['the well-house and the windlass', 'the only clean water this side of the river'],
  lumberyard: ['a winter\'s worth of seasoned planks', 'the saw-pit and the drying stacks'],
  cistern: ['the roof over the town\'s water', 'the cover, so the water is ash-grey for a month'],
  'town hall': ['the ledgers and every deed the town ever wrote down', 'the chair the elders sat in'],
  "healer's house": ['the herbs drying in the rafters', 'the healer\'s jars and the book of remedies'],
  hospital: ['the beds and the herb store', 'the ward and the clean linen'],
  gaol: ['the cells and the key to them', 'the gaoler\'s stool and the bars'],
  barracks: ['the spears and the bunks', 'the militia\'s spare boots'],
  forge: ['the bellows and the anvil stand', 'the smith\'s tools, which will take a year to replace'],
  watchtower: ['the one place that could see the fire coming', 'the lookout\'s ladder'],
  bakery: ['the ovens, still warm from the morning', 'tomorrow\'s bread'],
  inn: ['the taproom and everything in the cellar', 'the only warm room travellers could count on'],
  brewery: ['a year of beer, which burns better than anyone expected', 'the vats and the malt floor'],
  mill: ['the millstones, cracked in the heat', 'the flour store'],
  smokehouse: ['the hams on their hooks', 'the winter\'s smoked fish'],
  'root cellar': ['the hatch and the stair, though the turnips below survive', 'the store under the hill'],
  'water wheel': ['the wheel that ground the town\'s grain', 'the race and the paddles'],
  tenement: ['forty rooms of other people\'s belongings', 'a whole stair of families\' things'],
  university: ['the library', 'the scholars\' notes, years of them'],
  monument: ['the statue, blackened now', 'the names on the plinth'],
  gallows: ['the gallows, which nobody mourns', 'the drop'],
};
function meantOf(what) { const m = BUILDING_MEANT[what]; return m && m.length ? pick(m) : null; }
function listWords(items) { return items.length <= 1 ? (items[0] || '') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]; }

Object.assign(PHRASES, {
  // ── Fire: the first dead, the whole count, crews, engines, buildings ──
  trapped: [
    c => `${c.name}: ${ppl(c.n)} could not get out`,
    c => `The first house to burn in ${c.name} had people in it. ${c.n} did not come out`,
    c => `In ${c.name} the door stuck, and ${ppl(c.n)} ${were(c.n)} behind it`,
    c => `${c.name} loses ${ppl(c.n)} to the smoke ${daypart()}, before the crews are even at the edge of town`,
    c => `Neighbours in ${c.name} drag out whoever they can reach. ${cap1(ppl(c.n))} they cannot`,
    c => `${c.name}'s first dead of this fire: ${ppl(c.n)}, ${isWinter() ? 'wrapped in their blankets' : 'still in their work clothes'}`,
    c => `A bucket line in ${c.name} reaches the burning house too late. ${c.n} inside`,
    c => c.cause === 'dragon' ? `The dragon's fire takes a house in ${c.name} with ${ppl(c.n)} in it` : c.cause === 'raid' ? `Raiders bar a door in ${c.name} and fire the thatch. ${c.n} inside` : `${c.n} dead in ${c.name} under a roof that came down all at once`,
    c => `${c.name}: a ${c.stone ? 'stone house that should have held' : 'thatched house that went up like straw'}, and ${ppl(c.n)} in it`,
  ],
  fireDead: [
    c => `The fire is out at ${c.name}. ${c.lost ? `${c.lost} of ${c.had} homes gone` : 'Every house is standing'}, and ${c.dead} dead`,
    c => `${c.name} stands down ${daypart()} and counts its dead: ${c.dead}. ${c.lost ? `${c.lost} of ${c.had} homes ${c.lost === 1 ? 'is' : 'are'} ash` : 'Not one home lost, which makes it harder to understand'}`,
    c => `${c.name} lays out ${c.dead} under sheets in the square when the smoke lifts${c.lost ? `. ${c.lost} of ${c.had} homes went too` : ''}`,
    c => `When it is over, ${c.name} has ${c.dead} fewer people and ${c.lost ? `${c.lost} fewer roofs of the ${c.had}` : 'all its roofs'}`,
    c => `${c.name} stands down. ${c.dead} names for ${elderOf(c.town)} to read out${c.lost ? `, ${c.lost} of ${c.had} homes to raise again` : ''}`,
    c => `The bell stops at ${c.name}. ${c.dead} did not live to hear it stop${c.lost ? `, and ${c.lost} of ${c.had} homes are gone` : ''}`,
    c => `${c.name}'s fire burns itself out ${weatherWord()}. ${c.dead} dead${c.lost ? `, ${c.lost} homes lost of ${c.had}` : ''}. ${isWinter() ? 'The ground is too hard to dig; they wait for the thaw' : 'The graves are dug before dark'}`,
    c => `The count at ${c.name}, when there is time to make it: ${c.dead} dead${c.lost ? `, ${c.lost} of ${c.had} homes` : ''}. Nobody sleeps much`,
  ],
  crewOverrun: [
    c => `${c.name}: a crew of ${c.n} overrun when the wind swings round behind them`,
    c => c.ground === 'timber' ? `A crown run in the timber above ${c.name} comes down on a crew of ${c.n}. None of them get out` : `The ${c.ground} outside ${c.name} goes up faster than a crew of ${c.n} can run`,
    c => `${c.n} of ${c.name}'s firefighters are lost to the smoke in a hollow they thought was safe`,
    c => `A burning snag falls across the line outside ${c.name}. The crew of ${c.n} under it are not found until morning`,
    c => c.chief ? `Chief ${c.chief} of ${c.name} watches a crew of ${c.n} cut off by a wall of flame at the gully, and can do nothing` : `A wall of flame comes up the gully at ${c.name} and a crew of ${c.n} is on the wrong side of it`,
    c => `${c.name} loses a crew of ${c.n}, caught between two fires ${daypart()}`,
    c => `A crew of ${c.n} from ${c.name} goes in after a spot fire and the main fire closes the road behind them`,
    c => `${c.name}'s crew of ${c.n} is found where the line was, tools still in their hands${c.chief ? `. ${c.chief} brings them in` : ''}`,
    c => `${c.n} firefighters of ${c.name} die ${weatherWord()} when the fire jumps the break they were holding`,
    c => `The ${c.ground} catches under a crew of ${c.n} from ${c.name}${c.chief ? `. Chief ${c.chief} had sent them there` : ''}. Nobody blames the chief out loud`,
  ],
  crewTally: [
    c => `and ${c.n} more firefighters`,
    c => `and ${c.n} more firefighters who did not come back`,
    c => `and ${c.n} more off the line`,
  ],
  fireTally: [
    c => `Also lost at ${c.name}: ${c.list}`,
    c => `${c.name} walks the ruins after: ${c.list}, gone as well`,
    c => `It was not only houses at ${c.name}. ${cap1(c.list)}`,
    c => `${cap1(elderOf(c.town))} goes round ${c.name} with a slate and writes down the rest: ${c.list}`,
    c => `The rest of the bill at ${c.name} comes in ${daypart()}: ${c.list}`,
    c => `What else ${c.name} lost, when anyone thinks to ask: ${c.list}`,
  ],
  alarmEngines: [
    c => `${c.name} sounds the alarm ${daypart()}: ${c.crews} rally and the station rolls ${c.eng}`,
    c => `The bell at ${c.name}, and ${c.crews} turn out; ${c.eng} roll out of the station behind them`,
    c => c.chief ? `Chief ${c.chief} has ${c.name}'s ${c.eng} out of the station before the bell stops, and ${c.crews} rally behind` : `${c.name}'s ${c.eng} leave the station before the bell stops, and ${c.crews} rally behind`,
    c => `${c.name} sounds the alarm ${weatherWord()}: ${c.crews} on foot and ${c.eng} on the road`,
    c => `Doors bang all down the street in ${c.name} ${daypart()}. ${cap1(c.crews)} rally, ${c.eng} ${c.engN === 1 ? 'rolls' : 'roll'} out`,
    c => `${c.name} sounds the alarm. ${isWinter() ? 'Fire in winter, which the old people say is the worst kind' : isSummer() ? 'Another one, in a summer full of them' : 'Smoke where there should be mist'}. ${cap1(c.crews)} rally and ${c.eng} go out`,
    c => `${c.name}'s station rolls ${c.eng}, and ${c.crews} rally behind them${c.chief ? `, ${c.chief} on the running board` : ''}`,
    c => `The horses know before anyone at ${c.name}. By the time the bell goes, ${c.eng} ${c.engN === 1 ? 'is' : 'are'} hitched and ${c.crews} turn out`,
  ],
  stationLost: [
    c => `${c.name} fire station burns down`,
    c => `The fire station at ${c.name} burns, which the town will be hearing about from its neighbours for years`,
    c => `${c.name} loses its fire station ${daypart()}. The bell comes down through the roof`,
    c => `The fire station at ${c.name} goes up with the hoses still on their hooks`,
    c => `${c.name}'s fire station is gone. The crews have nowhere left to muster`,
  ],
  engineLost: [
    c => `${c.name} engine ${c.id} ${c.why}`,
    c => `Engine ${c.id} of ${c.name} ${c.why}; its crew walk home behind the others`,
    c => `${c.name} loses engine ${c.id}, ${c.why}`,
    c => `Engine ${c.id} does not come back to ${c.name}: ${c.why}`,
    c => `${c.name} is one engine short: number ${c.id}, ${c.why}`,
    c => `${c.chief ? `Chief ${c.chief} of ${c.name}` : c.name} writes off engine ${c.id}, ${c.why}`,
  ],
  townGone: [
    c => `${c.name} is gone`,
    c => `The last roof falls in. ${c.name} is gone`,
    c => `Nobody rings the bell at ${c.name} any more. ${c.name} is gone`,
    c => `${c.homes} homes burned at ${c.name}, one after another, and now ${c.name} is gone`,
  ],
  survivorsStandDown: [
    c => `${c.name} survivors stand down`,
    c => `What is left of ${c.name} stands in a field and watches the last of it burn`,
    c => `The fire runs out of ${c.name} to burn. The survivors stand down in the ash`,
  ],
  stoneCode: [
    c => `After the fire, ${c.name}'s ${c.who ? 'elder ' + c.who : 'council'} decrees it: no more thatch. Every new roof is tile and every wall is quarried stone.`,
    c => `${c.who ? c.who : 'The council'} of ${c.name} has it cried in the square: nobody roofs with thatch again. Stone walls, tile roofs, or nothing.`,
    c => `${c.name} will build in stone from now on. ${c.who ? `${c.who} signs the order` : 'The council signs the order'} with soot still under the nails.`,
  ],
  pastureLost: [
    c => `${c.name} loses ${c.animals} with the pasture`,
    c => `The pasture at ${c.name} burns with the gate shut. ${cap1(c.animals)} inside`,
    c => `${c.name}'s pasture goes up and ${c.animals} with it. The herder sits on the fence after and will not come in`,
    c => `Fire runs through the pasture at ${c.name} ${daypart()}: ${c.animals} lost, the rest run for the river`,
    c => `${cap1(c.animals)} burn in ${c.name}'s pasture. The smell hangs over the town for days`,
    c => `${c.name} opens the pasture gate too late. ${cap1(c.animals)} are lost`,
  ],
  jetsBurn: [
    c => `${c.n} jet${c.n > 1 ? 's' : ''} burn on the apron at ${c.name}`,
    c => `The air base at ${c.name} goes up, and ${c.n} jet${c.n > 1 ? 's' : ''} with it, still chocked`,
    c => `${c.name} loses ${c.n} jet${c.n > 1 ? 's' : ''} on the ground. Nobody got near enough to taxi them out`,
  ],
  bombersBurn: [
    c => `${c.n} bomber${c.n > 1 ? 's' : ''} burn in the hangars at ${c.name}`,
    c => `The hangars at ${c.name} burn, and ${c.n} bomber${c.n > 1 ? 's' : ''} inside them. The neighbours sleep better`,
    c => `${c.name}'s ${c.n} bomber${c.n > 1 ? 's' : ''} never fly again: the hangar roof comes down on them`,
  ],
  blastDead: [
    c => `${c.name}: ${c.n} killed by the blast`,
    c => `${c.n} killed by the blast at ${c.name}. There is nothing to bury`,
    c => `${c.name} counts ${c.n} killed by the blast, and stops counting when the light goes`,
    c => `The ones killed by the blast at ${c.name}: ${c.n}. The ones who saw it will not talk about it`,
  ],
  bridgeBurns: [
    c => `A bridge burns and falls into the river${c.name ? ` below ${c.name}` : ''}`,
    c => `The bridge${c.name ? ` on the ${c.name} road` : ''} burns through and drops into the river in pieces`,
    c => `${c.name ? `${c.name} watches its bridge` : 'A bridge'} burn and fall into the river. The ferry is back in business`,
    c => `The river takes a burning bridge${c.name ? ` near ${c.name}` : ''} downstream, still smoking`,
  ],
});
// The old lines keep their place; these add to them.
PHRASES.alarm.push(
  c => `Somebody runs the length of ${c.name} shouting, and ${c.crews} turn out`,
  c => `${c.name} sounds the alarm ${weatherWord()}. ${cap1(c.crews)} rally${c.chief ? `; ${c.chief} has not slept since the last one` : ''}`,
  c => `The dogs of ${c.name} know before the bell does. ${cap1(c.crews)} rally`,
  c => `Buckets off the hooks in ${c.name} ${daypart()}: ${c.crews} turn out`,
  c => `${c.chief ? `Chief ${c.chief} rings the bell at ${c.name} and does not stop` : `The bell at ${c.name} does not stop`} until ${c.crews} rally`,
  c => `${c.name} sounds the alarm. ${isWinter() ? 'Fire in the snow, which nobody thought could happen' : 'Ash is falling in the wells'}, and ${c.crews} turn out`,
);
PHRASES.saved.push(
  c => `${c.name} stands down ${daypart()}. ${c.homes} homes, every one with its roof on`,
  c => `The fire turns away from ${c.name} at the last field. ${c.homes} homes untouched, and nobody can say why`,
  c => `${chiefName(c.town) ? `Chief ${chiefName(c.town)} calls the crews in` : 'The crews come in'} at ${c.name}; all ${c.homes} homes saved`,
  c => `${c.name} stands down ${weatherWord()}. Not one of ${c.homes} homes lost. Somebody opens a cask`,
);
PHRASES.lost.push(
  c => `${c.name} stands down with ${c.lost} of its ${c.had} homes gone. Families double up with the neighbours`,
  c => `${c.lost} homes lost at ${c.name} of ${c.had}. ${isWinter() ? 'In winter, which is the worst time for it' : 'At least it is not winter'}`,
  c => `The ash at ${c.name} is still warm when the first families start raking through it: ${c.lost} of ${c.had} homes`,
  c => `${c.name} stands down. ${c.lost} of ${c.had} homes are chimneys and nothing else`,
);
PHRASES.crewLost.push(
  c => `${c.name} counts its crews and comes up ${c.n} short, ${c.why}`,
  c => `The crew of ${c.n} that ${c.name} sent out was ${c.why}; their buckets lie where they fell`,
  c => `${c.n} of ${c.name}'s people on the line, ${c.why}${chiefName(c.town) ? `. ${chiefName(c.town)} reads out their names` : ''}`,
);
PHRASES.buildingLost.push(
  c => c.meant ? `${c.name} loses its ${c.what}, and with it ${c.meant}` : `${c.name} loses its ${c.what} ${daypart()}`,
  c => c.meant ? `The ${c.what} at ${c.name} burns to the sills, ${c.meant} with it` : `The ${c.what} at ${c.name} burns to the sills`,
  c => `${c.name} watches its ${c.what} go ${weatherWord()}.${c.meant ? ` Nobody had thought about ${c.meant} until now` : ''}`,
  c => `${cap1(elderOf(c.town))} stands in the ash of ${c.name}'s ${c.what}.${c.meant ? ` ${cap1(c.meant)}: gone` : ' There is nothing to say'}`,
  c => `The roof of ${c.name}'s ${c.what} falls in ${daypart()}${c.meant ? `, and ${c.meant} under it` : ''}`,
  c => `Fire takes the ${c.what} at ${c.name}${isWinter() ? ', in winter too' : ''}.${c.meant ? ` ${cap1(c.meant)} will have to be found again` : ''}`,
);

// ── Settlers and refugees (whereOf follows any line with "settlers" or "refugees") ──
Object.assign(PHRASES, {
  settlersAppear: [
    c => `A wagon of settlers appears on the ${c.edge} edge${c.bound ? `, bound for ${c.bound}` : ''}`,
    c => `A party of settlers on the ${c.edge} road ${daypart()}: ${c.n} of them, with a cow tied to the tailboard`,
    c => `${c.n} settlers come over the ${c.edge}ern hills ${weatherWord()}${c.bound ? `, asking the way to ${c.bound}` : ', looking for flat ground and water'}`,
    c => `A line of carts on the ${c.edge} edge: settlers, ${c.n} by the count of heads, ${isWinter() ? 'on the road at the worst time of year' : 'with everything they own roped down'}`,
    c => `The ${c.edge} edge: a wagon, a dog and ${c.n} settlers who have heard there is land here`,
    c => `${c.n} settlers come down off the ${c.edge} ridge with handcarts${c.bound ? `. Somebody has told them about ${c.bound}` : '. Nobody has told them about the fires'}`,
    c => `Word from the ${c.edge} edge of settlers on the road, ${c.n} of them, and a fiddler among them`,
  ],
  settlersLost: [
    c => `The settlers never made it. ${c.n} lost on the road.`,
    c => `The fire finds the settlers' wagons on the road. ${c.n} lost, and the cow`,
    c => `Smoke on the road where the settlers were. ${c.n} dead, and nobody in the valley knew their names`,
    c => `${c.n} settlers burn on the road${c.bound ? ` to ${c.bound}` : ''}, a day short of wherever they were going`,
  ],
  settlersTurnBack: [
    () => 'The settlers turned back',
    () => 'The road is burning ahead of them, and the settlers turn their wagons round',
    () => 'The settlers wait three days for the smoke to clear, then give it up and go back the way they came',
  ],
  settlersNoGround: [
    () => 'The settlers found no good ground and moved on',
    () => 'The settlers walk the ground, kick at it, and move on. Too wet, too steep, too near the fire',
    () => 'The settlers camp a night where they meant to build, and leave in the morning without a word',
  ],
  newcomers: [
    c => `${c.n} newcomers settle in ${c.name} (pop now ${c.pop})`,
    c => `The settlers' wagons stop in ${c.name}'s square. ${c.n} more mouths, ${c.pop} in all`,
    c => `${c.name} makes room for ${c.n} settlers ${daypart()}; ${c.pop} people now, and the spare beds are all taken`,
    c => `${c.n} settlers unpack in ${c.name}. ${cap1(elderOf(c.town))} finds them a field. The town is ${c.pop}`,
    c => `${c.name} is ${c.pop} now: ${c.n} settlers come in off the road and nobody turns them away`,
    c => `A wagon of ${c.n} settlers pulls into ${c.name}${isWinter() ? ', glad of any roof' : ''}. ${c.pop} people`,
  ],
  refugeesIn: [
    c => `${c.name} takes in ${c.n} refugees from ${c.from}`,
    c => `${c.n} refugees from ${c.from} reach ${c.name} with what they could carry. ${c.name} finds them floors to sleep on`,
    c => `${c.name} opens the hall to ${c.n} refugees from ${c.from}. Some of the children have never seen a town that was not burning`,
    c => `The refugees from ${c.from} come into ${c.name} ${weatherWord()}, ${c.n} of them, and are given soup before anyone asks their names`,
    c => `${c.n} refugees from ${c.from} at ${c.name}'s gate ${daypart()}. They are let in without a word`,
  ],
  resettle: [
    c => `${c.n} settlers resettle ${c.name} (pop now ${c.pop}, ${c.built} homes started with the timber they brought)`,
    c => `${c.n} settlers move into the empty streets of ${c.name}. ${c.pop} people now, and ${c.built} homes started with timber off their wagons`,
    c => `${c.name} had been waiting for anyone at all. ${c.n} settlers come; ${c.pop} people now, and ${c.built} new homes going up from the timber they brought`,
    c => `Smoke from the chimneys of ${c.name} again: ${c.n} settlers, ${c.pop} in all, ${c.built} houses started`,
  ],
});
PHRASES.settlersFound.push( // achievement: settlers found | is founded by | ^A new town:
  c => `${c.n} settlers found ${c.name} ${daypart()}${c.leader ? `, ${c.leader} pacing out the first street` : ''}. ${c.homes} homes by nightfall`,
  c => `${c.name} is founded by ${c.n} settlers who liked the look of the water. ${c.homes} homes${c.leader ? `, and ${c.leader} to keep them in order` : ''}`,
  c => `A new town: ${c.name}. ${c.n} settlers, ${c.homes} roofs, and ${c.leader ? c.leader + ' in charge' : 'nobody yet in charge'}`,
);

// ── The wild ──
Object.assign(PHRASES, {
  migration: [
    () => 'The herds come down from the hills',
    () => 'Deer on every ridge: the autumn migration is on',
    () => 'The hills empty into the valley: deer, elk and boar on the move in the mornings',
    () => 'The deer come off the ridges in long lines, and every hunter in the valley oils a bowstring',
    () => `Elk in the river meadows ${daypart()}. The migration is on, and the wolves will be following it`,
    () => 'Boar in the orchards and deer in the barley: the hills have come down to the valley for the autumn',
  ],
  herdLeaves: [
    c => `A herd of ${c.kind} leaves the valley`,
    c => `The ${c.kind} go over the edge of the valley and do not come back this year`,
    c => `The last of the ${c.kind} move out ${daypart()}, and the meadows are quiet`,
    c => `Tracks of ${c.kind} on the far ridge, all going out`,
    c => `A herd of ${c.kind} drifts out of the valley, and the hunters let it go`,
  ],
  wolvesCome: [ // must begin "Wolves come down" (achievement and whereOf)
    c => `Wolves come down ${c.cold ? 'with the snow' : 'out of the far timber'}: a pack of ${c.n} on the ${c.edge} edge`,
    c => `Wolves come down on the ${c.edge} edge ${daypart()}, ${c.n} of them, ${c.cold ? 'thin from the winter' : 'following the herds'}`,
    c => `Wolves come down out of the ${c.edge} hills. ${c.n} in the pack, and the shepherds bring the flocks in early`,
    c => `Wolves come down to the ${c.edge} edge: ${c.n} grey shapes along the treeline, and every dog in the valley knows it`,
    c => `Wolves come down, a pack of ${c.n} on the ${c.edge} side${c.cold ? '. It has been a hard winter in the hills too' : ''}`,
    c => `Wolves come down. ${c.n} of them, seen at the ${c.edge} edge by a charcoal burner who ran the whole way home`,
  ],
  bearSeen: [ // whereOf: "The bear" or "bear in the deep"
    () => 'Hunters report a bear in the deep timber. Nobody goes that way for a while.',
    () => 'A bear in the deep timber: claw marks on the pines as high as a tall man can reach',
    () => `The bear is back in the deep woods. A girl saw it at the berry patch ${daypart()} and came home without the basket`,
    () => 'Somebody finds a bear in the deep timber the hard way, and lives to show the scar',
  ],
  wolvesTake: [
    c => `Wolves take ${c.job} from ${c.name} in the woods ${daypart()}`,
    c => `${cap1(c.job)} from ${c.name} does not come back from the woods. They find the basket, and the tracks`,
    c => `The wolves get ${c.job} from ${c.name} ${weatherWord()}. ${c.name} keeps its children in after dark`,
    c => `${c.name} loses ${c.job} to the wolves. The pack has learned where the town works`,
    c => `Howling at the edge of ${c.name}'s woods, and then ${c.job} is missing`,
    c => `Wolves drag down ${c.job} of ${c.name} within sight of the fields`,
  ],
  bearTakes: [ // whereOf: "The bear"
    c => `The bear takes ${c.job} from ${c.name} in the woods ${daypart()}`,
    c => `The bear in the woods above ${c.name} kills ${c.job}. Nobody goes for the body alone`,
    c => `The bear takes ${c.job} from ${c.name}. The berry patch is left to the bear after that`,
    c => `The bear comes out of the timber on ${c.job} from ${c.name}, and that is the end of it`,
  ],
  wolvesPasture: [
    c => `Wolves take ${c.n} ${c.kind} from ${c.name}'s pasture in the night`,
    c => `${c.name} finds ${c.n} ${c.kind} dead in the pasture ${daypart()}, and wolf tracks all round the fence`,
    c => `The wolves are in ${c.name}'s pasture again: ${c.n} ${c.kind} gone`,
    c => `${c.n} ${c.kind} carried off from ${c.name}'s pasture. The dogs did not bark, which worries people more`,
    c => `${c.name}'s herder sits up all night with a lantern and still loses ${c.n} ${c.kind} to the wolves`,
  ],
  wolvesHunted: [
    c => `${c.name}'s ${c.who} go out after the wolves and kill ${c.n}. The rest run for the trees.`,
    c => `${c.name}'s ${c.who} track the pack to its den and kill ${c.n}. The pelts hang in the square`,
    c => `${c.n} ${c.n === 1 ? 'wolf' : 'wolves'} dead at ${c.name}'s fence, ${c.who === 'hunters' ? 'shot by the hunters' : 'speared by the militia'}. The rest keep away for a while`,
    c => `The ${c.who} of ${c.name} go out ${daypart()} with torches and dogs: ${c.n} ${c.n === 1 ? 'wolf' : 'wolves'} killed`,
    c => `${c.name} pays a bounty on ${c.n} wolf ${c.n === 1 ? 'pelt' : 'pelts'} when the ${c.who} come back from the woods`,
  ],
  wolvesLeave: [
    c => `The wolves move on over the ${c.edge} edge`,
    c => `The pack goes back over the ${c.edge} edge. The shepherds sleep`,
    c => `No howling last night. The wolves have gone ${c.edge}`,
    c => `The wolves drift off over the ${c.edge} ridge after the herds`,
  ],
  bearLeaves: [ // whereOf: "The bear"
    c => `The bear moves on over the ${c.edge} edge`,
    c => `The bear is seen crossing the ${c.edge} ridge, going away`,
    c => `The bear wanders off ${c.edge}, and the berry pickers go back to the patch`,
  ],
  bearKilled: [
    c => `${c.name}'s hunters bring down the bear${c.who ? `; ${c.who} took the shot` : ''}. There is meat for a month.`,
    c => `${c.who ? c.who : 'A hunter'} of ${c.name} brings down the bear in the deep timber. The skin goes on the floor of the hall`,
    c => `The bear is dead. ${c.name}'s hunters drag it home on a sledge, and there is meat for a month`,
    c => `${c.name} eats bear for a month. ${c.who ? `${c.who} took the shot and will not stop telling it` : 'Nobody admits to the first shot, the one that missed'}`,
  ],
});

// ── Water: floods and beavers ──
Object.assign(PHRASES, {
  flooded: [
    c => `${c.cause}: ${c.homes} building${c.homes === 1 ? '' : 's'} flooded out${c.name ? ` at ${c.name}` : ''}${c.drowned ? `, ${c.drowned} drowned` : ''}`,
    c => `Water to the windowsills in ${c.name || 'the low streets'}: ${c.homes} building${c.homes === 1 ? '' : 's'} flooded out${c.drowned ? `, ${c.drowned} drowned` : ''}`,
    c => `${c.name ? c.name + ' wakes' : 'People wake'} to water on the stairs. ${c.homes} building${c.homes === 1 ? '' : 's'} lost to the flood${c.drowned ? `, and ${c.drowned} drowned` : ''}`,
    c => `${c.homes} building${c.homes === 1 ? ' goes' : 's go'} under${c.name ? ' at ' + c.name : ''}${c.drowned ? `; ${c.drowned} drowned, mostly the old and the very young` : ''}. ${c.cause}.`,
    c => `The flood takes ${c.homes} building${c.homes === 1 ? '' : 's'}${c.name ? ` in ${c.name}` : ''}${c.drowned ? ` and ${c.drowned} people` : ''}. The mud line on the walls is chest high`,
  ],
  burstBanks: [ // achievement: bursts its banks
    c => `The river bursts its banks below the burn scar, ${c.n} cells under water`,
    c => `Rain on the burn scar, nothing left to hold it, and the river bursts its banks: ${c.n} cells under water`,
    c => `The river bursts its banks ${daypart()}. ${c.n} cells of meadow under brown water, with ash floating on all of it`,
    c => `With no roots left on the hills to drink it, the river bursts its banks and spreads over ${c.n} cells`,
  ],
  beaversAtWork: [
    c => `Beavers are at work on the river${c.where ? ' ' + c.where : ''}`,
    c => `Somebody${c.near ? ` from ${c.near}` : ''} finds fresh-chewed stumps along the river. Beavers`,
    c => `The beavers are back on the river${c.where ? ' ' + c.where : ''}, felling saplings faster than any logger`,
    c => `A beaver lodge on the river${c.where ? ' ' + c.where : ''}. The fishers are not pleased`,
  ],
  beaversDam: [ // achievement: finish their dam
    c => `The beavers finish their dam. A pond of ${c.n} cells spreads behind it.`,
    c => `The beavers finish their dam ${daypart()}. Behind it a pond of ${c.n} cells, and the ducks have found it already`,
    c => `The beavers finish their dam, and the river backs up into a pond of ${c.n} cells where the willows used to be`,
  ],
  beaverDamGone: [
    () => 'The beaver dam is gone and the pond drains to mud',
    () => 'The beaver pond drains away through the burned dam, and leaves the fish flapping in the mud',
    () => 'Nothing left of the beaver dam. The pond goes back to being a river, with a lot of mud either side',
  ],
  beaversBurned: [
    () => 'The fire gets to the beavers before the dam is finished',
    () => 'The half-built beaver dam burns to the waterline. The beavers are not seen again',
    () => 'Smoke over the beaver works on the river. The dam will not be finished now',
  ],
  beaversLeave: [
    () => 'The beavers move on. Their dam will not last.',
    () => 'The beaver lodge is empty. Without them the dam starts to leak by the week',
    () => 'The beavers go downriver one night and do not come back. Nobody mends a beaver dam',
  ],
  beaverDamGives: [
    () => 'The old beaver dam gives way',
    () => 'The old beaver dam goes out in a rush, and the river is a river again by evening',
    () => 'With nobody to mend it, the beaver dam gives way at last',
  ],
});

// ── Notable folk: elections, deaths, funerals, the mob, the chair ──
const SEAT_OF = { elder: 'chair in the hall', chief: 'hook for the helmet', hunter: 'stool at the inn', healer: 'bench by the door', constable: 'post at the gate', baker: 'place at the ovens', smith: 'anvil', mason: 'bench in the yard' };
Object.assign(PHRASES, {
  electElder: [
    c => `${c.name} chooses ${c.who} as elder, ${aAn(c.label)} ${c.label} who ${c.blurb}`,
    c => `${c.who} is the new elder of ${c.name}: ${aAn(c.label)} ${c.label}, people say, who ${c.blurb}`,
    c => `${c.name} gives the chair to ${c.who} ${daypart()}. ${cap1(aAn(c.label))} ${c.label}, and one who ${c.blurb}`,
    c => `The hall at ${c.name} votes, argues, and votes again, and ${c.who} has the chair: ${aAn(c.label)} ${c.label} who ${c.blurb}`,
    c => `${c.who} takes up the elder's staff at ${c.name}. ${cap1(aAn(c.label))} ${c.label} who ${c.blurb}; ${c.label === 'tyrant' || c.label === 'warmonger' ? 'some people pack a bag, just in case' : 'nobody objects much'}`,
    c => `${c.name} has ${c.who} for its elder now, ${aAn(c.label)} ${c.label} who ${c.blurb}${c.kin ? `, and ${c.kin}` : ''}`,
  ],
  electChief: [
    c => `${c.who} takes over as ${c.name}'s fire chief`,
    c => `${c.name} has a new fire chief: ${c.who}, who ${c.story}`,
    c => `The fire chief's helmet at ${c.name} goes to ${c.who}${c.kin ? `, ${c.kin}` : ''}`,
    c => `${c.who} is ${c.name}'s fire chief now. The first thing ${c.who.split(' ')[0]} does is count the buckets`,
    c => `${c.name} hands the bell rope to ${c.who}, its new fire chief`,
  ],
  electRole: [
    c => `${c.who} becomes ${c.name}'s ${c.role}`,
    c => `${c.name} has ${aAn(c.role)} ${c.role} again: ${c.who}`,
    c => `${c.who} is made ${c.role} of ${c.name}${c.kin ? `, ${c.kin}` : ''}`,
    c => `${c.name} names ${c.who} its ${c.role}. ${c.who.split(' ')[0]} ${c.story}`,
  ],
  notableDies: [
    c => `${c.who}, ${c.label} of ${c.name}, ${c.verb} at ${c.age}`,
    c => `${c.name} loses its ${c.label}: ${c.who} ${c.verb} at ${c.age}`,
    c => `${c.who}, ${c.age}, ${c.label} of ${c.name}, ${c.verb}. ${cap1(c.story)}`,
    c => `${c.name}'s ${c.label}, ${c.who}, ${c.verb} at ${c.age}${c.kinName ? `. ${c.kinName} takes it hardest` : ''}`,
    c => `${c.who} of ${c.name} ${c.verb} at ${c.age}. ${c.seat ? `Nobody uses ${c.who.split(' ')[0]}'s ${c.seat} for a long time` : 'The street is quiet that night'}`,
    c => `${c.name} loses ${c.who} at ${c.age}${c.deeds ? `, the ${c.label} who ${c.deeds}` : `, its ${c.label}`}. ${c.who.split(' ')[0]} ${c.verb}`,
  ],
  oldAge: [
    c => `${c.who}, ${c.label} of ${c.name}, dies of old age at ${c.age}. ${cap1(c.story)}.`,
    c => `${c.who} of ${c.name} dies in bed at ${c.age}, which in this valley is an achievement. ${cap1(c.story)}.`,
    c => `${c.name} loses ${c.who}, ${c.label}, ${c.age} years old and one of the last who remembered the valley before the fires. ${cap1(c.story)}.`,
    c => `${c.who} does not wake one morning. ${c.age} years, ${c.label} of ${c.name}. ${cap1(c.story)}.`,
    c => `${c.who}, ${c.label} of ${c.name}, dies at ${c.age} ${weatherWord()}, of nothing but years. ${cap1(c.story)}.`,
    c => `${c.name} rings the bell slowly for ${c.who}, ${c.age}. ${cap1(c.story)}.`,
  ],
  funeral: [
    c => `${c.name} buries ${c.who} ${['under a grey sky', 'in the rain', 'on a bright morning', 'as the snow comes down', 'at dusk'][Math.floor(Math.random() * 5)]}. ${cap1(c.story)}.`,
    c => `Half of ${c.name} walks behind ${c.who} to the graveyard. ${cap1(c.story)}.`,
    c => `${c.name} buries ${c.who} ${daypart()}, and ${elderOf(c.town)} keeps the words short`,
    c => `They put ${c.who} in the ground at ${c.name} ${weatherWord()}. ${c.kinName ? `${c.kinName} throws the first handful` : 'Nobody from the family is left to throw the first handful'}`,
    c => `"${c.who.split(' ')[0]} ${c.story}," they say at ${c.name}'s graveside, and then they go home`,
    c => `${c.name} buries ${c.who}. ${isWinter() ? 'The ground has to be broken with a pick' : 'There are wild flowers on the grave by evening'}`,
  ],
  unrestCrowd: [
    c => `A crowd stands outside the hall at ${c.name} and does not go home when it gets dark`,
    c => `${c.name}: ${c.n} or more at the hall, and somebody has brought a rope`,
    c => `The square at ${c.name} fills ${daypart()}. ${c.leader} does not come out.`,
    c => `Stones at the hall windows in ${c.name}`,
    c => `${c.name}'s square is full of people who should be at work. ${c.leader} sends out bread, and they throw it back`,
    c => `Somebody has painted ${c.leader}'s name on the hall door at ${c.name}, and something under it`,
    c => `${c.n} people outside ${c.leader}'s window at ${c.name} ${weatherWord()}, saying nothing, which is worse than shouting`,
  ],
  revolt: [ // keeps its capitals: REVOLT in
    c => `REVOLT in ${c.name}: the people rise against ${c.leader} the ${c.label} and drag them out of the hall${c.hanged ? '. Somebody has a rope.' : '.'}`,
    c => `REVOLT in ${c.name}. ${c.leader} the ${c.label} is dragged out of the hall by people who used to nod to them in the street${c.hanged ? '. There is a rope.' : '.'}`,
    c => `REVOLT in ${c.name}: the doors of the hall come off their hinges ${daypart()}, and ${c.leader} the ${c.label} goes out through them${c.hanged ? ', toward a rope.' : '.'}`,
  ],
  hallBeam: [
    c => `${c.leader} is hanged from the hall beam at ${c.name} before the crowd has finished shouting`,
    c => `${c.name} hangs ${c.leader} from the beam of the hall that was theirs that morning`,
    c => `They do not wait for a gallows at ${c.name}. ${c.leader} hangs from the hall beam by dusk`,
  ],
  riots: [
    c => `Riots in ${c.name}; a house burns`,
    c => `Somebody throws a lamp in ${c.name} the night the elder falls, and a house burns`,
    c => `The crowd in ${c.name} does not go home when it is over. A house burns before morning`,
    c => `${c.name} has its riot: windows, a cart overturned, and one house burned`,
  ],
  madFeast: [
    c => `${c.leader} of ${c.name} declares a feast and empties half the granary`,
    c => `${c.leader} of ${c.name} orders a feast for no reason anyone can find. Half the granary goes on it`,
    c => `${c.name} eats like a wedding on ${c.leader}'s word, and the granary is half empty by morning`,
  ],
  madField: [
    c => `${c.leader} of ${c.name} sets a field alight to see what the smoke says`,
    c => `${c.leader} of ${c.name} walks into the barley with a torch ${daypart()}. The river told them to`,
    c => `${c.name}'s elder, ${c.leader}, burns a field and reads the smoke. Nobody asks what it said`,
  ],
  madAnimals: [
    c => `${c.leader} of ${c.name} opens the pastures and sets ${c.n} animals free`,
    c => `${c.leader} of ${c.name} lets ${c.n} animals out of the pastures because they looked unhappy`,
    c => `${c.n} animals wander the streets of ${c.name}. ${c.leader} opened the gates and will not say why`,
  ],
  drunkLamp: [
    c => `${c.leader} of ${c.name} falls asleep with the lamp lit`,
    c => `${c.leader} of ${c.name} knocks over a lamp coming home from the inn`,
    c => `A lamp, a bottle and ${c.leader} of ${c.name}: a fire, again`,
  ],
  prophetTower: [
    c => `${c.leader} of ${c.name} orders a watchtower raised against the fire to come`,
    c => `${c.leader} of ${c.name} has seen the fire in a dream, and a watchtower goes up on the strength of it`,
    c => `${c.name} builds a watchtower because ${c.leader} says so. ${c.leader} says a great many things, but this one is cheap`,
  ],
  tyrantTax: [
    c => `${c.leader} of ${c.name} takes ${c.n} coin from the chest for the palace`,
    c => `${c.n} coin goes from ${c.name}'s chest to ${c.leader}'s palace. The clerk writes it down as repairs`,
    c => `${c.leader} of ${c.name} helps themselves to ${c.n} coin. Nobody in the hall looks up`,
  ],
  comeOfAge: [
    c => `${c.who} of ${c.name} comes of age${c.label ? `, ${aAn(c.label)} ${c.label} like ${c.parent}` : ''}`,
    c => `${c.who} turns fifteen in ${c.name}${c.label ? ` and is already ${aAn(c.label)} ${c.label}, the image of ${c.parent}` : `. ${c.who.split(' ')[0]} ${c.tail}`}`,
    c => `${c.name} has another grown voice at the well: ${c.who}${c.parent ? `, ${c.parent}'s` : ''}${c.label ? `, ${aAn(c.label)} ${c.label} through and through` : ''}`,
    c => `${c.who} of ${c.name} comes of age ${weatherWord()}${c.label ? `, and ${c.parent} sees their own ${c.label}'s streak in the child` : `. ${c.who.split(' ')[0]} ${c.tail}`}`,
    c => `They stop calling ${c.who} a child in ${c.name}${c.label ? `. ${aAn(c.label) === 'an' ? 'An' : 'A'} ${c.label}, like ${c.parent}` : ''}`,
  ],
  successionCrisis: [
    c => `${c.heir} and ${c.rival} both claim the chair at ${c.name} when ${c.prev} dies. ${c.heir} wins it; ${c.rival} does not forget.`,
    c => `${c.prev} is barely buried before ${c.heir} and ${c.rival} are shouting over the chair at ${c.name}. ${c.heir} has more friends in the hall; ${c.rival} has a long memory`,
    c => `Two of ${c.prev}'s blood want the chair at ${c.name}. ${c.heir} gets it, ${c.rival} gets nothing, and the town picks a side`,
  ],
  succession: [ // achievement: takes the chair at
    c => `${c.heir}, ${c.rel} of ${c.prev}, takes the chair at ${c.name}: ${aAn(c.label)} ${c.label} who ${c.blurb}`,
    c => `The chair stays in the family: ${c.heir}, ${c.rel} of ${c.prev}, takes the chair at ${c.name}. ${cap1(aAn(c.label))} ${c.label} who ${c.blurb}`,
    c => `${c.heir} takes the chair at ${c.name} where ${c.prev} sat, ${aAn(c.label)} ${c.label} who ${c.blurb}`,
    c => `${c.name} buries ${c.prev}, and ${c.heir}, ${c.rel}, takes the chair at ${c.name} the same week: ${aAn(c.label)} ${c.label} who ${c.blurb}`,
  ],
  successionFire: [
    c => `A house burns in ${c.name} the night of the succession`,
    c => `Somebody in ${c.name} does not like how the chair was settled. A house burns that night`,
    c => `The night ${c.name} gets its new elder, a house on the ${['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)]} street burns`,
  ],
});
PHRASES.birth.push(
  c => `${c.parent} of ${c.name} has a child ${daypart()}: ${c.who}`,
  c => `${c.who} is born to ${c.parent} in ${c.name} ${isWinter() ? 'in the hard weather, and the neighbours each bring a log for the fire' : 'with the windows open and the street listening'}`,
  c => `A child for ${c.parent} at ${c.name}. They call it ${c.who.split(' ')[0]}`,
  c => `${c.name}'s healer is up all night with ${c.parent}, and in the morning there is ${c.who}`,
  c => `${c.who}, born at ${c.name} to ${c.parent}. ${(c.town.unrest || 0) >= 45 ? 'A hard time to be born into' : 'A good year for it'}`,
);

// ── Technology: what a step changes for people ──
const TECH_MEANS = {
  bows: 'bows on the hall wall and archers drilling on the green', steel: 'steel blades for the militia and steel shares for the ploughs', 'siege engines': 'engines that can knock down a wall, and neighbours who know it',
  gunpowder: 'powder, and a smell that hangs over the practice field', rifles: 'a rifle for every militia hand', artillery: 'guns that reach the next town', 'the bomb': 'the end of everything, if anyone is fool enough',
  buckets: 'a bucket on every hook and a line from the well to the edge of town', 'fire brigade': 'paid crews, a proper bell, and engines that carry thirty loads', waterworks: 'clean water in pipes, and an end to the sickness pits',
  'lookout tower': 'a lookout who sees smoke an hour sooner', geology: 'people who can read the rock and say where the ore is', aviation: 'a strip of flattened ground and something that flies off it',
  hearth: 'a proper hearth in every house', smoking: 'meat that keeps through the winter', masonry: 'stone walls that do not burn', milling: 'flour instead of cracked grain',
  'root cellars': 'turnips in March', brewing: 'beer, and the arguments that go with it', cookery: 'meals worth sitting down to', orchards: 'apple trees, which take years and are worth it', mastery: 'a table the whole valley talks about',
};
Object.assign(PHRASES, {
  techLearn: [
    c => `${c.name} ${c.verb} ${c.tech}: ${c.means}`,
    c => `${cap1(c.tech)} comes to ${c.name}, and with it ${c.means}`,
    c => `${c.name} has ${c.tech} now. What that means, in practice: ${c.means}`,
    c => `${c.who ? `${c.who} of ${c.name}` : `Somebody at ${c.name}`} works out ${c.tech}. ${cap1(c.means)} by next season`,
    c => `The old way is done at ${c.name}: the town ${c.verb} ${c.tech}, which means ${c.means}`,
    c => `${c.name}, ${seasonWord()}: ${c.tech}. ${cap1(c.means)}`,
  ],
  techNeed: [
    c => `${c.name} has the ${c.word} for ${c.tech} but needs ${c.need}`,
    c => `${c.who ? c.who : 'Somebody'} at ${c.name} has ${c.tech} drawn out in charcoal on the workshop wall. What is missing is ${c.need}`,
    c => `${c.name} knows how ${c.tech} is done and cannot do it yet: ${c.need} is the trouble`,
    c => `Every evening at ${c.name} somebody says ${c.tech} would be easy, if only there were ${c.need}`,
    c => `${c.name} is stuck on ${c.tech} for want of ${c.need}`,
    c => `${c.name}'s ${c.tech} waits on ${c.need}. ${cap1(elderOf(c.town))} has been told twice`,
  ],
  bombKnow: [
    c => `${c.name} knows how to build a bomb. It needs uranium.`,
    c => `${c.name} has worked out the bomb on paper. All it needs now is uranium, and somebody to say no.`,
    c => `The scholars at ${c.name} have finished their sums. The bomb can be built, if there is uranium.`,
  ],
  bombBuilt: [ // achievement: has built a bomb
    c => `${c.name} has built a bomb. Nobody there knows what it will do to the land.`,
    c => `${c.name} has built a bomb. It sits in the silo, and people walk the long way round it.`,
    c => `${c.name} has built a bomb, and ${elderOf(c.town)} has the only key.`,
  ],
  bombAnother: [
    c => `${c.name} completes another bomb`,
    c => `${c.name} has a second bomb now. Nobody can say what the first one was for`,
    c => `Another bomb in the silo at ${c.name}`,
  ],
  bomberFirst: [
    c => `A bomber rolls out of the hangar at ${c.name}. The neighbours take note.`,
    c => `${c.name}'s first bomber is out on the strip. Every town that can see it is counting its own walls`,
    c => `The hangar doors open at ${c.name} and a bomber comes out. Nobody in the valley sleeps well that night`,
  ],
  bomberAnother: [
    c => `Another bomber rolls out at ${c.name}`,
    c => `${c.name} adds a bomber to the line on the strip`,
    c => `One more bomber at ${c.name}, and one more reason for the neighbours to be polite`,
  ],
  jetFirst: [
    c => `${c.name} rolls out a fighter jet. It was built for one thing, and everyone knows what.`,
    c => `${c.name} has a fighter jet on the strip now, built for the next thing with wings that comes over the ridge`,
    c => `The children of ${c.name} watch the new fighter jet take its first turn over the town and do not go to bed`,
  ],
  jetSecond: [
    c => `${c.name} rolls out a second jet`,
    c => `A second fighter at ${c.name}, so the first one has somebody to fly with`,
    c => `${c.name}'s second jet is ready. The pilots draw lots for which one gets the newer seat`,
  ],
  shell: [
    c => `${c.name}'s guns shell ${c.other}`,
    c => `Shells from ${c.name} land in ${c.other}'s streets ${daypart()}`,
    c => `${c.other} hears ${c.name}'s guns a breath before the shells arrive`,
    c => `${c.name} puts another round into ${c.other}. The crews have stopped counting`,
  ],
  bomberLifts: [ // whereOf: bomber lifts off
    c => `A bomber lifts off from ${c.name} bound for ${c.other}`,
    c => `A bomber lifts off from ${c.name} ${daypart()}, heavy, and turns toward ${c.other}`,
    c => `The ground shakes at ${c.name} as a bomber lifts off. It is going to ${c.other}`,
  ],
  bomberReturns: [
    c => `${c.name}'s bomber returns, ${c.n} bombs on ${c.other}`,
    c => `${c.name}'s bomber comes home light. ${c.n} bombs left on ${c.other}`,
    c => `The bomber is back at ${c.name}. ${c.other} has ${c.n} new craters`,
    c => `${c.n} bombs on ${c.other}, and ${c.name}'s bomber lands with the sun behind it`,
  ],
  launchBomb: [ // the bomb keeps its capitals
    c => `${c.name} has launched THE BOMB at ${c.other}`,
    c => `${c.name} has launched THE BOMB at ${c.other}. There is nothing anyone can do now`,
    c => `${c.name} has launched THE BOMB at ${c.other}. In ${c.other} they see the trail and do not understand it`,
  ],
  bombFalls: [ // achievement: The bomb falls
    c => `The bomb falls on ${c.name || 'the valley'}. The ground will not forget.`,
    c => `The bomb falls on ${c.name || 'the valley'}. For a moment there are two suns.`,
    c => `The bomb falls on ${c.name || 'the valley'}, and the birds go silent across the whole valley.`,
  ],
  meltdown: [ // keeps its capitals: MELTDOWN
    c => `MELTDOWN at ${c.name}. The reactor burns open and the land around it is poisoned for years.`,
    c => `MELTDOWN at ${c.name}. The reactor's roof is gone and something invisible is pouring out of it.`,
    c => `MELTDOWN at ${c.name}. The fire reached the reactor, and the land will pay for it for a generation.`,
  ],
  sickness: [
    c => `A sickness no one can name spreads through ${c.name}`,
    c => `People in ${c.name} lose their hair, then their appetite. The healer has no word for it`,
    c => `${c.name} is sick in a way nobody has seen before. It started after the light`,
  ],
  poisoned: [ // achievement: is empty. The land is poisoned
    c => `${c.name} is empty. The land is poisoned.`,
    c => `The last of them leave, or die. ${c.name} is empty. The land is poisoned.`,
  ],
});

// ── Dragons ──
Object.assign(PHRASES, {
  dragonReturns: [ // achievement: dragon, returns
    c => `${c.who}, the ${c.kind} dragon, returns for ${c.name}`,
    c => `${c.who}, the ${c.kind} dragon, returns. It has come back for ${c.name}, as everyone at ${c.name} said it would`,
    c => `Over the ridge ${daypart()}: ${c.who}, the ${c.kind} dragon, returns for ${c.name}. It has not forgotten`,
  ],
  dragonLimps: [
    c => `${cap1(c.who)} limps away from ${c.name}. ${c.lit} building${c.lit === 1 ? '' : 's'} set ablaze before the archers found their range${c.loot ? `, ${c.loot} gone with it` : ''}.`,
    c => `${cap1(c.who)} drags itself away from ${c.name} with arrows in it, ${c.lit} building${c.lit === 1 ? '' : 's'} burning behind${c.loot ? ` and ${c.loot} in its claws` : ''}. The dragon will be back.`,
    c => `${c.name}'s archers send ${c.who} off low over the trees. ${c.lit} fire${c.lit === 1 ? '' : 's'} to put out${c.loot ? `, ${c.loot} gone` : ''}, and nobody dead on the wall who was not dead already.`,
  ],
  scramble: [ // whereOf: scrambles a jet
    c => `${c.name} scrambles a jet against ${c.who}${c.forTown ? ' for ' + c.forTown : ''}`,
    c => `${c.name} scrambles a jet${c.forTown ? ` to help ${c.forTown}` : ''}. The pilot is in the air before the dragon is over the ridge`,
    c => `Sirens at ${c.name}'s strip: it scrambles a jet after ${c.who}${c.forTown ? `, which is making for ${c.forTown}` : ''}`,
  ],
  jetRakes: [
    c => `${c.name}'s jet rakes ${c.who} with cannon fire`,
    c => `${c.name}'s jet comes in under ${c.who} and puts a burst into its belly`,
    c => `Cannon fire over ${c.name}: the jet has found ${c.who}`,
  ],
  jetLands: [
    c => `${c.name}'s jet lands with ${c.n} hit${c.n === 1 ? '' : 's'} to its name`,
    c => `${c.name}'s jet is down on the strip again, ${c.n} hit${c.n === 1 ? '' : 's'} on the dragon and scorch on its wings`,
    c => `The pilot climbs out at ${c.name} and holds up ${c.n} finger${c.n === 1 ? '' : 's'}: hits on the dragon`,
  ],
});
PHRASES.dragonSeen.push( // achievement: has been sighted | is in the valley | shape in the sky
  c => `${c.who.toUpperCase()} has been sighted over the ${['north', 'east', 'south', 'west'][Math.floor(Math.random() * 4)]} ridge, a ${c.kind} dragon, and ${c.name} is in its path${c.then ? `, then ${c.then}` : ''}`,
  c => `Shepherds run down from the hills shouting: ${c.who.toUpperCase()} is in the valley. The ${c.kind} dragon wants ${c.name}${c.then ? `, and ${c.then} after` : ''}`,
);
PHRASES.dragonDriven.push( // achievement: It will remember
  c => `${c.name} drives ${c.who} off with everything it has. ${c.lost} archers do not come down off the wall. It will remember.`,
  c => `${c.who} turns tail from ${c.name}'s wall ${daypart()}, ${c.lost} archers the price. It will remember.`,
);
PHRASES.dragonLeaves.push(
  c => `${c.who} leaves ${c.name} as it found it, except for ${c.lit} building${c.lit === 1 ? '' : 's'} now burning${c.loot ? ` and ${c.loot} missing from the chest` : ''}.`,
  c => `The shadow goes off ${c.name} ${daypart()}. ${c.who} has set ${c.lit} fire${c.lit === 1 ? '' : 's'}${c.loot ? ` and taken ${c.loot}` : ''}, and is a speck over the hills.`,
);

// ── Acts of god ──
Object.assign(PHRASES, {
  quakeTown: [
    c => `${c.name} in the quake: ${c.dead} dead${c.fell ? ', houses down' : ''}${c.walls ? ', the wall cracked' : ''}. ${cap1(moodWord(c.town))}.`,
    c => `${c.name} counts ${c.dead} dead when the shaking stops${c.fell ? ', and houses down in every street' : ''}${c.walls ? '. The wall has a crack you could put an arm through' : ''}`,
    c => `Chimneys come down all over ${c.name}. ${c.dead} dead${c.walls ? ', the wall split' : ''}${c.fell ? ', roofs in the street' : ''}`,
    c => `${c.name}: ${c.dead} dead in the quake${c.fell ? ', houses down' : ''}. People sleep in the fields that night rather than under a roof`,
    c => `The quake goes under ${c.name} like a cart over a loose plank. ${c.dead} dead${c.fell ? ', houses down' : ''}${c.walls ? ', the wall cracked' : ''}`,
  ],
  quakeDam: [
    () => 'A dam gives way in the quake and the river comes down in a wall',
    () => 'The quake cracks a dam, and the river it was holding comes down the valley all at once',
    () => 'A dam breaks in the shaking. The water is a brown wall, then a lake where the fields were',
  ],
  quakeSpring: [
    c => `A spring breaks out of the ground where the quake was centred${c.near ? ', within a walk of ' + c.near : ''}`,
    c => `Where the ground cracked, water comes up clear and cold${c.near ? `, a short walk from ${c.near}` : ''}. A new spring`,
    c => `The quake leaves a gift${c.near ? ` near ${c.near}` : ''}: a spring, bubbling out of the broken ground`,
  ],
});

// ── The air tanker ──
Object.assign(PHRASES, {
  tankerReady: [
    c => `Tanker turned around, ${c.n} sortie${c.n === 1 ? '' : 's'} ready`,
    c => `The tanker is fuelled and loaded again${c.name ? ` at ${c.name}` : ''}: ${c.n} sortie${c.n === 1 ? '' : 's'} ready`,
    c => `Ground crew${c.name ? ` at ${c.name}` : ''} turn the tanker round ${daypart()}; ${c.n} sortie${c.n === 1 ? '' : 's'} ready`,
    c => `The tanker's belly is full of red mud again. ${c.n} sortie${c.n === 1 ? '' : 's'} ready${c.name ? ` at ${c.name}` : ''}`,
  ],
  tankerGrounded: [
    c => `Tanker grounded at ${c.name}: no fuel`,
    c => `The tanker sits on the strip at ${c.name} with dry tanks. No oil, no flights`,
    c => `${c.name} cannot fuel the tanker. It waits on the strip while the smoke goes up`,
  ],
  tankerLaunch: [
    c => `Air tanker launches for ${c.name} (${c.n} sortie${c.n === 1 ? '' : 's'} left)`,
    c => `The tanker goes up for ${c.name}, low and slow over the trees. ${c.n} sortie${c.n === 1 ? '' : 's'} left after this`,
    c => `${c.name} hears the tanker before it sees it. ${c.n} sortie${c.n === 1 ? '' : 's'} left`,
    c => `The tanker banks toward ${c.name} ${weatherWord()} with its doors ready. ${c.n} sortie${c.n === 1 ? '' : 's'} left`,
    c => `Air tanker on its way to ${c.name}; ${c.n} more sortie${c.n === 1 ? '' : 's'} in hand after this one`,
  ],
  tankerDrop: [ // achievement: Tanker drops retardant
    c => `Tanker drops retardant on ${c.n} cells`,
    c => `Tanker drops retardant across ${c.n} cells${c.name ? ` in front of ${c.name}` : ''}: a red line in the grass`,
    c => `Tanker drops retardant, ${c.n} cells of it${c.name ? `, and ${c.name} cheers from the rooftops` : ''}`,
  ],
  airstripLost: [
    c => `The airstrip at ${c.owner} ${c.why}. The tanker is gone.`,
    c => `The airstrip at ${c.owner} ${c.why}, and the tanker with it. The valley is on its own again.`,
    c => `No more tanker: the airstrip at ${c.owner} ${c.why}.`,
  ],
});

// ── Law and order ──
// whereOf follows the law on lines beginning "Constable" or holding "slips out of", "walks out of",
// "goes looking for" or "starts asking"; the justice badge wants "^Constable .* takes " or "militia takes .* for ";
// the gallows badge wants "hanged in the square|hanged on the gallows|drags .* to the old oak".
const ARSON_WHERE = [n => `in the woods above ${n}`, n => `at a charcoal burner's hut above ${n}`, n => `asleep in a hayloft outside ${n}`, n => `on the ridge above ${n} with soot still on their hands`];
const OTHER_WHERE = [n => `at the edge of ${n}`, n => `behind the inn at ${n}`, n => `on the road out of ${n}`, n => `in a cellar in ${n}`];
function captureWhere(kind, name) { return pick(kind === 'arson' ? ARSON_WHERE : OTHER_WHERE)(name); }
Object.assign(PHRASES, {
  caseQuiet: [ // begins "Constable"
    c => `Constable ${c.con} of ${c.name} starts asking questions`,
    c => `Constable ${c.con} of ${c.name} goes door to door ${daypart()}. Nobody saw anything`,
    c => `Constable ${c.con} walks the edge of ${c.name} looking at footprints${c.kind === 'arson' ? ' in the ash' : ''}`,
    c => `Constable ${c.con} of ${c.name} sits in the inn all evening and listens`,
    c => `Constable ${c.con} takes the ${c.crime} at ${c.name} personally`,
    c => `Constable ${c.con} of ${c.name} has a list of names by nightfall and shows it to nobody`,
    c => `Constable ${c.con} starts asking questions in ${c.name}, ${(c.town.unrest || 0) >= 45 ? 'and gets nothing back but shrugs' : 'and people are glad to help'}`,
  ],
  caseSeen: [ // begins "Constable"
    c => `Constable ${c.con} of ${c.name} goes looking for ${c.who}; people saw them`,
    c => `Constable ${c.con} of ${c.name} knows who it was. Everyone does. ${c.who} has not been home since`,
    c => `Constable ${c.con} of ${c.name} has the same name from three witnesses: ${c.who}`,
    c => `Constable ${c.con} goes looking for ${c.who} in ${c.name} ${daypart()}, with half the street pointing the way`,
    c => `Constable ${c.con} of ${c.name} puts out word for ${c.who}. ${c.kin ? `${c.who.split(' ')[0]}'s kin say they have seen nothing` : 'Nobody is hiding them, for once'}`,
    c => `Constable ${c.con} of ${c.name} sets off after ${c.who} with a description and a cudgel`,
  ],
  caseNobody: [
    c => `Nobody in ${c.name} is going after whoever did it`,
    c => `${c.name} has no constable, and nobody volunteers`,
    c => `In ${c.name} people bar their doors and leave it at that`,
    c => `${c.name} grumbles about it at the well and does nothing`,
  ],
  caseTakeUp: [ // begins "Constable"
    c => `Constable ${c.con} takes up the case of ${c.crime} in ${c.name}`,
    c => `Constable ${c.con}, new to the badge in ${c.name}, finds the ${c.crime} business waiting on the desk`,
    c => `Constable ${c.con} of ${c.name} picks up where nobody left off: the ${c.crime}`,
  ],
  capture: [ // begins "Constable", holds " takes "
    c => `Constable ${c.con} takes ${c.who} ${c.where} for ${c.crime}. ${cap1(c.ln)}'s word is ${c.sentence}.`,
    c => `Constable ${c.con} takes ${c.who} ${c.where} ${daypart()}. The charge is ${c.crime}; ${c.ln}'s word is ${c.sentence}`,
    c => `Constable ${c.con} runs ${c.who} down ${c.where} and takes them in for ${c.crime}. ${cap1(c.ln)} settles on ${c.sentence}`,
    c => `Constable ${c.con} takes ${c.who} without a struggle ${c.where}. ${c.crime === 'arson' ? 'Arson' : cap1(c.crime)}, and ${c.ln}'s word is ${c.sentence}`,
    c => `Constable ${c.con} takes ${c.who} for ${c.crime} ${c.where}${c.kin ? `, with ${c.kin} shouting from a doorway` : ''}. ${cap1(c.ln)} decides on ${c.sentence}`,
    c => `Constable ${c.con} takes ${c.who} ${c.where} ${weatherWord()} for ${c.crime}. ${cap1(c.ln)} gives them ${c.sentence}`,
    c => `Constable ${c.con} takes ${c.who} ${c.where} for ${c.crime}, and ${c.who.split(' ')[0]} does not deny it. ${cap1(c.ln)}'s word is ${c.sentence}`,
  ],
  captureMilitia: [ // holds "militia takes ... for "
    c => `${c.name}'s militia takes ${c.who} ${c.where} for ${c.crime}. ${cap1(c.ln)}'s word is ${c.sentence}.`,
    c => `${c.name}'s militia takes ${c.who} for ${c.crime} ${c.where}; ${c.ln} decides on ${c.sentence}`,
    c => `With no constable to send, ${c.name}'s militia takes ${c.who} ${c.where} for ${c.crime}. ${cap1(c.ln)} gives ${c.sentence}`,
  ],
  bribe: [
    c => `${c.con ? `Constable ${c.con}` : 'The constable'} takes ${c.who} for ${c.crime}, and ${c.ln} takes a purse of ${c.purse} coin and looks the other way. ${c.who} is home by supper.`,
    c => `${c.who} is taken for ${c.crime} at ${c.name}, and walks out of the hall an hour later. ${cap1(c.ln)} is ${c.purse} coin heavier`,
    c => `${c.purse} coin changes hands in ${c.name}'s hall, and the ${c.crime} business is forgotten. ${c.who} buys a round at the inn that night`,
  ],
  floorCoin: [
    c => `${c.n} of the ${c.loot} coin is found under ${c.who}'s floor at ${c.name}`,
    c => `They take up ${c.who}'s floorboards at ${c.name} and find ${c.n} of the ${c.loot} coin`,
    c => `${c.n} of ${c.name}'s missing ${c.loot} coin turns up in a pot under ${c.who}'s floor`,
  ],
  gaolCellar: [
    c => `${c.who} is tried for ${c.crime} and locked in the cellar of the hall for ${c.months} months; ${c.name} needs a gaol`,
    c => `${c.name} has no gaol, so ${c.who} does ${c.months} months for ${c.crime} in the cellar of the hall, next to the turnips`,
    c => `${c.who} gets ${c.months} months for ${c.crime}. ${c.name} has to clear out the hall cellar to hold them; it needs a gaol`,
  ],
  gaolSent: [
    c => `${c.who} is tried for ${c.crime} and sent to the gaol for ${c.months} months`,
    c => `${c.months} months in ${c.name}'s gaol for ${c.who}, for ${c.crime}`,
    c => `The trial at ${c.name} is short. ${c.who}, ${c.crime}, ${c.months} months behind the gaol door`,
    c => `${c.who} hears the gaol door shut at ${c.name} ${daypart()}. ${c.months} months, for ${c.crime}`,
  ],
  labour: [
    c => `${c.who} gets ${c.months} months of hard labour ${c.at} for ${c.crime}`,
    c => `${c.name} puts ${c.who} to work ${c.at} for ${c.crime}: ${c.months} months of hard labour`,
    c => `${c.months} months of hard labour ${c.at} for ${c.who}, for ${c.crime}. ${c.name} gets the stone either way`,
    c => `${c.who} goes ${c.at} with a pick and a guard, ${c.months} months for ${c.crime}`,
  ],
  hanged: [ // the gallows badge: hanged on the gallows | hanged in the square
    c => `${cap1(c.ln)} of ${c.name} has ${c.who} hanged ${c.where} for ${c.crime}${c.crowd ? ' with the whole town watching' : ''}. ${c.feared ? 'Nobody weeps.' : 'People mutter that it was too much.'}`,
    c => `${c.who} is hanged ${c.where} at ${c.name} for ${c.crime}, on ${c.ln}'s word. ${c.feared ? 'The fires stop, and that is all anyone says about it.' : 'Some of the crowd turn away before the end.'}`,
    c => `${c.name} hangs ${c.who} for ${c.crime} ${daypart()}: hanged ${c.where}, as ${c.ln} ordered${c.crowd ? ', and the square full' : ''}. ${c.feared ? 'Nobody weeps.' : 'Nobody looks at the family.'}`,
    c => `${c.who} is hanged ${c.where} at ${c.name} ${weatherWord()} for ${c.crime}. ${c.feared ? `${c.ln} calls it justice, and for once the town agrees` : `${c.ln} calls it justice. The town is not so sure`}`,
    c => `${cap1(c.ln)} of ${c.name} will not hear a word for ${c.who}: hanged ${c.where}, for ${c.crime}. ${c.feared ? 'Nobody asks for mercy.' : 'Two people ask for mercy, and are noted.'}`,
  ],
  banishHow: [ // whereOf: cast out of
    c => `is cast out of ${c.name} for ${c.crime} and walks into the hills with what they can carry`,
    c => `is cast out of ${c.name} for ${c.crime}. The gate shuts, and ${c.first} walks into the hills without looking back`,
    c => `is cast out of ${c.name} for ${c.crime} ${weatherWord()}, with a blanket and a day's bread`,
    c => `is cast out of ${c.name} for ${c.crime}. ${c.kin ? `${c.kin} walks them as far as the boundary stone` : 'Nobody walks them to the boundary stone'}`,
  ],
  roamTail: [
    () => 'Somebody should have made sure.',
    () => 'The constable watches them go and does not like it.',
    () => 'Nobody follows to see where.',
    () => 'There are matches in their pocket, and everyone knows it.',
  ],
  fine: [
    c => `${c.who} pays ${c.name} ${c.n} coin for ${c.crime} and goes home`,
    c => `${c.n} coin into ${c.name}'s chest from ${c.who}, for ${c.crime}, and that is the end of it`,
    c => `${c.who} counts out ${c.n} coin on the hall table at ${c.name} for ${c.crime}. The clerk counts it again`,
    c => `${c.name} fines ${c.who} ${c.n} coin for ${c.crime}. ${c.who.split(' ')[0]} pays in copper, slowly, to make a point`,
  ],
  mobHang: [ // the gallows badge: drags .* to the old oak
    c => `A mob in ${c.name} drags ${c.who} to the old oak for ${c.crime}. The constable looks away.`,
    c => `${c.name} does not wait for a trial. The crowd drags ${c.who} to the old oak for ${c.crime} ${daypart()}`,
    c => `Torches in ${c.name}: the crowd drags ${c.who} to the old oak for ${c.crime}, and nobody stops them`,
  ],
  mobBeat: [
    c => `A mob in ${c.name} beats ${c.who} for ${c.crime} and lets them go, and some of them are laughing`,
    c => `${c.name}'s crowd gives ${c.who} a beating for ${c.crime} and leaves them in the road`,
    c => `${c.who} is beaten in ${c.name}'s square for ${c.crime}. Somebody's mother brings water afterwards`,
  ],
  pressed: [
    c => `${c.who} is given a spear and a place in ${c.name}'s militia for ${c.crime}. ${c.war ? 'There is a war on; nobody asks questions.' : 'It is cheaper than a gaol.'}`,
    c => `${c.name} puts ${c.who} in the militia for ${c.crime}. ${c.war ? 'The front line is short of people and long on criminals.' : 'The sergeant is not pleased.'}`,
    c => `${c.who} drills on ${c.name}'s green now, for ${c.crime}. ${c.war ? 'There is a war, and anyone will do.' : 'Better a soldier than a thief, the elder says.'}`,
  ],
  pillory: [
    c => `${c.who} stands a day in the pillory at ${c.name} for ${c.crime}. The children bring rotten apples.`,
    c => `${c.name} puts ${c.who} in the pillory for ${c.crime}. ${isWinter() ? 'It is cold, which is the real punishment' : 'Flies, mostly, and the children'}`,
    c => `A day in the pillory at ${c.name} for ${c.who}, for ${c.crime}. By evening people have stopped looking`,
    c => `${c.who} spends ${daypart()} to dusk in ${c.name}'s pillory for ${c.crime}. Somebody brings them a cup of water when nobody is watching`,
  ],
  pardonHungry: [
    c => `${cap1(c.ln)} of ${c.name} says a hungry parent is no thief and sends ${c.who} home with a loaf`,
    c => `${cap1(c.ln)} of ${c.name} hears ${c.who} out, then sends to the bakery. A hungry parent is not a thief here`,
    c => `${c.who} took bread for children at ${c.name}. ${cap1(c.ln)} pays for it out of the hall's purse and lets them go`,
  ],
  pardon: [
    c => `${cap1(c.ln)} of ${c.name} pardons ${c.who} for ${c.crime}`,
    c => `${cap1(c.ln)} of ${c.name} lets ${c.who} go for ${c.crime}, with a speech about second chances`,
    c => `${c.who} is pardoned at ${c.name} for ${c.crime}. ${cap1(c.ln)} says everyone deserves one`,
  ],
  warden: [
    c => `${cap1(c.ln)} of ${c.name} says it takes one to know one and makes ${c.who} the fire chief. The town is not sure what to think.`,
    c => `${cap1(c.ln)} of ${c.name} makes ${c.who}, a known fire-setter, the fire chief. Nobody knows if it is genius or madness`,
    c => `${c.who} goes in to ${c.ln} at ${c.name} expecting the rope and comes out fire chief`,
  ],
  theftGranary: [
    c => `Someone has been at the granary in ${c.name}: ${c.n} food gone in the night`,
    c => `${c.n} food missing from ${c.name}'s granary, and flour on the step`,
    c => `The granary door at ${c.name} is forced ${daypart()}. ${c.n} food gone, and the children in town have eaten`,
    c => `${c.name}'s granary keeper counts twice: ${c.n} food short. Somebody was hungry`,
  ],
  theftGrain: [
    c => `${c.n} grain missing from the granary in ${c.name}`,
    c => `Somebody in ${c.name} has helped themselves to ${c.n} grain from the granary, and not because they were hungry`,
    c => `${c.n} grain gone from ${c.name}'s granary. ${(c.town.unrest || 0) >= 60 ? 'In this mood, nobody is surprised' : 'People look at each other'}`,
    c => `The granary at ${c.name} is ${c.n} grain lighter than the tally says`,
  ],
  theftChest: [
    c => `The chest at ${c.name} is light: ${c.n} coin missing from the coin room`,
    c => `${c.n} coin has walked out of ${c.name}'s coin room, and the ledger has been tidied to match`,
    c => `${c.name}'s clerk opens the chest and sits down. ${c.n} coin gone`,
    c => `The ledgers at ${c.name} and the chest disagree by ${c.n} coin`,
  ],
  trailCold: [
    c => `The trail goes cold in ${c.name}. ${c.seen ? `${c.who} is still about, and everyone knows it` : 'Whoever it was is still about'}.`,
    c => `${c.name}'s constable gives it up. ${c.seen ? `${c.who} walks past the hall every morning and nods` : 'Nobody will ever know who it was'}`,
    c => `No arrest at ${c.name}. ${c.seen ? `${c.who} drinks at the inn as if nothing happened` : 'The case goes in a drawer'}`,
    c => `The case at ${c.name} runs out of road ${daypart()}. ${c.seen ? `${c.who} was never caught` : 'Whoever did it was never found'}`,
  ],
  slipsOut: [ // whereOf: slips out of
    c => `${c.who} slips out of ${c.name} on the road to ${c.other}`,
    c => `${c.who} slips out of ${c.name} ${daypart()} with a borrowed horse, making for ${c.other}`,
    c => `${c.who} slips out of ${c.name} under a load of hay on a cart to ${c.other}`,
  ],
  sentBack: [
    c => `${c.other} sends ${c.who} back to ${c.name} in chains${c.paid ? ` and claims the bounty, ${c.paid} coin` : ''}`,
    c => `${c.who} comes home to ${c.name} in chains, courtesy of ${c.other}${c.paid ? `, which collects ${c.paid} coin for the trouble` : ''}`,
    c => `${c.other} has no use for ${c.name}'s fugitives: ${c.who} is sent back in chains${c.paid ? ` and the bounty of ${c.paid} coin paid out` : ''}`,
  ],
  refused: [
    c => `${c.other} will not give up ${c.who}. ${c.name} takes it badly.`,
    c => `${c.name} asks ${c.other} for ${c.who} and is told no. The envoy is not offered a chair`,
    c => `${c.who} is safe in ${c.other}, and ${c.other} says so. ${c.name} will remember this`,
  ],
  spyLeaves: [ // whereOf: slips out of
    c => `With the war over, a stranger slips out of ${c.name} by night. Nobody had asked what they were doing there.`,
    c => `The war ends, and the pot-mender who came to ${c.name} last year slips out of the gate before dawn without a word`,
    c => `A stranger slips out of ${c.name} the week the peace is signed, and a room above the inn is empty`,
  ],
  spyNoticed: [
    c => `A stranger in ${c.name} has been asking about the walls and the granary. ${c.who}, they call themselves.`,
    c => `${c.who}, new in ${c.name}, has been counting the militia at drill. Somebody noticed`,
    c => `A child in ${c.name} tells the constable about the stranger who draws the walls in a little book. ${c.who}`,
    c => `${c.who} has bought drinks at ${c.name}'s inn every night for a month and asked about the barracks every time`,
  ],
  spyPlanted: [
    c => `${c.name} sends someone to live quietly in ${c.other}`,
    c => `A pedlar from nowhere in particular settles in ${c.other}. ${c.name} knows exactly where from`,
    c => `${c.name} has an ear in ${c.other} now: a stranger with a good memory and a trade in pots`,
    c => `Somebody arrives in ${c.other} ${weatherWord()} with a pack and a story. The story was written in ${c.name}`,
    c => `${c.name} slips a spy into ${c.other}. ${c.other} has no idea`,
  ],
  desertion: [ // whereOf: walks out of
    c => `${c.who} walks out of ${c.name} in the night with ${c.n} soldiers, bound for ${c.other}'s lines`,
    c => `${c.who} walks out of ${c.name} ${daypart()} with ${c.n} of the militia behind them, going over to ${c.other}`,
    c => `Their captain, ${c.who}, walks out of ${c.name}'s camp with ${c.n} soldiers toward ${c.other}. Nobody tries to stop them`,
  ],
  reachesLines: [
    c => `${c.who} reaches ${c.other}'s lines. ${c.name} will not forget it.`,
    c => `${c.other} takes in ${c.who} and the deserters from ${c.name}, and gives them dinner`,
    c => `${c.who} is safe behind ${c.other}'s lines. ${c.name} scratches the name off the militia roll`,
  ],
  ridesDown: [
    c => `${c.name}'s constable rides down the deserters on the road; ${c.n} soldiers come back shamefaced`,
    c => `${c.name}'s constable catches the deserters at the ford. ${c.n} soldiers walk home with their heads down`,
    c => `The deserters get as far as the crossroads. ${c.name}'s constable brings ${c.n} of them back`,
  ],
  seized: [
    c => `${cap1(c.ln)} of ${c.name} has ${c.who} seized ${daypart()} for ${c.why}`,
    c => `${c.name}'s constable comes for ${c.who} on ${c.ln}'s order. The charge is ${c.why}`,
    c => `${c.who} is taken from their house in ${c.name} for ${c.why}. ${cap1(c.ln)} signed the paper`,
    c => `In ${c.name}, ${c.why} is enough now: ${c.ln} has ${c.who} seized`,
  ],
  wrongPerson: [ // badge: the wrong person
    c => `The ${c.what} did not stop with ${c.wrong}. ${c.name} ${c.fate} the wrong person. ${cap1(moodWord(c.town))}.`,
    c => `Another of the ${c.what} at ${c.name}, and ${c.wrong} is ${c.fate === 'hanged' ? 'in the ground' : 'gone'}. ${c.name} ${c.fate} the wrong person`,
    c => `${c.name} ${c.fate} the wrong person: ${c.wrong} did not do it, and the ${c.what} go on. Nobody can look at the constable`,
  ],
  badge: [
    c => `${c.old} hands in the constable's badge at ${c.name}. ${c.nu} takes it up.`,
    c => `${c.old} puts the constable's badge on the hall table at ${c.name} and walks out. ${c.nu} picks it up`,
    c => `${c.name} has a new constable, ${c.nu}. ${c.old} could not wear the badge after that`,
  ],
  amnesty: [ // whereOf: walk(s) out of
    c => `${c.why}: ${c.names} walk${c.n === 1 ? 's' : ''} out of the ${c.place} at ${c.name}`,
    c => `${c.why}. The ${c.place} at ${c.name} is opened, and ${c.names} walk${c.n === 1 ? 's' : ''} out of it blinking`,
    c => `${c.why}: the ${c.place} at ${c.name} is empty by noon. ${c.names} walk${c.n === 1 ? 's' : ''} out of it free`,
  ],
  breakout: [
    c => `${c.kin ? `${c.who}'s kin break them` : `${c.who} breaks`} out of the ${c.place} at ${c.name} in the night. ${c.name} posts a bounty of ${c.n} coin.`,
    c => `The ${c.place} at ${c.name} is empty in the morning: ${c.who} is out${c.kin ? ', and the bars were cut from outside' : ''}. A bounty of ${c.n} coin`,
    c => `${c.who} is gone from ${c.name}'s ${c.place}${c.kin ? ', with family help' : ''}. ${c.n} coin to whoever brings them back`,
  ],
  released: [
    c => `${c.who} comes out of ${c.from} at ${c.name} a changed person`,
    c => `${c.who} walks home from ${c.from} at ${c.name} and goes straight to work. People notice`,
    c => `${c.who}'s time at ${c.from} is done. ${c.name} gets back somebody quieter`,
  ],
  releasedBad: [
    c => `${c.who} is let out of ${c.from} at ${c.name} and has learned nothing`,
    c => `${c.who} comes out of ${c.from} at ${c.name} and is in the inn by noon, telling everyone whose fault it was`,
    c => `${c.name} lets ${c.who} out of ${c.from}. The constable starts keeping an eye out again`,
  ],
  graveyard: [
    c => `${c.name} lays out a graveyard on the edge of town`,
    c => `${c.name} fences a plot on the edge of town for its dead. There are already more than it would like`,
    c => `${c.name} has buried enough people in gardens. It lays out a graveyard on the hill`,
    c => `A graveyard at ${c.name}, with a gate and a yew sapling. ${cap1(elderOf(c.town))} chose the spot`,
    c => `${c.name} lays out a graveyard ${weatherWord()}. The first row fills faster than anyone planned`,
  ],
  gallowsUp: [
    c => `A gallows goes up in the square at ${c.name}`,
    c => `${c.name} builds a gallows in the square ${daypart()}. The carpenter does not charge for it, or does not dare to`,
    c => `There is a gallows in ${c.name}'s square now. Mothers take the long way round to market`,
    c => `${c.name}'s carpenters put up a gallows. ${cap1(elderOf(c.town))} watches from the hall step`,
  ],
  festival: [
    c => `${c.name} brings in the harvest and lights a bonfire in the square. ${c.extra}`,
    c => `Harvest home at ${c.name}: a bonfire in the square, a fiddle, ${c.beer ? 'beer from the brewery,' : 'cider,'} and nobody working tomorrow`,
    c => `${c.name} burns the last sheaf on the bonfire for luck. ${c.extra}`,
    c => `The harvest is in at ${c.name}, and the bonfire in the square can be seen from the next valley. ${c.extra}`,
    c => `${c.name} dances round a bonfire in the square until it is ash. ${c.extra}`,
    c => `${cap1(elderOf(c.town))} lights the harvest bonfire at ${c.name}. ${c.extra}`,
  ],
  festivalFeast: [
    c => `${c.name}'s cooks lay out a feast: ${c.dish}.${c.cook ? ` ${c.cook} is carried round the square.` : ''}`,
    c => `On the trestles in ${c.name}'s square: ${c.dish}.${c.cook ? ` ${c.cook} gets a cheer and a seat by the fire.` : ''}`,
    c => `The feast at ${c.name} is ${c.dish}, and people talk about it for a year${c.cook ? `. ${c.cook} pretends it was nothing` : ''}`,
  ],
  bonfireEscapes: [
    c => `The bonfire at ${c.name} gets away from them`,
    c => `Sparks from the harvest bonfire at ${c.name} land on a thatch. The dancing stops`,
    c => `${c.name}'s bonfire is bigger than it should be, and then it is in a house`,
  ],
  healerSign: [ // badge: hangs out a healer's sign
    c => `${c.who} hangs out a healer's sign in ${c.name}`,
    c => `${c.who} hangs out a healer's sign in ${c.name}, and there is a queue by noon`,
    c => `${c.who} hangs out a healer's sign in ${c.name}, over a door that smells of camomile`,
    c => `${c.who} hangs out a healer's sign in ${c.name}. ${c.who.split(' ')[0]} learned the herbs from a grandmother and the rest from burying people`,
  ],
  patchUp: [
    c => `${c.who} patches up ${c.n} at ${c.name} who would not have lived`,
    c => `${c.n} at ${c.name} owe their lives to ${c.who} and a shelf of herbs`,
    c => `${c.who} of ${c.name} works through the night. ${c.n} who would have died do not`,
    c => `The healer's house at ${c.name} is full: ${c.who} saves ${c.n}`,
  ],
  emptyShelves: [
    c => `${c.who} has nothing on the shelves at ${c.name} and can only watch`,
    c => `${c.who} at ${c.name} has no herbs left. They sit with the dying, which is all there is`,
    c => `The jars in ${c.who}'s house at ${c.name} are empty. People die who would have lived`,
  ],
  weddingArrives: [
    c => `${c.other}'s wedding party reaches ${c.name}; ${c.bride} is married at the hall and ${c.name} feasts for a day`,
    c => `${c.bride} of ${c.other} is married in ${c.name}'s hall ${weatherWord()}, and ${c.name} dances until the fiddler gives out`,
    c => `The wedding party from ${c.other} comes into ${c.name} with ribbons on the oxen. ${c.bride} is married by evening`,
    c => `${c.name} feasts ${c.bride}, come from ${c.other} to marry. ${cap1(elderOf(c.town))} makes a speech, and for once nobody minds`,
    c => `A wedding at ${c.name}: ${c.bride} from ${c.other}, and every bench in the hall full`,
    c => `${c.bride} walks into ${c.name} a stranger from ${c.other} and leaves the hall married. ${isWinter() ? 'They roast a pig against the cold' : 'The dancing spills into the street'}`,
  ],
  envoyBurned: [
    c => `${c.name}'s envoy to ${c.other} is caught by the fire on the road and never arrives`,
    c => `The envoy from ${c.name} never reaches ${c.other}. The fire was on the road first`,
    c => `${c.other} waits for ${c.name}'s envoy, and waits. The road between them burned`,
    c => `Smoke on the road from ${c.name} to ${c.other}, and the envoy in it`,
  ],
  weddingBurned: [
    c => `The wedding party from ${c.name} is caught by the fire on the road to ${c.other}`,
    c => `The fire takes the wedding party from ${c.name} on the road to ${c.other}. The bride's chest is found by the road`,
    c => `${c.other} sets the tables for a wedding, and the party from ${c.name} never comes. The fire found them on the road`,
  ],
  firebugDies: [
    c => `${c.who}, the firebug, dies in a fire of somebody else's making`,
    c => `${c.who}, who set so many fires, is caught by one they did not set`,
    c => `They find ${c.who} in the ash of a fire that was not theirs. The firebug's matches are still dry in their pocket`,
  ],
  exileFrozen: [ // whereOf: cast out of
    c => `${c.who}, cast out of ${c.from}, is found frozen in the woods when the snow goes`,
    c => `The thaw finds ${c.who} under a fir, cast out of ${c.from} and never taken in anywhere`,
    c => `A hunter finds ${c.who}, cast out of ${c.from}, frozen by a fire they could not keep lit`,
  ],
  exileTakenIn: [ // whereOf: cast out of
    c => `${c.who}, cast out of ${c.from}, is taken in at ${c.name}`,
    c => `${c.name} opens its gate to ${c.who}, cast out of ${c.from}, and gives them a bed in the hayloft`,
    c => `${c.who}, cast out of ${c.from}, knocks at ${c.name} ${weatherWord()}. They are let in and asked nothing`,
    c => `${c.name} takes in ${c.who}, cast out of ${c.from}. ${cap1(elderOf(c.town))} says everybody gets one more chance here`,
  ],
  exileTurned: [
    c => `${c.name} turns ${c.who} away at the gate`,
    c => `${c.who} asks at ${c.name}'s gate and is told to keep walking`,
    c => `${c.name} has heard about ${c.who}. The gate stays shut`,
  ],
  firebugReturns: [ // badge: the firebug driven out of
    c => `${c.who}, the firebug driven out of ${c.from}, sets a fire on the edge of ${c.name}`,
    c => `Smoke on the edge of ${c.name}, and a face nobody knows: ${c.who}, the firebug driven out of ${c.from}`,
    c => `${c.who}, the firebug driven out of ${c.from}, has come to ${c.name} with matches`,
  ],
  smuggleIn: [
    c => `After the caravan leaves ${c.name}, ${c.n} ${c.k} turns up that nobody paid for. ${c.lax ? 'Nobody asks.' : 'The elder wants to know who.'}`,
    c => `${c.n} ${c.k} in ${c.name}'s stores that was not there before market day. ${c.lax ? 'Nobody asks where from.' : 'The elder asks where from.'}`,
    c => `Somebody in ${c.name} knows the caravan's back road: ${c.n} ${c.k} came in by it. ${c.lax ? 'People are grateful.' : 'The hall is not pleased.'}`,
  ],
  smuggleOutQuiet: [
    c => `${c.n} ${c.k} leaves ${c.name} on the caravan by the back road, and nobody minds`,
    c => `${c.n} ${c.k} goes out of ${c.name} with the caravan, not on the books, and the clerk shrugs`,
    c => `${c.name} is ${c.n} ${c.k} lighter after market day. Everyone knows where it went`,
  ],
  smuggleMissing: [
    c => `${c.n} ${c.k} is missing from ${c.name}'s stores after market day, and the caravan's wagons sit low`,
    c => `The caravan rolls out of ${c.name} heavier than it came, and ${c.n} ${c.k} is gone from the stores`,
    c => `${c.name} counts its ${c.k} after the caravan leaves: ${c.n} short`,
  ],
  gangUp: [ // whereOf: takes to the woods
    c => `${c.who} takes to the woods above ${c.name} with 2 hard cases. The roads out of ${c.name} are not safe.`,
    c => `${c.who} takes to the woods above ${c.name} with 2 others who have nothing to lose. Nobody takes the ${c.name} road alone now`,
    c => `${c.who} has had enough of ${c.name}'s constable and takes to the woods with 2 friends and a stolen bow`,
  ],
  gangCaravan: [ // begins with the gang's name
    c => `${c.gang}'s gang stops the caravan on the road${c.home ? ' below ' + c.home : ''} and takes ${c.took}${c.coin} coin`,
    c => `${c.gang}'s gang comes out of the trees at the caravan${c.home ? ' below ' + c.home : ''}: ${c.took}${c.coin} coin gone, and a trader with a cracked head`,
    c => `${c.gang}'s gang has the caravan's wagons open on the road${c.home ? ' below ' + c.home : ''} ${daypart()}. ${cap1(c.took)}${c.coin} coin taken`,
  ],
  gangWagons: [ // begins with the gang's name
    c => `${c.gang}'s gang takes the wagons from ${c.from} and burns what they cannot carry`,
    c => `${c.gang}'s gang stops the wagons from ${c.from} at the ford and sends the drivers home on foot`,
    c => `${c.gang}'s gang has the wagons from ${c.from}. The oxen are found later, wandering`,
  ],
  gangEdge: [ // begins with the gang's name
    c => `${c.gang}'s gang comes down on ${c.name}'s edge ${daypart()} and makes off with 4 ${c.k}`,
    c => `${c.gang}'s gang raids the edge of ${c.name}: 4 ${c.k} gone, a fence broken, a dog shot`,
    c => `${c.gang}'s gang walks into ${c.name}'s outer yards bold as you like and leaves with 4 ${c.k}`,
  ],
  posseRides: [ // badge: ^A posse of
    c => `A posse of ${c.n} rides out of ${c.name} after ${c.gang}'s gang`,
    c => `A posse of ${c.n} rides out of ${c.name} ${daypart()}, after ${c.gang}'s gang, with dogs`,
    c => `A posse of ${c.n} rides out of ${c.name} with ropes on their saddles. ${c.gang}'s gang has robbed the road once too often`,
  ],
  posseShot: [
    c => `${c.name}'s posse corners ${c.gang}'s gang in the trees. ${c.gang} is shot running${c.dead ? `; ${c.dead} of the posse will not ride again` : ''}. ${c.loot ? `${c.loot} coin comes home in a bag.` : ''}`,
    c => `${c.gang} dies in the trees above ${c.name} with the posse's arrows in them${c.dead ? `, and ${c.dead} of the posse dead too` : ''}.${c.loot ? ` ${c.loot} coin comes home.` : ''}`,
    c => `The posse from ${c.name} finds ${c.gang}'s camp ${daypart()}. ${c.gang} runs, and is shot${c.dead ? `; ${c.dead} of the posse fall` : ''}.${c.loot ? ` The ${c.loot} coin comes back to the chest.` : ''}`,
  ],
  posseTakes: [
    c => `${c.name}'s posse takes ${c.gang} alive in the trees and brings them in${c.dead ? `, ${c.dead} of the posse dead` : ''}`,
    c => `${c.gang} comes into ${c.name} roped behind the posse's horses${c.dead ? `. ${c.dead} of the posse do not come back` : ''}`,
    c => `${c.name}'s posse brings ${c.gang} in alive ${weatherWord()}${c.dead ? `, and ${c.dead} of their own across the saddles` : ''}`,
  ],
  posseAmbushed: [ // begins with the gang's name
    c => `${c.gang}'s gang ambushes ${c.name}'s posse in the trees: ${c.dead} dead, the rest come home, and the gang moves camp`,
    c => `${c.gang}'s gang was waiting for ${c.name}'s posse. ${c.dead} dead, and the gang gone by morning`,
    c => `${c.gang}'s gang turns on ${c.name}'s posse in the gully. ${c.dead} of the posse dead; the gang moves camp`,
  ],
  mobGallows: [ // badge: hanged on the gallows
    c => `${c.leader} is hanged on the gallows at ${c.name} with the whole town watching. ${pick(['Nobody speaks.', 'Somebody cheers, and is hushed.', 'It is over quickly.', 'The new elder watches from the hall steps.'])}`,
    c => `${c.name} hangs its old elder before a full square: ${c.leader}, hanged on the gallows ${daypart()}, and nobody looks away`,
    c => `${c.leader} is hanged on the gallows at ${c.name}. The crowd goes home quietly, which nobody expected`,
  ],
});

// ── The weather: 19-weather logs WEATHER_MSG[kind]; each entry now reads from a bag ──
Object.assign(PHRASES, {
  weather_clear: [
    () => 'Skies clear',
    () => 'The sky clears and the wind drops. Washing goes out on every line in the valley',
    () => `The clouds break up ${daypart()}. Blue sky, and smoke from somewhere far off`,
    () => 'Clear weather again. The roads dry out by noon',
    () => 'Skies clear over the valley, and the farmers argue about whether the rain was enough',
  ],
  weather_drought: [
    () => 'A dry spell sets in. Everything is tinder.',
    () => 'No rain for weeks, and the grass crackles underfoot. Everything is tinder.',
    () => 'The wells go down a hand\'s width a week. A dry spell, and every spark matters',
    () => 'Drought. The river shows its stones, and the fire watch doubles',
  ],
  weather_rain: [
    () => 'Rain moves in',
    () => 'Rain comes over the hills in a grey wall, and every fire crew in the valley breathes out',
    () => `Rain ${daypart()}, the first in a while. The ash on the hills turns to black paste`,
    () => 'Rain moves in. The fire bells hang quiet and the frogs start up in the ditches',
    () => 'Rain, steady and cold. Somebody in every town goes out to stand in it',
    () => 'The rain comes. Water runs grey off the burned ridges',
  ],
  weather_storm: [
    () => 'A thunderstorm rolls over the valley',
    () => 'Thunder over the ridges, then the rain all at once',
    () => 'A storm comes down the valley like a herd, with lightning in it',
    () => 'The sky goes green, then black: a thunderstorm',
  ],
  weather_ashfall: [
    () => 'Grey ash falls from a dead sky',
    () => 'Ash falls like snow that does not melt',
    () => 'The sun is a copper coin behind the ash. It settles on everything',
  ],
  weather_drystorm: [
    () => 'Dry lightning crackles over the ridges. Not a drop of rain.',
    () => 'Thunder and no rain: dry lightning walks along the ridges, and every fire watch is awake',
    () => 'Dry lightning over the valley, flash after flash on the timber. Not a drop falls',
  ],
  weather_snow: [ // achievement: Snow falls on the valley
    () => 'Snow falls on the valley',
    () => 'Snow falls on the valley, and the fire bells hang silent till spring',
    () => `Snow falls on the valley ${daypart()}. The burned hills go white and look new`,
    () => 'Snow falls on the valley. The children are out in it before anyone has found their boots',
  ],
});
for (const k of Object.keys(WEATHER_MSG)) if (PHRASES['weather_' + k]) Object.defineProperty(WEATHER_MSG, k, { get: () => phraseText('weather_' + k), enumerable: true, configurable: true });

// say() calls back to the town's memory one time in eight. With this many bags that is often, and a burst of
// lines about one town (a raid: the dead, the funeral, the new chief) would echo the same memory three times.
// Once a season a town is plenty.
{ const recallEvery = recall; recall = function (town, key) { if (!town || world.tick - (town.recallTick || -1e9) < YEAR / 4) return null; const r = recallEvery(town, key); if (r) town.recallTick = world.tick; return r; }; }
