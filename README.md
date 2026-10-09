# Wildfire

A forest fire cellular automaton in a single HTML file. Pixel-art terrain, probabilistic
spread, wind, and missile strikes. Zero dependencies, zero build step.

Open `index.html` in any browser, or host it on GitHub Pages.

## How it works

The map is an N x N grid. Each cell is water, rock, grass, a small pine, or a large oak.
Terrain comes from layered value noise (elevation picks water and rock, moisture clusters
the trees into forests) plus one meandering river.

Every tick, each burning cell tries to ignite each neighbor:

```
P(ignite) = spread probability x fuel factor x wind factor
```

| Fuel  | Ignition factor | Burn duration (ticks) |
|-------|-----------------|-----------------------|
| Grass | 1.00            | 2 to 4                |
| Pine  | 0.75            | 6 to 10               |
| Oak   | 0.55            | 12 to 20              |
| Big pine | 0.65         | 10 to 16              |

Water and rock never burn. Burnt cells leave ash (grass) or a charred stump (trees), with
embers that glow for a few ticks.

Wind scales the probability by direction: up to 2.2x downwind, down to 0.1x upwind at full
strength. Diagonal neighbors (Moore mode) get a 0.65x penalty for distance.

## Towns fight back

Every map gets one to three named towns (houses, dirt roads, sometimes a fire station with
one to three engines). About a quarter of maps also have an airbase with a retardant tanker
and a handful of sorties. Where things land, what they get, and how many people turn out is
rolled fresh each time, so no two runs play the same.

- A town only reacts once fire comes within its detection radius. Then it sounds the alarm,
  and after a tick or two crews start forming up in the square. Turnout is a dice roll.
- Crews walk out to the side facing the fire and dig a firebreak arc (two ticks per grass
  cell, three for trees). If flames are already among the houses they switch to beating out
  fires by hand. A crew standing on a burning cell has a coin-flip chance of being lost.
- Engines drive to the nearest fire near town and spray. Each carries 20 units of water and
  has to go back to the station to refill. Wet cells (blue) resist ignition for a while.
- The air tanker lays a line of retardant (pink) across the fire's approach to the most
  threatened town. Sorties are limited.
- Why they lose: ember spotting from burning trees can jump a one-cell break (worse with
  wind), fire can flank the arc, crews can be too slow or too few, and stations run dry.
- Townspeople who are not warned in time do not always make it out. Unwarned towns lose far
  more people than ones that had rallied before the fire arrived.

The dispatch log on the right narrates each run. Stats show buildings and population left.

## A living world

Leave it running. Nothing is static.

- **Regrowth.** Ash greens up into grass, grass seeds into pine where there are trees
  nearby, pines grow into big pines, oaks spread slowly, stumps crumble, and old
  firebreaks grass over. Roads stay. The regrowth slider scales all of it.
- **Weather.** The valley drifts between clear, drought, rain and storms. Drought makes
  everything tinder and doubles ember throw. Rain damps spread and puts fires out. Storms
  bring natural lightning, the original assignment's ignition source. You can force a
  weather state or leave it on auto.
- **Towns grow.** Between fires a town's population rises, it fills in and then expands
  outward along new roads until it reaches the size cap you set. Rubble gets rebuilt.
  At around 35 people a town builds a fire station and buys an engine, buying more as it
  grows. A prosperous town with a station may open an airstrip. Nobody starts with
  aircraft. Sorties regenerate slowly.
- **Settlers.** Every so often a wagon appears at the map edge and heads for open ground
  to found a small new town, or for a dead town to resettle it. Wagons that drive into
  a fire do not arrive.
- **Ignitions.** Rare, so there are long stretches of calm: lightning in storms, a campfire
  or burn pile that got away (far more likely in a drought), and every town has that one
  person.
- **Large pines** burn longer and resist ignition a little more than small ones.

Nothing is toned down. Towns get wiped out and rebuilt. The log keeps the last 60 events.

## Wind, crown fire, and looking closer

- **Wind follows the weather.** On Auto the wind drifts and swings with fronts, stays light
  on clear days, blows steady in a drought, and gusts hard in storms. The corner readout on
  the map shows weather, a wind vane, and strength. Click any compass arrow or drag the
  strength slider to take manual control; the Auto button hands it back.
- **Crown fire.** Burning timber with enough heat around it can flare into the canopy,
  far more readily in wind or drought. Crown fire burns white-hot, spreads harder, shrugs
  off wet ground, runs along the tree line, and showers embers two to three times farther
  ahead of the front. Crews bail when it is next to them and engines struggle with it.
- **Regrowth waits.** Burnt ground stays black for 50 to 110 ticks before anything
  greens, and each succession step waits its own delay. Meadows from the original terrain
  never grow trees.
- **Settlers find their way.** Wagons use real pathfinding, wait for fire to clear, and turn
  back if there is no route. Crews and engines give up on targets they cannot reach.
- **Up to eight living towns** at a time by default (the slider goes to twelve). Dead towns do not
  count, and settlers prefer to resettle them.
- **Settlements panel** lists every town with population, homes, radius, engines, deaths,
  homes lost and fires survived. The same numbers sit under each town's name on the map.
- **Roads have shape.** Each town rolls a layout: crossroads, T junction, L bend, a single
  main street, a Y fork, an X, or a six-spoke star, sometimes with a ring road. Houses,
  stations and strolling townsfolk follow the real road cells.
- **Settlers are the population.** A wagon carries 8 to 28 people, occasionally a caravan
  of up to 70. A founded town starts with exactly those people, and empty houses until
  they grow into them.
- **Dragon.** Rarely, and drawn to the richest towns (weighted by population squared), a
  dragon crosses the map, makes several passes over a town breathing fire, ignores wet
  ground, and leaves. There is no button for this. It just happens sometimes. Sorry.
