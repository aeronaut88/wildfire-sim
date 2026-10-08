# The Living City: stone, rarer dragons, a deeper larder, and citizens with jobs

Design spec, 2026-10-07. Status: **approved by James 2026-10-07** with one amendment: crafts and food unlock through a slow secondary tech tree (Part 0 below) instead of Masonry being inserted into the civil ladder. Implementation proceeds step by step from this document.

This covers the four things James asked for on 2026-10-07, in the order they should be built:

1. Dragons far rarer (small tuning change, ship first).
2. Stone buildings as a researched upgrade, highly fire resistant, including against dragonfire.
3. Citizens with jobs, visibly out working, so a town is a workforce rather than a number.
4. A deeper food economy: more game, a guaranteed fresh stream, fishing as a real mechanic with ice fishing in winter, and food processing (bread, jerky, smoked fish, hot meals) with the buildings that make them.

Jobs come before food because every new food building needs workers, and the jobs framework is what gives them workers. Each part is its own implementation plan and its own soak-tested commit; the valley must stay playable after each one.

The project's standing rules apply throughout: do not tone anything down, make events visible on the map rather than only changing numbers, keep variation per run, keep resources scarce so they pace growth, keep the HUD off the map on phones, and soak-test (boot, 20k-tick soak, save round-trip, stuck check) before anything is pushed.

---

## Part 0: The Hearth and Craft tree

James's amendment: a third research ladder, slow, that unlocks food and craft buildings and capabilities one at a time, so a town's kitchen and workshops grow over generations the way its arms and waterworks do. `town.craft` sits beside `town.mil` and `town.civ`.

```
CRAFT_TECH = ['Hearth', 'Smoking', 'Masonry', 'Milling', 'Root cellars', 'Brewing', 'Cookery', 'Orchards', 'Mastery']
CRAFT_COST = [0, 120, 300, 550, 800, 1100, 1500, 2000, 2800]
CRAFT_NEED = [null, {wood:6}, {stone:12}, {wood:10, stone:6}, {stone:8}, {wood:12, copper:2}, {iron:4, stone:6}, {wood:8}, null]
```

| Step | Unlocks | Why it is slow |
|---|---|---|
| 0 Hearth | hunting, fishing from shore, wheat fields, the granary | the start |
| 1 Smoking | smokehouse, jerky and smoked fish, the first winter bridge | first thing every town wants |
| 2 Masonry | stone buildings, refacing, the building code, tenements; also needs a quarry | needs a quarry and stone in hand |
| 3 Milling | the mill (river or wheel) and bakery, bread; barley fields | needs Masonry for the ovens |
| 4 Root cellars | turnip fields (frost hardy); the root cellar building: grain cap +80 and fish, game and meals spoil at half the rate | |
| 5 Brewing | the brewery, beer (needs 2+ barley fields); the inn can be built once beer exists | copper for the vats |
| 6 Cookery | cooks, hot meals, the inn's kitchen; meals use bread, jerky and fruit | iron for the kitchen |
| 7 Orchards | orchard fields (perennial; fruit every autumn; burn like trees) | |
| 8 Mastery | conversions 2-to-4 instead of 2-to-3 in bakery, smokehouse and inn; feast days each harvest festival (unrest -2, a crowd on the square) | needs a bakery, a smokehouse and an inn standing |

**Points.** `updateTech` splits a town's research three ways. The craft share is `clamp(0.22 + 0.18 * (temper.food - 1), 0.15, 0.4)`, so a food-minded town learns its kitchen first; the rest is split between arms and civil by militarism as today. Banking works as it does for the other two tracks: a craft step waiting on stone sends its points to the others and logs "has the recipe for X but needs more Y" once. Mil and civ research slows by roughly a quarter, which is in keeping with the standing rule that tech takes a long time.

**Crops.** `world.cropKind` (Uint8Array) beside `world.crop`: 0 wheat, 1 barley, 2 turnips, 3 orchard.

| Crop | Grows | Yield | Bonus | Unlock |
|---|---|---|---|---|
| wheat | spring 0.9, summer 1.0, autumn 1.1, winter 0 | 9 grain | the baseline | Hearth |
| barley | as wheat | 8 grain | drought factor 0.6 instead of 0.3; counts for brewing | Milling |
| turnips | spring 0.6, summer 0.9, autumn 1.2, winter 0.3; snow halves rather than stops | 7 grain | the only crop that grows in winter; +20% in cold and forest biomes | Root cellars |
| orchard | 3 seasons to establish, then fruit at 100 each autumn; perennial; a burnt orchard is a burnt tree (ASH) | 6 fruit | fruit never spoils in a cellar town; meals with fruit give double the morale | Orchards |

