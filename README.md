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
- **Technology, bows to the bomb.** Research trickles in with population, split between a
  military track (Bows, Steel, Siege engines, Gunpowder, Rifles, Artillery, The Bomb) and a
  civil one (Buckets, Fire brigade, Waterworks, Lookout tower, Aviation) according to
  temperament. Good towns stop at Rifles and never build the bomb. Artillery lets a town
  shell an enemy from home. The bomb flattens a town, leaves fallout that kills slowly,
  blocks regrowth and building, drifts downwind, and turns the sky to ashfall. The town
  that drops it has no idea. Reaching the top takes a very long time.
- **Dragon defense.** A big militia can drive a dragon off. With rifles or better it may
  bring one down, and the hoard draws newcomers and a burst of research.
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
  defenders' line, and at war they fly bombers over the enemy and drop a stick of bombs.
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
- **Achievements.** Twenty-eight badges, unlocked by things that happen in the valley,
  stored in this browser's local storage across valleys.
- **Dragons have names** ("Solul the Twilight", "Kazgon Hoardlord"), are rarer, and a dragon
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
  tree really goes, leaving a stump that regrows), and carry the timber home. A lumberyard
  raises the storage cap and fields more loggers, and the clear-cut around a busy town is
  visible on the map.
- **Stone** comes from a quarry opened at a rock face, worked by quarriers. On big maps towns
  send quarriers and miners further for it, and the trips take longer.
- **Iron, copper, coal and uranium** are seams in the rock, drawn as flecked outcrops. A town
  digs a mine beside a seam and miners in yellow helmets walk the ore home two units at a
  time. Seams are finite; when one is dug to nothing the mine is worked out. Uranium is rare
  and only a town that knows what it is will dig for it.
- **Water.** A town needs a river, a lake or a well. Without one it stays small, and a drought
  kills.
- **Power.** Water wheels, coal plants that eat coal, hydroelectric dams on the river (weaker
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

Every town has named people: an elder, a fire chief, a hunter, and that one person. Each has
an age and a one-line backstory, and the log remembers what they do: the elder signs the war
order and shakes on the truce, the chief leads the crews, the hunter brings home the first
pigs, the geologist finds the oil, and whoever strikes the last blow on a dragon is named for
it. The firebug is anonymous until the third fire, when the town may run them out. People die
of what kills everyone else, and of old age, and the town chooses someone new. Click a town
in the Towns tab to meet them. The History tab's facts block lists the oldest living
resident, the unique dragons seen by name, the biggest town ever, the deadliest cause, and
the counts of everything from beaver dams to caravans robbed.

A year is now 2,400 ticks, so a season lasts a while even at speed.

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
and the arrow keys or WASD pan around it.

## Looking closer

Scroll to zoom at the cursor, drag to pan, pinch and drag on a phone, or use the + / - / home
buttons in the HUD. A click that did not drag still fires a missile. Big maps are drawn at full
sprite detail internally (up to 8 px a cell) and scaled to fit, so a 300 x 300 valley shows
real houses and trees when you zoom in.

A town that loses everything is never stuck: its people muster at the ruins or a campfire,
two of them cut wood even without a lumberyard, and if there is no timber at all they slowly
rebuild with what they scavenge from the rubble.

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