- **Shareable seeds.** The Seed field in the Terrain group shows the current valley's number.
  Type a number or any words and press Enter (or Load) to rebuild that exact valley, towns
  and all. Copy link puts `?seed=...&size=...` on the clipboard, and the address bar always
  carries the current one. Same seed, same map. What happens next is still up to the dice.
- **Save and load.** Slots are kept in the browser's IndexedDB on this device (older localStorage
  saves are migrated in), so they survive reloads but not clearing site data, and they do not
  follow you to another device or browser; export a file for that. The Save / Load group has three browser slots plus an autosave that
  writes itself every minute while running. Export file downloads the whole world as
  `wildfire-<seed>-t<tick>.json.gz`: plain JSON inside gzip, so it is small (about 7 to 1, a 100 x 100
  world is around 30 KB, the default 200 x 200 about four times that) and still readable with any gunzip. Import file loads one back, paused,
  with every slider and toggle restored. Saves carry terrain, fire, wet cells, towns with
  their crews and engines, weather, wind, settlers, dragon, the log and your settings.
## Towns have politics

- **Alignment.** Every town rolls Lawful / Neutral / Chaotic and Good / Neutral / Evil at
  founding. Lawful towns rally faster and raise stone walls (which also stop fire). Evil
  towns breed more arsonists. Chaotic turnout swings wildly. Good towns get more people out
  of burning homes and send fire crews to help allies.
- **Militia** grows toward a share of population (higher for lawful and evil towns, and
  with military tech). Soldiers are people, so losses are deaths.
- **Relations** between every pair drift with compatibility and random diplomacy events
  (trade pacts, weddings, grazing quarrels, insults). Fall far enough and an evil or chaotic
  town declares war. Rise high enough and the towns are allies.
- **Raids and war.** Warbands march along real paths. Winners torch homes and carry people
  off; losers die at the wall. Wars end in truce when both sides are spent.
