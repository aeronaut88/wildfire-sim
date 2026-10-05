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
- **Three living towns** at a time on the default map, four on big maps. Dead towns do not
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
- **Save and load.** The Save / Load group has three browser slots plus an autosave that
  writes itself every minute while running. Export file downloads the whole world as
  `wildfire-<seed>-t<tick>.json.gz`: plain JSON inside gzip, so it is small (about 7 to 1, a 100 x 100
  world is around 30 KB) and still readable with any gunzip. Import file loads one back, paused,
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

- **More towns, softer cap.** The Max living towns slider (default 5, more on big maps)
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
map size (30 to 300), and tree density. Changing size or density regenerates the map.

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