A town plants new fields by weighting its unlocked kinds: barley when it has or wants a brewery, turnips in cold climates or after a famine, orchards when fed and stone is not short. Field sprites get a kind-coloured look at each of the three growth stages (barley gold-green, turnips purple-topped, orchard rows of small trees).

**Beer.** `beer` is a resource brewed from 2 grain to 3 beer per batch when the town has 2+ barley fields. It is not eaten. A town with beer in stock and an inn: unrest -0.4 per cycle, caravans pay +15%, festivals draw a bigger crowd, and the phrase engine gets its tavern lines. Beer spoils slowly (above 20, 0.15 per cycle). Dragons burning a brewery produce a blue flame particle burst; the log notes the smell.

**Mastery and cooking.** Mastery changes conversion ratios town-wide and gives the inn's cooks a `recipe` each festival drawn from what is in stock ("venison and barley stew", "smoked trout with turnip", "apple bread"). The named cook gets deeds. This is flavour on top of a real multiplier.

Everything else in Parts 2 to 4 stands, with their tech gates moved onto this tree: smokehouse needs Smoking, bakery and mill need Milling, cellar needs Root cellars, brewery needs Brewing, inn needs Brewing (beer) and gains cooks at Cookery.

**Save and load.** `town.craft` and `town.craftPts` default to 0 on old saves; `cropKind` is packed like `crop` and defaults to wheat.

**Tests.** A 40k-tick soak on the default seed must show at least one town reach Milling and at least one reach Brewing; no town may reach Mastery before tick 20k.

---

## Part 1: Dragons are rare again

### The problem

`maybeDragon` in `18-dragon.js:49` rolls every tick with probability `0.00001 + 0.00005 * (totalPop / 300)`. At a late-game valley population of about 3,000 that is one sortie every ~2,000 ticks, under a year. Three things then multiply the pain:

- a sortie hits one to three towns (55% chance of a second, 25% of a third), each with 3 to 5 passes, so one dragon can read as several maulings;
- a driven-off dragon leaves a grudge and comes back within 4,000 ticks, rolling the same per-tick odds, so a return can land within a few hundred ticks;
- there is no cooldown at all between sorties.

That matches what James saw: a city mauled five times in 2,000 ticks.

### The fix

- **Saturating odds.** `p = 0.00001 + 0.00007 * min(1, totalPop / 1500)`. Maximum ~0.00008 per tick, a mean interval of about 12,500 ticks (five years) in a rich valley.
- **A hard cooldown.** When a dragon leaves or dies, set `world.dragonCooldown = tick + 4800 + rand * 4800` (two to four years). `maybeDragon` returns early while the cooldown is running. Saved and restored like `dragonGrudge`.
- **Grudges respect the cooldown.** Grudge window grows from 4,000 to 14,000 ticks so the dragon still comes back for the town that wounded it, but not before the cooldown ends. Returning dragons are the one exception to the saturating odds: once the cooldown has passed, a grudge sortie rolls at 3x the normal odds, so the return still feels like a threat the town knows is coming.
- **Smaller rampages.** Second-town chance 0.55 to 0.30, third-town 0.25 to 0.10.
- **First dragon no sooner than tick 2,400** (one year) rather than 400, so settlers get a season.

Nothing else about dragons changes: kinds, names, hoards, jets, slaying, the archers' range.

### Test

A harness run of 40,000 ticks at the default 200 map must log between 1 and 5 dragon sorties, never two sorties starting within 4,800 ticks of each other. `debugDragon()` still forces one for the other tests.

---

## Part 2: Stone buildings

### Research findings that shaped this