- **Technology, bows to the bomb.** Research trickles in with population (never slower than
  a town of forty would manage, so a hamlet still learns), faster with a forge, a factory,
  a university, spare electricity or a scholar in charge, and slower in a brownout. It is
  split between two tracks by temperament, but never less than 15% to learning, and a track
  that has its points and is waiting on a resource gets nothing more: the effort goes where
  it can still be spent. Each step needs a cumulative total and then a one-off payment.
  A town that has the points but not the goods treats that as a shortage, like a player
  would: it digs for the ore first, sends more people to the quarry, buys it first at
  market, and holds back what it needs from ordinary building.

  | Arms | points | pays | gives |
  |---|---|---|---|
  | Bows | 0 | | |
  | Steel | 300 | 10 iron | a barracks, a forge, a stronger militia |
  | Siege engines | 900 | | engines lob fire over the wall, stone walls (fire cannot slip through a wall's diagonal joints, though embers still fly over), a second barracks |
  | Gunpowder | 2000 | 8 coal | guns in the ranks, raids torch more |
  | Rifles | 4000 | 15 iron, and a powered factory | can bring a dragon down, a factory, uranium mines; nobody good goes further |
  | Artillery | 7000 | 20 iron | shells an enemy from home, tanks on the march, an air base with bombers |
  | The Bomb | 11000 | 20 uranium, and a university | a silo, a reactor, and a bomb for 40 uranium |

  | Learning | points | pays | gives |
  |---|---|---|---|
  | Buckets | 0 | | |
  | Fire brigade | 250 | 10 wood | crews cut line faster, a water wheel, a boiler, tenements, a forge |
  | Waterworks | 700 | 8 copper, 10 stone | fireboats, bigger fire trucks, a cistern, a university |
  | Lookout tower | 1500 | 6 stone | a watchtower that spots fire further, a dam, a factory, uranium mines |
  | Geology | 3000 | 12 iron, 8 copper | surveys for deep ore and oil, shafts and derricks, solar, a reactor, motor pumps |
  | Aviation | 5000 | 10 oil, 20 iron, 10 copper | an airfield with more planes and sorties, fighter jets at the air base |

  Good towns stop at Rifles and never build the bomb. Artillery lets a town shell an enemy
  from home. The bomb flattens a town, leaves fallout that kills slowly, blocks regrowth and
  building, drifts downwind, and turns the sky to ashfall. The town that drops it has no
  idea. The town card shows each track's progress and what the next step is waiting on.
- **Dragon defense.** A big militia can drive a dragon off. With rifles or better it may
  bring one down, and the hoard draws newcomers and a burst of research. A town that knows
  aviation and has an air base keeps a jet or two (six iron, six copper, four oil each) and
  scrambles one when a dragon comes for it or for a close friend. The jet makes cannon
  passes until the dragon is down, the jet is caught in its breath, or the dragon leaves.
  Jets burn with the base.
- **Refugees.** Survivors of a destroyed town take to the road for the friendliest living
  town.
- **Organic towns.** Footprints are lumpy and growth hugs the streets. New roads get built
  as towns grow.
- **Buildings.** Tech and population unlock real structures, placed beside roads: town hall
  (100 people), barracks (militia, drilling soldiers you can see), forge and university
  (research), factory (research, smoking stacks, and the odd industrial fire), watchtower
  (detection), missile silo (where the bomb launches from), and tenements that house 20
  instead of 6 once masonry is known. Every one of them burns.
- **Battles you can watch.** When a warband arrives, two lines form up (defenders on the
  wall if there is one) and trade volleys: arrows, crossbow bolts, musket smoke, or gunfire
  depending on tech. Soldiers fall. Siege engines and artillery lob fire into the town while
  the fight goes on. Outcomes are overrun (homes torched, captives taken), held, or
  withdrawn, and a lawful-evil conqueror with the numbers may annex the place outright.
  Gunpowder towns march with field guns, artillery towns roll tanks that shell the
  defenders' line (ten iron and two oil each; no oil, no tanks). An artillery town with
  oil in store lays out an air base and builds up to three bombers in its hangars. At war
  they fly sorties over the enemy, two oil each, and drop a stick of bombs. Riflemen below
  can bring one down, a bomber that comes home to a burnt base is lost, and if the base
  burns the bombers burn with it.
  Columns that march into a wildfire take losses and re-route.
- **Settlements panel** shows alignment, militia, walls, tech, buildings, wars, allies and feuds.

## The land itself

- **Elevation.** Every cell has a height, shown as a subtle hillshade. Rock sits on the tops,
  lakes in the hollows.
- **The river finds its valley.** Instead of a wobbly line, the river is a least-cost path
  from a high point on one edge to a low point on the opposite edge, so it follows the low
  ground. Every river cell knows which way it flows (Shift+hover shows it). Sometimes a
  tributary joins from a third edge.
- **Beavers.** A colony appears on a wooded stretch of river, chews for a while (you can
  see them), and finishes a dam. The ground upstream below the new water line floods into
  a pond, which is a firebreak until fire reaches the dam or the beavers move on, after
  which the pond drains to mud and the mud dries to grass.
- **Floods.** Rain or storm over a river whose banks are burn scar makes the river burst its
  banks: low ground beside it goes under, buildings in the way are flooded out, and it
  drains to mud when the rain stops.
- **Bridges.** When a town's road hits a short span of water with land beyond, it throws a
  wooden bridge. Bridges carry warbands, settlers and wagons, and they burn.
- **Farms and food.** Towns clear fields on open ground beside their roads. Each farm feeds
  twelve, fishing boats add a little, foraging covers a few, and the weather and season set
  the yield. Growth is capped by food as well as housing. Too many mouths means famine:
  people die slowly until the fields catch up, and drought cuts the harvest nearly in half.
- **Seasons.** A year is 1,200 ticks: spring (rain, fast growth), summer (drought and fire
  season), autumn (harvest), winter (snow: fire barely spreads, nothing grows, the stored
  harvest carries the town). The HUD shows the season and a fire danger rating.
- **Trade roads.** Allied towns build a road between them, bridging the river if it is
  short, and wagons run it. Each delivery feeds both ends and shares a little learning.
  Plague rides the wagons too.
- **Chronicles.** Click a town in the settlements panel for its own history.
- **Achievements.** Dozens of badges, unlocked by things that happen in the valley, plus a
  dozen tiered ones (trees burned, biggest town, years run, dragons slain, criminals caught,
  caravans, trees felled, harvests, buildings raised, lightning strikes, uprisings, bombs
  dropped) that show the highest tier reached and the next mark. Stored in this browser.
- **Dragons have names** ("Solul the Twilight", "Kazgon Hoardlord"), are rare (see below), and a dragon
  driven off remembers the town that did it. **Sacks** now burn a third to two thirds of a
  town, wreck its workshops, carry people off, and an evil conqueror puts more to the
  sword. A town left with nothing is razed.

## More life

- **More towns, softer cap.** The Max living towns slider (default 8, more on big maps)
  replaces the hard limit of three. The radius slider is now a *comfortable* radius: towns
  can grow past it, but each extra ring is harder to add, and big cities pay: plague in the
  crowded streets without a waterworks, riots in sprawling chaotic cities, and kitchen
  fires on the far edge that nobody notices. The panel marks such towns as sprawling.
- **Tanker loyalty.** The airstrip's town will not fly for a town it is at war with or
  hates, and it favours itself and its allies.
- **Dragons are worse.** Wider breath, crews caught under it burn, it takes several hits to
  drive one off, and a sortie may rampage across two or three towns. A dragon that is driven
  off remembers, and tends to come back for the same town.
- **Fire from the sky.** Dry lightning storms (purple sky, no rain, high wind) spin out of
  droughts. Very rarely a meteor falls, blasts a crater, and scatters fire around it.
- **New fuels.** Birch grows by the water and burns fast. Dry scrub covers thin ground and
  flashes over in a tick or two. Ancient oaks and big pines occasionally die standing into
  snags that catch from almost anything and throw embers.
- **Boats.** Fishing boats drift on the lakes and rivers. A town with a waterworks beside
  the water launches a fireboat that sprays shore fires from the river.


- **Shift + hover** over any cell to inspect it: terrain, fuel, fire state, wet or
  retardant timers, regrowth countdown, ground quality, which town it belongs to, and who
  is standing there (crews, engines, townsfolk, settlers).

## Resources

Nothing is free any more. Every house, field, workshop, engine, wall, tank and bomb is paid for
in wood, stone, iron, copper, coal or uranium, and so is every rebuild after a fire, which is
what paces a town's recovery.

- **Wood** comes from the forest. Loggers in red walk out to the nearest tree, fell it (the
  tree really goes, leaving a fresh-cut stump that rots back to grass and regrows), and carry the timber home. A lumberyard
  raises the storage cap and fields more loggers, and the clear-cut around a busy town is
  visible on the map.
- **Stone** comes from a quarry opened at a rock face, worked by quarriers. On big maps towns
  send quarriers and miners further for it, and the trips take longer.
- **Iron, copper, coal and uranium** are seams in the rock, drawn as flecked outcrops. A town
  digs a mine beside a seam and miners in yellow helmets walk the ore home two units at a
  time. Seams are finite; when one is dug to nothing the mine is worked out. Uranium is rare
  and only a town that knows what it is will dig for it.
- **Water.** A town needs a river, a lake or a well. Without one it stays small, and a drought
  kills. Wells draw on a finite aquifer, only as fast as the cistern can take it; a well holds
  a few years of thirst, refills in rain and seeps back slowly. A town that has been thirsty,
  or watches a drought set in, builds a cistern (sixty water) and, once it knows waterworks, a
  water tower (a hundred and fifty), and the carriers work to keep them full.
- **Power.** Water wheels, boilers that burn coal or, failing that, timber (an early and easy
  road to electricity: a powered town learns faster and can open a factory sooner), hydroelectric dams on the river (weaker
  in drought and hard frost), solar arrays that follow the sky, and reactors that burn uranium
  feed factories, universities, waterworks and silos. A brownout slows research. A reactor
  that burns down or falls to an army melts down and poisons the land around it for years.

Stockpiles are small, so towns save up for the next building and sometimes announce what
they are short of. Research alone is not enough: steel needs iron, gunpowder needs coal,
artillery needs a powered factory, and the bomb needs a university, a silo and forty
uranium. Allied wagons carry whatever the other town is short of. A sacked town is looted and
an annexed one pays tribute. A militaristic town that cannot reach a metal its neighbour
digs comes to covet it, relations sour, and the war that follows is declared over the seam.

## Trade

Every town keeps a chest of coin, and coin only comes from selling: to caravans on market days,
to other towns that pay for wagon deliveries, or from gold. Half of valleys have a small gold
seam; a town that digs it and has a hall and a forge mints coin from it, and caravans pay well
for raw gold. There are no taxes, so wealth is slow and uneven. Now and then a trader's caravan
with an amber canopy appears on a map edge, walks in to a town, holds a market day, and leaves.
It sells what the town is short of (iron, oil, even a little uranium) for coin, and buys the
surplus. An evil town with enough militia sometimes just seizes the caravan, and then no trader
comes for a long while. Fishing boats land their catch at the nearest town; fish feeds people
and sells.

A town with geology and a university sends out geologists, who find oil fields and deep seams
hidden under ordinary ground. A derrick or a shaft on a surveyed pocket pulls it up without
anyone walking, as long as the town has power. Oil is what fuels the modern age: tanks and
bombers run on it, the air tanker burns two per sortie and is grounded without it, and
aviation itself cannot be learned without hydrocarbons. Roads between allied towns are built by
a crew that walks the route laying it cell by cell, paid in stone and bridge timber; work halts
when the stockpiles run dry, and wagons only roll once the road is finished.

## Seasons and snow

The year is 1,200 ticks long and every tile wears the season. Spring is fresh green with
fields sprouting, summer is the base art, autumn turns the grass gold and the oaks and
birches to flame and amber, and winter leaves dead grass, bare twiggy hardwoods and dark
blue-green pines. The change arrives a few tiles at a time, scattered across the map, over
the first hundred ticks or so of the season, so autumn comes tree by tree. A pill in the
HUD names the season.

Snow is real. Flakes of three sizes drift down with the wind, and every cell keeps a snow
depth. Snowfall builds it a little unevenly, so cover comes in ragged: caps on crowns and
roofs first, then drifts along the ground, then the whole valley white. Trees keep their
dark middles so the forest still reads under deep snow. Water freezes over, boats are
locked in, and nothing ripples until the thaw. Fuel under snow barely takes a flame, nothing
regrows beneath it, and the HUD shows the share of the valley under cover. Melt depends on
the season and the weather: almost nothing in a clear winter, fast in spring rain, and high
ground holds its snow longest. Ground that has just thawed is damp for a while, which is why
early spring fires fizzle. Shift+hover a cell to see its snow.

## Biomes and climate

The valley is not one forest. High ground is pine highland, wet low ground is broadleaf lowland
or marsh with reeds and pools, the dry side is scrubland, the driest is desert, the hottest and
wettest is jungle (huge trees that are hard to light and burn for ages when they do, ferns, a
canopy that closes over fast, and fever in crowded towns without waterworks), and the rest is
mixed forest. Each has its own trees, its own regrowth (marsh comes back as reeds and birch,
desert ash goes back to sand unless water is near), its own fire (scrub and desert brush burn
fast, marsh barely), its own harvest, and its own beasts. Every tile carries a faint cast of its
region, and Shift+hover names it.

Each valley also rolls a climate first. Most are temperate and varied; some are dry, wet, cold
or all forest; some are desert end to end; and a split valley runs a moisture gradient across
the map so one side is desert and the other forest, while a ridge valley runs a cold one. In
desert country a plot is only plantable where there is water within reach to irrigate it, so
towns cling to the river and the watering holes, and nothing grows on open sand. In a drought,
fields with no water within reach wither back to scrub, three times as fast in the desert. The History
facts block names the climate, and the trees tile shows the biome shares.

- **North and south.** Whatever the climate, the top of the map is colder than the bottom: the
  highland biome reaches further down in the north, jungle only grows in the south, snow falls
  thicker and lies longer in the north and goes first in the south, northern lakes freeze first,
  and crops grow faster the further south the field is (turnips excepted).

## Travel

Walking speed depends on the ground: a road or bridge is the fast way (over one and a half
cells a tick), open ground is a cell a tick, scrub and reeds slow, forest and marsh slower,
jungle slower still, and deep snow slows everything. Trucks and crews feel it too. A town
that opens a quarry, mine, derrick or shaft a long walk away sends a crew to lay a road out
to it, paid in stone, and every trip after that is faster. Shift+hover says whether a cell is
fast or hard going.

## Beasts

Herds of deer, wild boar, wild sheep, grouse and the odd aurochs roam the open ground, run
from fire and die in it, breed slowly, and wander on and off the map over its edges. Hunters in green stalk the nearest herd,
take an animal, and carry the game home; small herds are left to recover. Now and then the
animal comes home alive, and that is how a town first gets pigs, sheep, chickens or cattle.
Caravans sell livestock too. Beasts need a fenced pasture, breed when there is room, feed the
town, burn with the pasture, and are driven off in a sack.

## The ledger

Hover any tile in the readout under the map; the breakdown opens upward. Beasts lists the
wild herds by kind and every town's livestock. Population lists the towns largest first with
each one's share of the living and its own survival rate, and shows who died and of what (fire,
famine, battle, plague, thirst, fallout, dragon fire, put to the sword) and in which town.
Buildings shows what was lost and why. Tick shows the whole history of the valley: lightning
strikes (natural and yours), missiles, meteors, floods, beaver colonies, dragon visits, wars,
battles, sacks, annexations, bombers, nukes, meltdowns, famines, plagues, caravans, and the
beasts.

