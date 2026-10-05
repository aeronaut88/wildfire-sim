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
- **Regrowth waits.** Burnt ground stays black for 120 to 220 ticks before anything
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