- Historic cities rebuilt in stone and brick after fires because it worked: after the Great Fire of London the Crown mandated brick or stone exteriors, noting brick "hath resisted and even extinguished the Fire"; London had already banned thatch in 1212 after an earlier fire. ([National Archives](https://www.nationalarchives.gov.uk/education/resources/fire-of-london/source-5/), [British History Online](https://www.british-history.ac.uk/node/40002), [Designing Buildings](https://www.designingbuildings.co.uk/wiki/The_history_of_timber_construction_in_the_UK))
- Masonry conducts heat poorly, so wildfire damage to historic stone buildings is often only centimetres deep. What burns is the roof, the floors and the interior timber; the load-bearing shell usually survives and can be re-roofed. ([PreventionWeb](https://www.preventionweb.net/news/wildfire-damaged-historic-buildings-may-not-be-ruined-they-appear-saving-them-means-acting), [The Conversation on cathedral fires](https://theconversation.com/notre-dame-a-history-of-medieval-cathedrals-and-fire-115658))
- Stone is not invulnerable: limestone heated past ~750 °C decomposes and later cracks. Dragonfire should still be able to gut a stone building, just rarely.

So in the game: stone buildings are hard to ignite, burn shorter, never throw embers, do not pass heat on to their neighbours the way a timber house does, and when they do burn they leave a standing **shell** that is cheap and quick to re-roof instead of rubble that has to be rebuilt from nothing. Stone homes also save lives: the fire is slower, so people get out.

### Material is a layer, not a new tile per building

A new per-cell array `world.mat` (Uint8Array, 0 timber, 1 stone) alongside `type`. Every building type can be stone without inventing a stone twin for each of the twenty-odd building ids. The alternative (a `T.STONE_HOUSE`, `T.STONE_GRANARY`, ... for each) would double the `isBuilding` ranges, `spriteKey` switch, `FUEL` table and save checks, and would still not cover civic buildings. One array touches five places.

One new tile type: `T.SHELL = 58`, the burnt-out stone shell. `isBuilding(SHELL)` is false (it is a ruin, like RUBBLE), it is not fuel, and `passable` treats it like RUBBLE.

### How fire treats stone

Where the fire code consults `FUEL[type].ignite`, multiply by a material factor:

| Path | Timber (today) | Stone |
|---|---|---|
| Neighbour spread, `12-simulation.js:93` | `FUEL.ignite` | x 0.12 |
| Ember landing, `23-settlers.js:117` | `ignite * 0.8/0.9` | x 0.15 |
| Dragon breath, `18-dragon.js:215` | 0.8 centre / 0.45 edge, ignores FUEL | 0.25 / 0.08 |
| Riot, sack, meteor, blast ring (direct `ignite(i)`) | always | sack and riot: 0.35; meteor and blast: always |
| Burn duration | `FUEL.burn` | x 0.6 |
| Embers thrown (`spots`) | yes for houses, granaries | never |
| Heat passed to neighbours when this cell is the source | 1.0 | 0.5 (the fire is inside the walls) |
| Occupant survival at ignition (`24-town-response.js`) | 0.6 base | 0.85 base, 0.7 under dragonfire |
| After burnout | RUBBLE | SHELL, keeps `mat = 1` |

Two stone buildings touching corner to corner also get the wall diagonal rule (`12-simulation.js:92`): fire does not squeeze through the joint. A ring of stone houses on a town's edge becomes a working firebreak, which is exactly what towns did historically.

### Getting stone: the Masonry step

Masonry is step 2 of the **Hearth and Craft** tree (Part 0): cost 300 points, gate `{ stone: 12 }`, and the town must have a quarry. Tenements require Masonry and are always stone. The civil ladder is untouched, so none of the ~30 `civ >= N` checks move.

### Who builds in stone, and when

Once a town knows Masonry:

- **Civic buildings** (town hall, granary, barracks, gaol, hospital, university, healer's house, station) are built in stone whenever the town can afford the stone cost. They are the buildings worth protecting.
- **New houses** are stone with probability `temper.stone * 0.5` (that temperament field exists today and is never read). A stone house costs `{ wood: 2, stone: 5 }` and takes 1.6x the build time.
- **Refacing.** Once per `growTown` cycle, if stone is above 50% of cap and nothing is short, the town picks a timber house (nearest the centre first, like `buildTenement`) and turns it into a site that finishes as the same building in stone, cost `{ stone: 5 }`. The log notes it ("Hollin refaces another house in quarried stone").
- **The building code event.** When a town loses a quarter or more of its homes in a single fire or dragon attack and knows Masonry (or learns it within a year of the disaster), it adopts a code: `town.code = { stone: true, since: tick }`. From then every new house and every rebuild is stone when the stone exists, refacing runs twice as fast, and the elder gets a deed. Log, in the town's voice: "After the fire, Hollin's elder decrees it: no more thatch. Every new roof is tile and every wall is quarried stone." Lawful towns (`align.order > 0`) adopt the code at 15% losses. This is the London story, and it gives every disaster a visible long-term consequence.
- **Rebuilding a shell** costs `{ wood: 2, stone: 1 }` and takes 40% of a house's build time: the walls are standing, it only needs a roof. `rebuildAt` in `25-townspeople.js` gains a SHELL branch; rubble still comes back as a wooden house unless the town has a code.

A town without Masonry never builds in stone. Stone walls stay as they are.

### Stone supply

Stone demand roughly triples for a town with a code. Today a town opens exactly one quarry at 25 people (`26-resources.js:213`). Allow `1 + floor(popLeft / 150)` quarries, and treat a code or a reface backlog as a stone shortage so quarry crews go to three. Quarry carry stays at 3 per trip. Stone stays scarce; a town with a code and one quarry will visibly take years to reface, which is the pacing James wants.

### Dragons against stone

With breath ignition at 0.25 and 0.08, a dragon's pass over a stone quarter lights two or three roofs instead of a dozen, and those burn out as shells. A stone granary keeps the grain; a stone town hall keeps the coin from the fire, though the dragon still takes what glitters. The dragon's "buildings set ablaze" count still counts shells. A town that has refaced itself should survive a sortie with most homes standing: that is the payoff for the stone.

### Sprites

Stone looks come from a palette swap on the existing building sprites, the same `.replace()` recolour pattern used for hunter, forager and logger: timber browns to grey ashlar, thatch and plank roofs to slate blue-grey. Keys `house0_s`, `house1_s`, `tenement_s`, `granary_s`, `townhall_s`, `barracks_s`, `gaol_s`, `hospital_s`, `healer_s`, `station_s`, `university_s`, `shell`. All registered in the explicit `SPR16` list at `01-sprites.js:617`; `SPR16S` and `SNOWED16` pick them up automatically. `spriteKey` in `33-rendering.js` returns the `_s` key when `mat[i] === 1`. The legend gains "stone house" and "burnt shell".

### Save and load

`world.mat` is packed and restored like `crop` (`41-save-load.js:16-20, 94-108`); absent in old saves means all timber. `town.code` and quarry count need no migration (towns are spread-saved; `code` defaults to null at line 127). `SAVE_VERSION` stays 1.

### Tests

- Soak: a 20k-tick run on a seed with a Masonry town shows stone buildings appearing, at least one refacing, and no exceptions.
- Fire: ignite a timber ring and a stone ring of equal size; the stone ring must lose under a third as many buildings.
- Dragon: `debugDragon()` on a town whose homes are 80% stone must leave at least 60% of homes standing, over ten runs.
- Save round-trip preserves `mat` and `code`.

---

## Part 3: Citizens with jobs

### Today

A town's people are the number `popLeft`. Every walker on the map is a temporary token in `town.workers[]`, spawned by hard-coded quotas (at most 5 strollers, 6 harvesters, 4 hunters, and so on), never subtracted from the population, with no identity. Named notable folk have a `role`, but it is a story label with no link to any walker. Militia is a separate counter, also not drawn from the population.

### The design: counts are the truth, walkers are the sample

Simulating three thousand individual citizens is not affordable at 100 ticks per second and would not look better: at the default zoom a town's people are already specks. Instead:

- Every town gets `town.jobs`, a map from occupation to headcount, recomputed every `growTown` cycle (16 ticks) by an allocator, with the invariant `sum(jobs) === popLeft`.
- The **visible walkers** per job are a sample: `min(jobs[k], cap_k)` walkers of that job are kept on the map, reusing the existing `mk()` out/work/back machinery in `26-resources.js`. A town of 600 shows perhaps 40 people out working; the counts drive production.
- **Production becomes per-worker.** Each trip's yield stays as it is, but the number of trips scales with the headcount: a job with 30 farmers and 6 visible walkers credits 5 harvests per visible harvest. Concretely, `addRes` from a job walker is multiplied by `jobs[k] / visible_k`, capped at 8x so a town cannot farm faster than its fields ripen. This keeps the walking visible and honest while making the headcount matter.
- **Deaths** need no special handling: the allocator rebuilds `jobs` from `popLeft` each cycle. Famine, fire, battle and plague all shrink the workforce the moment they shrink the population.

### The occupations

| Job | What they do | Workplace / slots | Visible cap |
|---|---|---|---|
| young and old | not working; 28% of pop, 34% in towns with a hospital (people live longer) | homes | strollers as today |
| farmer | tend and harvest fields; a farm with no farmer ripens at half rate | 1 per 2 farms | 6 |
| hunter | stalk herds, trap hares, bring young home | needs a herd in reach; 1 + pop/120 | 4 |
| fisher | fish from shore, boat or ice (Part 4) | fishery, 3 slots, +2 per boat | 4 |
| forager | herbs and berries in spring and summer | healer's house | 2 |
| logger | fell trees | lumberyard 3 slots, else 2 | 4 |
| quarrier | cut stone | quarry, 3 slots each | 3 per quarry |
| miner | ore | mine, 3 slots each | 3 per mine |
| builder | raise sites | 1 per open site, 2 if the leader is a builder | 5 |
| mason | stone sites and refacing, only with Masonry | 2 per stone site | 3 |
| baker | grain to bread (Part 4) | bakery, 3 slots | 2 |
| smoker | game and fish to jerky and smoked fish (Part 4) | smokehouse, 2 slots | 2 |
| cook | bread and cured meat to hot meals (Part 4) | inn, 2 slots | 2 |
| hauler | carry goods from workplaces to the storehouse | 1 per 2 production buildings beyond the first | 4 |
| trader | staff the market and drive wagons | 1 per trade road, plus 1 with a town hall | wagons as today |
| smith | work the forge | forge, 2 slots | 1 |
| healer, constable | as today | healer's house, gaol | as today |
| crew | fire crews when the alarm goes | as today (crews stay separate) | as today |
| militia | the levy; counted inside `jobs.militia` | `militiaRate` as today | drill walkers as today |
| soldier | trained, barracks-housed, full-time | 12 per barracks, Steel or better | 4 drilling |

### The allocator

Runs in `growTown` after eating. Order:

1. Set aside young and old.
2. Fill fixed posts: soldiers (up to barracks slots), constables and healers (as today), militia at `militiaRate` of what remains.
3. Fill workplaces with slots: farmers first (food), then whichever of the gathering jobs matches a current shortage (`shortages()` already names wood, stone, food, water and tech ores), then the rest in building order.
4. Haulers and traders from the remaining pool.
5. Whoever is left is **idle**. Idle people above 15% of the working pool count as unrest pressure (+0.3 per cycle, same scale as "not fed" at +0.5); the town's answer is to build a workplace, so the civic wishlist gains "a bakery for the idle hands". This is how a growing town is pushed to industrialise rather than sprawl.

Each town's `temper` weights (`wood`, `stone`, `food`, `build`, `trade`) bias the fill order, so no two towns staff themselves alike. The leader's traits still apply (a builder elder adds builders, a beastlord adds a hunter).

### Trained soldiers

`jobs.soldier` is new. A town with a barracks and Steel (`mil >= 1`) fills up to 12 slots per barracks with full-time soldiers, drawn from the pool before militia. They drill around the barracks (the existing drill walkers), they do not farm, and they are the first into a battle: `startBattle` takes `soldiers + militia` as the defending or attacking strength, with a soldier worth 2.0 to a militiaman's 1.0 in `power`. Losses hit soldiers first. The levy still exists; a town at peace keeps its militia small and its soldiers few, a town at war raises both. Pressed convicts become soldiers as today.

### Haulers

Production buildings (quarry, mine, lumberyard, fishery, bakery, smokehouse, forge) now need goods carried to the storehouse. The gatherers still carry their own loads; haulers add a **logistics factor** applied to the yield multiplier above: `min(1, 0.6 + 0.4 * haulers / haulersWanted)`. A town with no haulers runs at 60%. Hauler walkers shuttle between the farthest production building and the granary or town hall with a load on their back, so the effect is visible.

### Traders and smiths

- A wagon needs a trader to drive it: `17-trade-roads.js` only sends a wagon on a road whose town has `jobs.trader >= 1`, and a town with two or more traders sends wagons 40% more often. Market days with the off-map caravans go better with a trader: 10% better prices per trader, to a cap of 30%.
- Smiths staff the forge. A staffed forge keeps its research bonus and adds **tools**: loggers, quarriers, miners and farmers yield +20% while `jobs.smith >= 1` and the town has at least 2 iron in stock, consuming 1 iron every 200 ticks. No new resource.

### Walkers and sprites

New sprite keys by palette swap on `worker`: `farmer` (straw hat), `fisher` (blue, rod), `mason` (grey apron), `baker` (white), `smoker` (dark, smoke-stained), `cook`, `hauler` (pack), `trader` (coloured cloak), `smith` (leather apron). `spriteKey` for walkers in `34-view-pan-and-zoom.js:95` extends its ternary into a `WALKER_SPRITE[job]` lookup. The existing `tiny` cull stays; nothing new is drawn when the town is specks.

### Where the player sees it

- **Town card** gains a `work` section after `people`: a two-column grid of job and headcount, idle in red when above 15%.
- **Settlements panel** sub-line gains "working 412 / idle 23".
- **History sand plots** gain a `jobs` stack (farming, gathering, crafting, military, idle) so a town's economy can be read over time.
- **Log** lines come from the phrase engine in `11b-phrases.js`: "Hollin's bakers are out of grain", "the smokehouse at Dunmere hangs the autumn kill", "forty idle hands in Caer and nothing to put them to".
- **Notable folk** gain working roles: baker, fisher, mason, smith, trader, soldier. `elect()` picks one when a workplace first opens ("Maud Tally, who salted four hundred fish before the freeze"), and the role hooks into deeds (a mason's first stone house, a fisher's record catch, a soldier's first battle).

### Save and load

`town.jobs` is spread-saved automatically; old saves get `t.jobs = t.jobs || {}` at `41-save-load.js:127` and the allocator fills it on the first cycle.

### Tests

- Invariant check in the soak harness every 100 ticks: `sum(jobs) === popLeft` for every town, zero idle in a town that has slots free.
- Production parity: a 20k soak must finish with valley population within 20% of today's baseline on the same seed, so the jobs system changes who does the work without starving or flooding the valley.
- Stuck check stays near zero with the new walker kinds.

---

## Part 4: The larder

### Research findings that shaped this

- Pre-refrigeration communities turned seasonal abundance into winter survival by salting, smoking and drying meat and fish, and by milling and baking grain; large numbers of animals were slaughtered at the start of winter and preserved. ([Brewminate on medieval food storage](https://brewminate.com/medieval-food-storage-before-refrigeration/), [SCA food preservation](https://cunnan.lochac.sca.org/index.php/Food_preservation))
- Ice fishing is at least 10,000 years old and was the winter food-security mechanism for northern peoples; it was communal, with shared catches, spearing and nets through chipped holes. ([Wikipedia](https://en.wikipedia.org/wiki/Ice_fishing), [History.com](https://www.history.com/articles/ice-fishing-oldest-evidence), [Northern Ontario Travel](https://northernontario.travel/sunset-country/history-ice-fishing-northwestern-ontario?page=21))

### Today

Food is three stocks (grain, fish, game) eaten in order every 16 ticks at one unit per 30 people. Fish and game spoil above 10 units. Fish come only from six ownerless boats that freeze in place all winter, so there is no winter fishing at all. Herds are few (about seven on a 128 map), wander off the edge at 8% per check, and there is no winter food bridge other than grain, which never spoils. A tributary stream exists on half of maps.

### More game

- Herds seeded at `max(4, round(N / 1200))` (from `max(2, N / 2200)`), arrivals up to `max(6, N / 1000)`, edge-leaving chance 3% (from 8%), breeding cap 16 (from 12).
- Two new kinds: **elk** (weight 0.12, meat 7, prefer cold and forest biomes) and **hare** (weight 0.2, meat 1, size 6 to 14, breed every 20 updates; hunters "trap" them with a shorter stalk and bring back 2 to 3). Hares are the winter game: hunters go for them when the big herds have gone.
- **Autumn migration.** In the first 200 ticks of autumn, arrival chance triples and herds come in bigger (4 to 9). Log: "the herds come down from the hills". Winter hunting of deer and elk yields +2 meat (fat animals), spring yields -1.
- Wolves follow: pack arrival chance in autumn goes with the herds.

### A fresh stream

- `carveRiver` always lays a tributary (today 50%), and 35% of maps get a second from an interior **spring**: the highest cell more than `n / 4` from any edge, run with `valleyPath(src, -1, waterSet)` so it joins the nearest water. Springs get a `T.SPRING` cell (new type 59, drawn as a rock with water) that never freezes and counts as a well for the town that owns it.
- A stream has fish. Per-cell fish richness is not tracked; instead a water body's yield for a fisher is `0.6 + 0.4 * min(1, reachableWater / 40)` and river cells (`flow >= 0`) add +0.3 in autumn (the **salmon run**, logged once a year: "the salmon are running at Hollin's ford"). Towns on a stream fish better than towns on a pond, and the run is a visible autumn event.
- Hydro and wheels, water carriers, beavers and floods pick the new water up through `world.water` and `flow` as they do now.

### Fishing as a mechanic

- **Fishery** (`T.FISHERY = 60`, cost `{ wood: 5 }`, placed on the shore with the water-wheel rule `placeSite(town, type, maxD, t => t === T.WATER)`), built when the town has 20+ people and water within reach. 3 fisher slots. A second fishery at 150 people.
- **Fishers** walk to a water cell within `R + 12`, fish for 8 ticks and carry 2 to 4 fish times the water-body yield and the season (spring 1.0, summer 1.1, autumn 1.3, winter 0.6).
- **Ice fishing.** In winter, when the nearest water is ice (`snow[i] >= ICE_AT`), fishers walk onto the ice instead of stopping at the shore, drawn sitting beside a dark hole with a bucket (new `icefisher` sprite). Yield is 0.6x but it is the only fresh food in a hard winter, which is the bridge James asked for. Danger: on ice less than 10 ticks old there is a 2% chance per fishing trip of a fisher going through; the town loses one and the log says so.
- **Boats** become town-owned: a fishery with 60+ people and 8 wood builds a boat (`boat.town = id`), catch goes to its owner, and boats still freeze in winter (the fishers walk out on the ice instead). The ownerless wandering boats drop to `min(3, water / 400)` so they remain a sight on big lakes without being the valley's fishmonger.
- Fish still spoil; the smokehouse fixes that.

### Processing: bread, jerky, smoked fish, hot meals

Three new resources in `RES_KINDS`: `bread`, `jerky`, `meals`. Smoked fish and jerky share the `jerky` stock (the log calls it whichever it was). Three new buildings:

| Building | Cost | Workers | Converts | Needs | Cap it adds |
|---|---|---|---|---|---|
| Bakery `T.BAKERY = 61` | `{ wood: 6, stone: 4 }`, needs Milling | 3 bakers | 2 grain to 3 bread per batch, 1 wood per 2 batches | a wheel or bread boiler nearby: +50% | bread 40 + 30 |
| Smokehouse `T.SMOKEHOUSE = 62` | `{ wood: 6 }` | 2 smokers | 2 game or 2 fish to 3 jerky, 1 wood per batch | autumn: works double shifts | jerky 50 + 40 |
| Inn `T.INN = 63` | `{ wood: 8, stone: 4 }` | 2 cooks | 1 bread + 1 jerky to 3 meals | | meals 20 + 20 |

A batch takes 16 ticks per worker. Conversion gains (2 to 3) are the whole point: processed food goes 50% further, and a town that processes feeds half again as many people from the same fields. Wood fuel keeps it scarce; a town short of wood lets the smokehouse go cold and the log says so.

**Eating order** becomes fish, game, meals, bread, grain, jerky. Fresh food first because it spoils; jerky last because it is the winter reserve. Jerky and bread never spoil; meals spoil like fish (they are hot food). In winter, when fish and game are zero and grain is low, a town with a full smokehouse eats jerky and does not go hungry: that is the bridge.

**Meals** also do something for morale: a town that ate meals this cycle gets unrest -0.3 and `tradeFood`-style growth bonus +10. Cooks are the first "luxury" job; a town with an inn feels richer, and traders stop there (caravans pay +10% in a town with an inn).

**Granaries** keep the grain cap role; the smokehouse takes over the fish and game storage bonus (today the granary "shares the storehouse", `26-resources.js:25`): fish and game cap becomes `40 + 20 * smokehouses`, so a town without a smokehouse has somewhere to put its catch but not much.

**Shortage** logic (`28-construction.js:98`) sums all six food stocks against `ceil(pop / 30) * 4`. `foodSupply` counts bread and jerky at 1.6x like the rest and meals at 2.0x. Thieves take bread before grain. Dragons burn bakeries beautifully (ignite 0.7, they are full of ovens and flour), smokehouses more so (0.85); stone versions as in Part 2.

### Who builds what, and when

- Smokehouse: pop >= 30 and (hunters or fishers >= 2). The earliest processing building, needs no tech.
- Fishery: pop >= 20 and water within reach.
- Bakery: Milling and pop >= 60 and a granary. Mill (`T.MILL = 64`, `{ wood: 8, stone: 4 }`) on a river cell or next to a wheel, Milling, pop >= 50; a bakery without a mill works at half speed.
- Brewery (`T.BREWERY = 65`, `{ wood: 8, stone: 4, copper: 1 }`): Brewing, 2+ barley fields, pop >= 80.
- Root cellar (`T.CELLAR = 66`, `{ stone: 8, wood: 2 }`): Root cellars, pop >= 50.
- Inn: Brewing, pop >= 120, beer in stock, and the town is fed. Cooks and meals arrive with Cookery.

All go through `buildCivic`'s wishlist with a shortfall log ("wants a bakery but has no stone").

### Sprites and legend

`fishery` (hut on stilts, nets), `smokehouse` (dark shed, a smoke particle when working), `bakery` (oven chimney, a warm glow particle when working), `inn` (sign, lit windows at night), `spring`, `fisher`, `icefisher`, `boat_town` (a recolour of `boat`), `elk`, `hare`. Registered in `SPR16`, named in `TYPE_NAMES`, `BUILDING_NAMES` and the legend. Working buildings emit their particle every 12 ticks so a visitor can see which smokehouses are lit.

### Save and load

New resource keys are in `RES_KINDS`, so the load backfill at `41-save-load.js:127` zero-fills them. New tile ids under 256 need no migration. Boats gain an optional `town` field, spread-saved. `HIST_METRICS` gains none; the `food` metric reads `foodSupply` and so includes the new stocks.

### Tests

- Winter famine rate: on the cold climate seed, a 20k-tick soak must show fewer famine starts than the baseline on the same seed (the smokehouse and ice fishing are the reason).
- Ice fishing: with `setWeather` forcing a freeze, fishers must be observed on ice cells and `fish` must still rise.
- Conversion correctness: a bakery with 3 bakers and 20 grain must produce 30 bread over the expected ticks and burn 5 wood.
- Soak, boot, save round-trip, stuck check as always.

---

## Build order and what each step needs

| Step | Scope | Risk | Depends on |
|---|---|---|---|
| 1 | Dragon pacing | tiny | nothing |
| 2 | Craft tree skeleton (points, banking, UI) + Stone: `mat` layer, SHELL, Masonry, refacing, code event, quarries, sprites | medium | nothing |
| 3 | Jobs framework: allocator, per-worker production, visible samples, soldiers, haulers, traders, smiths, town card, history, phrases, notable roles | high (touches every worker spawn) | step 2 only for masons |
| 4 | Larder: herds, stream and springs, fishery and ice fishing, boats, crops, smokehouse, mill, bakery, cellar, brewery, inn, orchards, mastery, new stocks | high | step 3 (bakers, smokers, cooks, fishers are jobs), step 2 (craft tree) |

Each step is a plan, a feature branch, a soak-tested commit, and a push once the harness is green. Steps 3 and 4 are each likely to be a long overnight session.

## Out of scope for this spec

- Individual simulated citizens with ages and homes (counts plus samples is the chosen model).
- Age structure or birth rates in the population counter beyond the fixed young-and-old share.
- A tools resource, a market building, or money changing hands between citizens.
- New livestock kinds (goats were considered; elk and hare are game only).
- Separate rivers with names or per-cell fish stocks.

## Decisions from James's review (2026-10-07)

1. Masonry and the food crafts live on their own slow tree (Part 0), not in the civil ladder.
2. Inns, beer, several crops with bonuses and cooking mastery are all in scope. "Do it all."
3. Soldiers at 12 per barracks, double weight: proceed as specified.
4. Dragon cooldown of two to four years: proceed as specified.

---

## Addendum, 2026-10-08: spirits, drink, tobacco, and idle hands

James's play notes: bread, jerky and beer stocks looked low and nothing rewarded converting; and a quarter of a town stood idle.

- **Why stocks were low.** Converted food was eaten before raw food, so bread never showed in the stores; nothing consumed beer; brewing waited on three cycles of grain in hand. Fixes: workshops run before the town eats; eating order is fish, game, meals, fruit, grain, bread, jerky (loaves and smoked meat are the reserve and so they pile up); the inn pours a cup per sixty people a cycle; brewers do two batches and keep less grain back; barley is planted as soon as there is a mill.
- **Spirits** (`town.cheer`, 0 to 100, drifting toward 50): +0.8 beer at the inn, +0.5 meals (+1 with fruit), +0.2 fruit and bread in the larder, +0.4 a pipe, +8 festival; -1 unfed, -1.5 famine, -1 thirst, -deaths/10, -0.6 a dry inn in a town that has known beer. Effects: unrest drifts by (cheer-50)/50 x 0.5 per cycle; growth chance 0.8 above 70 and 0.4 below 30; research x1.1 above 70, x0.85 below 30; below 25, two percent leave for the happiest town within reach with beds. Shown on the town card, the settlements line, and a *spirits* history metric.
- **Drink.** `jobs.drunk` is 3 to 8 percent of the pool wherever beer flows (more in high spirits, more under a drunkard elder); yields drop five percent while anyone is at the inn; up to three carousers stand at the inn's door in the evening hours and wander home crooked. A named **town drunk** (role `sot`) is elected once beer flows; deeds with a four percent chance per cycle: knocks a lamp over (30% the inn catches), found on the ice (25% dies), falls in the river, sleeps in the smokehouse, sings under the elder's window, starts a brawl (counts as a crime, 30% someone dies), swears off drink.
- **Tobacco.** Crop kind 4 on the Brewing step, warm dry ground only, drought-tolerant like barley, yield 5 leaf to a `tobacco` stock (price 3, cap 20 + 10 per granary; caravans carry it). A pipe per 120 people a cycle lifts spirits by 0.4; each cycle smoked has a 1.5 percent chance of a death to the cough, halved with a healer's house or hospital.
- **Idle hands.** Spare hands after the slotted trades go to the open-ended ones (35% fields, 15% woods, 15% sites, 10% shore, 10% quarry, 5% herds, 5% mines); fully staffed fields ripen 20% faster and neglected ones 20% slower; surplus farmers push the town to clear new fields; visible caps rise to eight builders, harvesters and loggers. Seventy percent of what remains keeps house; the rest are idle.