## The folk

Every town has named people: an elder with a trait (see Leaders), a fire chief, a hunter, and
that one person. Each has
an age and a one-line backstory, and the log remembers what they do: the elder signs the war
order and shakes on the truce, the chief leads the crews, the hunter brings home the first
pigs, the geologist finds the oil, and whoever strikes the last blow on a dragon is named for
it. The firebug is anonymous until the third fire, when the town may run them out. People die
of what kills everyone else, and of old age, and the town chooses someone new. Click a town
in the Towns tab to meet them. The History tab's facts block lists the oldest living
resident, the unique dragons seen by name, the biggest town ever, the deadliest cause, and
the counts of everything from beaver dams to caravans robbed.

A year is now 2,400 ticks, so a season lasts a while even at speed.

## Leaders and unrest

Every elder has a trait, and the trait steers the town, right or wrong: a warmonger declares
war readily and raids twice as often, a peacemaker talks instead and settles wars early, a
builder raises frames faster, a fiscal conservative buys almost nothing at market, a hoarder
keeps the gold where the dragons can see it and draws them (and dragons are hoarders too: every
pass over a town takes a share of its coin and all its gold for the hoard, which the town that
finally slays one wins), a merchant gets caravans and trade
roads sooner, a scholar researches faster, a hermit wants nothing from the neighbours and sends
no aid, a tyrant skims the chest and raises unrest, a madman empties the granary for a feast or
sets a field alight or declares war over an insult nobody heard, a green thumb grows crops half
again as fast, a fire warden turns out more crews and sees fire further off, a beastmaster
breeds and hunts more, a prophet refuses the new learning but builds towers, and a drunkard is
beloved and sometimes falls asleep with the lamp lit. Traits are weighted by the town's
alignment, so evil towns get tyrants and warmongers, chaotic ones madmen.

