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

## Controls

| Action              | Mouse / button      | Key     |
|---------------------|---------------------|---------|
| Fire a missile      | click the map       | `M` (random target) |
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