The people answer. Famine, thirst, war, deaths and tyranny raise unrest; bread, peace and a
loved elder lower it. Past seventy percent the town revolts: the elder is run out or hanged, the
militia breaks up, a house may burn, and a new elder with a different trait takes over. The
Towns tab shows each elder and the mood.

Granaries are buildings now: a town stores sixty grain and each granary adds a hundred and
twenty, and a town that outgrows its stores raises another before it builds more houses.
Anything above what a town can store rots. There is no artificial cap on how big a town
grows; timber, food, water, plague and sprawl fires are the limits.

## Law and order

Crimes breed from the town's condition and each one gets a face. A hungry town has someone at
the granary in the night; a restless one loses grain from a full store; a fat treasury under a
resented or grasping elder gets its coin room robbed; and the hidden fire-setter every town has
sets a blaze on the edge of town more often when unrest is high. A constable, named like the
rest of the notables, takes up the case and walks the streets while the culprit keeps to the
edges and runs when the law comes near. The roll to catch them favours militia, a watchtower,
a fire warden and a lawful town, and goes against a town so restless that people hide them;
most cases close inside a few hundred ticks, and some go cold.

The sentence is the town's law bent by whoever is in charge. Lawful good means a trial and the
gaol (built once a town has a convict to put in it); lawful neutral means hard labour at the
quarry, which is free stone; lawful evil means the rope. Chaotic good banishes, chaotic neutral
leaves it to the mob, chaotic evil hands them a spear. Neutral towns fine. A tyrant hangs
everyone, a peacemaker pardons, a merchant fines, a warmonger presses them into the ranks, a
builder puts them to work, a prophet casts them out, and a madman has been known to make the
arsonist fire chief. Good towns usually forgive a hungry thief. A hanging frightens off
arsonists for a while and sours the mood unless the victim was feared; a gaol discourages them
for good. Convicts come out changed, or not. The card shows the law, the open case, who is
serving time, and the town's record; the ledger counts crimes, captures, hangings and
banishments.

Justice goes wrong the way it does. When nobody saw who did it, the constable takes whoever
looks right, and about a quarter of the time that is the wrong person, more under a tyrant or in
a chaotic town, less with a watchtower. The fires go on, and when the real culprit strikes again
the town realises what it hanged or cast out: unrest jumps, the constable's record carries it,
and in a good town the constable hands in the badge. A merchant's elder can be bought: a purse
changes hands and the thief is home by supper. A tyrant has people seized for a word said at the
well, and a grudge is reason enough. Petty thieves and smugglers in a mild town stand a day in the
pillory. Kin break a gaoled convict out at night; the town posts a bounty, and a neighbour that
hands the fugitive back claims it. A thief the law could not hold twice takes to the woods with a
few hard cases: the gang camps above the town, stops caravans and wagons on the road, raids the
town's edge, and in time a posse rides out from the town to a fight in the trees. A new elder in
a good town often opens the gaol as a first act, and a festival brings mercy too.

War brings its own crimes. A losing or restless militia loses a captain and a few soldiers who go
over to the enemy in the night; caught before they are past the town's reach, it is treason, and
only a peacemaker or a chaotic good town lets them live. An enemy at war sends a spy to live
quietly in town: while unfound, the enemy raids more readily, torches more when it wins, and
learns what the town learns; a lawful town with a constable and a tower finds them sooner. Under
a grasping elder, or in wartime, goods leave the stores by the back road after market day, and
sometimes something nobody paid for turns up instead; chaotic towns mostly look the other way.
A fugitive with a long head start slips off to a neighbouring town, which sends them back in
chains if it is lawful or friendly and otherwise keeps them, at a cost to relations. Arsonists who
are banished, or whose trail goes cold, do not vanish: they wander the woods and years later set a
fire on the edge of somebody's town.

## Medicine

A town that knows Fire brigade opens a healer's house (wood and stone), staffed by a named healer,
and with Waterworks and a hundred and fifty people a hospital, which needs a little power. Foragers
gather herbs from scrub, reeds and jungle in spring and summer, caravans carry them, and the
healer's shelves hold only so much. Herbs are spent to save people: a healer pulls about a third
of the dead through a plague, a battle or a dragon's visit, a hospital half, a physician in charge
more, and only the hospital does much against the sickness that follows a bomb. One handful of
herbs saves four; an empty shelf means the healer can only watch, and the log says so. Elders live
longer with a healer in town. Plague carried along a trade road is milder where there is one.

## The town card

Click a town on the map (or its row in the Towns tab) for the whole picture: who runs it and
what they are like, population alive, dead and ever, homes and housing, militia and unrest,
whether it is fed and what it eats, fields and granaries, water and wells, every store with
its capacity, coin, its workshops, power, arms and learning, who it is at war or allied with,
every named resident with a bio and last deed, and its latest chronicle. Buttons fire a
missile or a lightning strike at it, or jump to its line in the history. Escape closes it.

## Generations, beasts, sickness, politics, and the hand of god

Children are born to the notable families, grow up in a parent's shadow, come of age at
sixteen, and sometimes carry a parent's trait on. In a lawful town the elder's chair often
passes to kin, and when two claimants want it and the town is restless there is a crisis, a
grudge, and sometimes a house alight. Wolves come down in hard winters: packs take sheep from
the pastures and the odd forager from the woods until the hunters and militia go out after
them; a bear lives in the deep timber and the hunters bring it down for a month of meat. Marsh
towns get the fever in summer, a cistern left too low breeds cholera, and a sick town shuts its
gates: no caravans, no wagons, no refugees until it passes. Friends come into a war on their
ally's side. Every few years the biggest town calls a council and envoys walk in from the rest;
it ends a war, agrees a road, sets a shared fire watch, collapses in insults, or just feasts.
A big, restless, lawless town can tear itself in two in the streets. A revolt builds in the open: from seventy unrest a crowd stands outside the hall and grows with the mood, the log says so, and the odds of the people rising climb from two per cent a growth tick at eighty to twelve at a hundred. When it comes, the elder is dragged out and walked to the gallows, or to the gate and out into the woods as an exile, in front of everyone.

Acts of god are truly rare and change the map. An earthquake cracks walls, brings houses down,
breaks dams into floods, and throws up a ridge of bare rock or opens a rift that fills with
water across the land, so the old paths no longer go through. A comet falls as a second sun and
leaves a crater lake in a ring of rock, burns everything for a long way round, and brings a year
of ash in which the crops barely grow. Its shockwave levels any town under it, brings down a third
of the buildings half the map away and a tenth at the far edge, and lays the forest flat around the
crater. It
comes perhaps once in a long lifetime, and never in the valley's first ten years. The crater's ring is worth digging: sky iron, copper,
sometimes gold, and now and then a trace of something that hums, and an earthquake's ridge
can expose a seam too. Every town within a walk will want it.

## Stone, crafts, jobs and the larder

- **Dragons are rare.** The odds rise with the valley's riches but level off, so a rich valley
  sees a dragon about once in five years, never twice inside two, and never in the first year.
  A driven-off dragon still comes back for the town that wounded it, once the cooldown has passed.
- **A third tech ladder: hearth and craft.** Alongside arms and civil learning, every town works
  up through Smoking, Masonry, Milling, Root cellars, Brewing, Cookery, Orchards and Mastery.
  A food-minded elder's town learns its kitchen first. Each step opens a building or a way of
  eating, and the town card shows what the recipe is waiting on.
- **Stone buildings.** With masonry and a quarry a town builds its civic works in stone, raises
  stone houses by temperament, and refaces timber houses one at a time when the stone is there.
  Stone ignites at an eighth of timber's odds, throws no embers, warms its neighbours half as much,
  and takes dragonfire badly but takes it: a dragon's pass over a stone quarter lights two or three
  roofs instead of a dozen. A stone building that does burn leaves a standing shell that wants only
  a roof. A town that loses a quarter of its homes in one fire (a lawful town, a sixth) and knows
  masonry adopts a **building code**: no more thatch, every new wall in stone. London did the same.
  Quarries scale with population to feed it.
- **Citizens have jobs.** Every growth cycle a town divides its people among trades by what it has
  to work with and what it is short of: farmers, fishers, hunters, foragers, water carriers,
  loggers, quarriers, miners, builders, masons, bakers, smokers, cooks, brewers, smiths, haulers,
  traders, healers, constables, militia, full-time soldiers, the young and the old, people keeping
  house, and the idle. The counts are the truth; the walkers you see are a sample of each trade,
  dressed for the job. Haulers shuttle goods from the works and speed them in; a staffed forge
  with iron puts better tools in everyone's hands; wagons need a trader to drive them and traders
  haggle better at market. Spare hands are not left standing about: they go to the fields, the
  woods, the sites, the shore and the quarry, so land, timber and rock are the limit rather than
  people. Fully staffed fields ripen a fifth faster and surplus farmers clear new ground. What is
  left keeps house; the few truly idle raise unrest and push the town to build a workshop. The
  town card has a **work** grid and the history plots have *at work*, *idle hands* and *spirits*.
- **Soldiers.** With steel and a barracks a town keeps up to twelve full-time soldiers per
  barracks. They drill, they hold the line first and fall first, and they are worth two of the
  levy. A town with drilled soldiers raids harder too.
- **More game.** Twice the herds, elk in the highlands, hares everywhere (trapped, not stalked,
  and they breed like hares). In the first weeks of autumn the herds come down from the hills and
  the wolves follow them. Deer are fat in winter and lean in spring.
- **A fresh stream, always,** and on a third of maps a **spring** rises inside the valley: a cell
  of rock with water in it that never freezes and never runs dry, which the town beside it drinks
  from. Every autumn the **salmon run** and fishing on the river is half again as good.
- **Fishing is a trade.** A fisher's hut on the shore puts fishers to work along the water; a town
  of sixty with timber to spare launches its own boat, whose catch comes home. In winter the
  fishers walk out onto the ice, cut a hole and sit over it: six tenths of a summer catch, and the
  only fresh food in a hard winter. Thin ice takes one now and then.
- **The larder.** Food is seven stocks eaten fresh first: fish, game, hot meals, fruit, bread,
  grain, and jerky last as the winter reserve. A **smokehouse** turns two fish or game into three
  jerky for a stick of wood, double shifts in autumn, and keeps the smokehouse cold when the
  woodpile is empty. A **mill** on the river and a **bakery** turn two grain into three bread (half
  as much without a mill). A **root cellar** halves spoilage and adds grain storage. A **brewery**
  turns barley into beer, which is not eaten but calms a town that has an inn, draws a bigger
  festival crowd, and makes caravans pay more. An **inn** with cooks turns bread and jerky into
  three hot meals, better with fruit on the table. **Mastery** makes every conversion two-to-four
  and lays out a feast at the harvest festival, named dish and all. Every workshop's first batch
  is logged, and the first person to run it gets a name and a story.
- **Five crops.** Wheat; barley (shrugs off drought, feeds the brewery); turnips (frost-hardy,
  the only crop that grows in winter, better in cold country, planted after a famine); orchards
  (slow to establish, fruit every autumn, and they burn like the trees they are); and tobacco on
  warm dry ground. Fields wear their crop's colours.
- **Spirits.** Alongside unrest (how a town feels about its elder) every town has spirits (how life
  feels). Beer at the inn, hot meals, fruit and bread in the larder, a pipe after work, festivals
  and feasts lift them; hunger, thirst, deaths and a dry inn sink them. High spirits calm a town,
  draw newcomers and help the workshops think; low spirits send families walking to wherever the
  inn is open. The inn pours a cup for every sixty people a cycle, so the brewery has somewhere to
  send its barrels and a town that has known beer feels it when the vats run dry.
- **Drink.** Where there is beer, a few are at the inn instead of at their work (the town gets a
  little less done), you can see them with cups at the door of an evening and wandering home
  crooked, and one makes a name for it: the **town drunk**, who falls in the river, sleeps in the
  smokehouse, sings under the elder's window, starts the odd brawl, knocks a lamp over at the
  inn, swears off drink in front of everyone, and now and then is found on the ice.
- **Tobacco.** A little never hurt anyone, they say. A pipe after work lifts spirits and caravans
  pay well for the leaf; the healer's ledger shows the cough, which a healer's house halves.

## Trade reach, borders and factions

- **Roads reach further.** A town with traders to drive the wagons and a hall to plan it builds
  roads to towns up to 95 cells away, and towns of one faction further still. **Through-trade:**
  every so often a long wagon crosses a neighbour's roads to reach a town two or three roads on,
  carrying what the far end is short of and paying a coin in toll to every town it passes through.
- **Borders.** Every town claims the ground around what it has built: each building, field and
  work site holds a few cells about it, a little more for a town with a hall or a great many
  buildings, so an outlying quarry holds its own patch and a faction's land need not be one piece. Claims are drawn as thin coloured lines, one colour per
  faction, and nobody builds on another faction's ground.
- **Factions.** Every town starts as its own. A conquered town follows its master into the
  master's faction; two allies with a road between them and no war may unite under the larger.
  Towns of one faction never fight each other, hold each other close, go to war together, and are
  listed together in the settlements panel under their banner, ruler and government.
- **Governments.** When a faction first holds two towns its capital's elder and alignment decide
  what it becomes, and the town elders stay as they are beneath the new ruler:
  - a lawful good capital makes a **Kingdom** under a King or Queen; the crown passes to kin, and a
    ruler who dies without an heir leaves a succession crisis in which towns may walk away;
  - a lawful capital that is not good makes a **Dominion** under a Dictator, who rules until a coup
    (when the faction's unrest runs high) or an assassin removes them, and raises the levy;
  - a good capital that is not lawful makes a **Republic** under a President, elected every two
    years by the member towns, each vote weighed by its people and their spirits; a tyrant in the
    capital may steal the count, and everyone knows;
  - a capital that is neither makes a **Horde** under a Supreme Leader, for life and revered, who
    purges the towns every few years and raids harder; on their death the strongest town's
    captain seizes the seat;
  - a prophet elder makes a **Theocracy** under a High Priest chosen by omen, with twice the feast
    days; a merchant elder makes a **Merchant Republic** under a Doge elected by coin, with faster
    wagons and better prices.
- Towns that cannot bear a dictator or a supreme leader break away, and the capital goes to war
  to bring them back. A faction whose capital falls dissolves.

## The log does not repeat itself

The common events (alarms, stand-downs, famine, plague, growth, markets, caravans, arson, wars,
battles, dragons, lightning, settlers) are said one of several ways, never the same way twice
running, and coloured by the hour, the weather, the season, the elder in charge and the town's
mood. Towns remember what defined them lately (a hanging, a famine, a dragon, a great fire, a
war, a plague, a festival, a wedding, a sack, a revolt) and the log calls back to it: "It is two
seasons since the hanging of Wren Fenwick." People come in families: a new notable is often kin
of someone already in town, a constable's child tends to follow in the job, and a family
remembers a hanging or a banishment. Kin who hold a grudge push unrest up, and the next thief or
fire-setter is often one of them, until a revolt settles the score.

## Everything has a body

No line without a figure on the map. A sentence is a walk: the constable brings the prisoner to
the gallows (raised in the square the first time a town hangs someone, and it stays), to the gaol,
to the quarry where the convict works a real shift every day, or to the edge of town, with a crowd
gathered for a hanging. Exiles walk into the woods and live there; in time they knock at another
town's gate and are taken in or turned away, and winter finds some of them. Deserters march as a
band of soldiers that the constable can ride down on the road. A spy snoops around the barracks,
the hall and the granary looking like anyone else, and every so often slips out toward the enemy
and back, which is when they are easiest to catch. Diplomacy is an envoy on the road, and a
wedding is a party that walks to the other town and a person who stays there. Healers walk house
to house during a plague. Market day draws a crowd to the square; the last weeks of a good autumn
bring a harvest festival with a bonfire that now and then gets away. Towns lay out a graveyard that
grows with their dead, bury their notables, and raise a statue to a dragonslayer.

## Watching

Every log line knows where it happened: click it and the view jumps there at a close zoom with
a ring flashing on the spot. Lines about something on the move carry a follow arrow: a dragon,
a caravan, a column of soldiers, a bomber or a jet, a fugitive and the constable after them, a
roaming firebug, settlers on the road. Following keeps the camera on them until they are gone,
you pan, or you press Esc. The town card's recent-events list works the same way.

## The sidebar

Five tabs: Play (run, ignite, dispatch, save and seed), Towns, History, Settings (world,
fire, wind, terrain and the legend) and Info (achievements and the notes). The running log
sits under the map so you are always in tune with the world.

The History tab draws sand plots, and a full-screen button blows them up to the whole window
(Escape closes): every town is a layer, stacked, from its founding to its
end, so a town that dies shows as a band that narrows to nothing. Pick population, homes,
militia, coin, food or stockpile; click a town to hide it, double-click to see it alone, tick
"hide dead towns", and hover the chart to read the numbers at any tick. Press H to jump there.

Hotkeys: `[` and `]` step the speed down and up, `-` and `=` zoom, `0` shows the whole map,
the arrow keys or WASD pan around it, and `Ctrl` swaps what a click does between a missile and
a lightning strike (the HUD shows which, and tapping it swaps on a phone).

## Looking closer

Scroll to zoom at the cursor, drag to pan, pinch and drag on a phone, or use the + / - / home
buttons in the HUD. A click that did not drag still fires a missile. Big maps are drawn at full
sprite detail internally (up to 8 px a cell) and scaled to fit, so a 300 x 300 valley shows
real houses and trees when you zoom in.

A town that loses everything is never stuck: its people muster at the ruins or a campfire,
two of them cut wood even without a lumberyard, and if there is no timber at all they slowly
rebuild with what they scavenge from the rubble.

## Big valleys

The size slider goes to 500 wide, a quarter of a million cells. A big valley starts with more towns
and makes room for more settlers, generates in about a second, and costs roughly 6 to 12
milliseconds a tick on an ordinary laptop (snow and fire crews are the expensive parts), so it is
smooth at normal speeds and slower than the slider promises at the very top. Memory stays small:
the whole world is a few dozen megabytes.

## The hand of god

Press the backtick key, type `god`, or run `__wildfire.debug()` in the browser console to open a
small panel over the map with every disaster on a button: comet (random, or dropped on a chosen
town), earthquake, meteor, dragon, flood, wolves, beavers, a hard freeze, ashfall, drought and dry
storm skies, settlers, and for a chosen town: every craft, rifles and aviation, full stores, war
on another town, a bomber, a bomb, or a fire at its edge. The same key hides it again, and it
remembers whether it was open.

## Controls

| Action              | Mouse / button      | Key     |
|---------------------|---------------------|---------|
| Fire a missile      | click the map       | `M` (random target) |
| Inspect a cell      | Shift + hover       |         |
| Lightning strike    | right-click the map | `L` (random target) |
| Pause / resume      | Pause button        | `space` |
| Single step         | Step button         | `.`     |
| New random forest   | New Forest button   | `N`     |

Sliders: speed (ticks per second), blast radius, spread probability, wind strength,
map size (30 to 300, default 200), and tree density. Changing size or density regenerates the map.

## Safety

The page runs no scripts but its own, talks to no server, and its content security policy
says so. Save files are the only untrusted input: every file is checked for shape and size
before it is loaded, every string in it that could be shown is stripped of anything that could
be markup, and only known settings within their ranges are taken from it.

## Development

The game ships as one page, but it is written as source files:

- `src/head.html` and `src/tail.html` are the page around the script (styles, markup, fonts).
- `src/js/NN-section.js` are the script's sections in order: sprites, seasons, noise, world,
  herds, ledger, biomes, hydrology, beavers, towns, folk, simulation, diplomacy, battles,
  technology, boats, trade roads, dragon, weather, snow, wind, regrowth, settlers, town
  response, townspeople, resources, traders, construction, town growth, arson and accidents,
  air tanker, log and achievements, rendering, view, effects, loop, UI, town card, tabs,
  history, save and load. They share one closure, so a file can use what earlier files define.
- `python build.py` writes `index.html`; `python build.py --check` fails if it is stale.
  Commit the built page with the sources: Pages serves it as is.

Headless checks live in `tests/` and drive the built page over the Chrome DevTools Protocol
(set `WILDFIRE_CHROME` to a Chromium binary, or install Playwright's):

- `node tests/boot.mjs` loads the page and reports any startup error.
- `node tests/soak.mjs <label> <seconds>` runs the valley at 240 ticks a second and reports
  stats, the log and every error.
- `node tests/save.mjs` snapshots, restores, and checks the world comes back byte for byte.
- `node tests/stuck.mjs` measures walkers shuffling between two cells; it should be near zero.

A GitHub Action runs the build check, a parse check, and the boot, soak and save tests on
every push. In the browser, `window.__wildfire` exposes the world, the parameters, step,
reset, forced events (dragon, war, nuke, bomber, meteor, beavers, flood, tech) and
`profileTicks(n)`, which times the pieces of a tick.

## Host it on GitHub Pages

1. Create a repository and push this folder to it.
2. In the repo, open **Settings > Pages**.
3. Under **Build and deployment**, pick **Deploy from a branch**, choose `main` and `/ (root)`.
4. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

The `.nojekyll` file keeps GitHub from running the page through Jekyll.

## Things to try

- Drop spread probability to around 0.2 and watch the fire fizzle. Nudge it up a hair and
  it percolates across the whole map. That threshold is the classic result from the
  original assignment.
- Point the wind east at full strength and strike the west edge.
- Set map size to 300 and blast radius to 6.
- Drop a missile right next to a town with the wind blowing toward it and watch the log.
- Crank speed to 240, set the town cap to 14, and come back in ten minutes to see what the valley became.
