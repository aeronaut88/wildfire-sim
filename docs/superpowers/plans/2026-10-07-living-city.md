# Living City Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the spec at `docs/superpowers/specs/2026-10-07-living-city-design.md`: rarer dragons, a Hearth and Craft tech tree, stone buildings, citizens with jobs, and a deep food economy.

**Architecture:** The game is one closure assembled from `src/js/NN-*.js` by `python build.py` into `index.html`. All state is on `world` and `world.towns[]`. New systems follow the existing patterns: tile ids in `T`, costs in `COST`, per-cell `Uint8Array`s packed in `41-save-load.js`, worker walkers made by `mk()` in `26-resources.js`, sprites registered in `SPR16`. Two new source files hold the two biggest new systems: `26b-jobs.js` (the allocator) and `26c-larder.js` (fishing, processing, crops).

**Tech Stack:** Vanilla JS in one page, Python build script, Node CDP harnesses in `tests/` driving Playwright's headless Chromium (`C:/Users/james/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe`).

**Verification used by every task** (run from the repo root):

```
python build.py && node --check <(sed -n '/^<script>/,/^<\/script>/p' index.html | sed '1d;$d')   # build + parse
node tests/boot.mjs            # "no startup errors"
node tests/soak.mjs t 30       # 30 s at 240x: no EXC, towns alive
node tests/save.mjs            # round trip ok
node tests/stuck.mjs           # oscillation near 0
```

Each step below ends with a feature-branch commit; main is fast-forwarded and pushed only after the full harness is green.

---

## Step 1: Dragons are rare

### Task 1.1: Saturating odds, cooldown, smaller rampages

**Files:** Modify `src/js/18-dragon.js:43-66`, `src/js/18-dragon.js:108-114` (leave), `src/js/41-save-load.js:34,126`.

- [ ] In `maybeDragon`: return while `world.dragonCooldown > world.tick`; first dragon `tick < 2400`; odds `0.00001 + 0.00007 * Math.min(1, totalPop / 1500)`, times 3 when a live grudge exists; grudge window 14000; extra town chances 0.30 / 0.10.
- [ ] Where the dragon leaves (`world.dragon = null` in `flyDragon`) and in `slayDragon`: `world.dragonCooldown = world.tick + 4800 + Math.floor(Math.random() * 4800)`.
- [ ] Save `dragonCooldown` beside `dragonGrudge`; restore with `|| 0`. `debugDragon` bypasses cooldown via `force`.
- [ ] Verify: scratch harness `cdp_dragons.mjs` runs 40k ticks at speed 240 on seed default, counts `ev.dragons` stat: 1 to 5, min gap >= 4800.
- [ ] Commit: "Dragons come once in a few years, and never twice in two".

---

## Step 2: Craft tree and stone

### Task 2.1: Hearth and Craft ladder

**Files:** Modify `src/js/15-technology-bows-to-the-bomb.js` (consts, banked, techWants, techReserve, updateTech split), `src/js/26-resources.js:20-21` (CRAFT_NEED beside CIV_NEED), `src/js/11-notable-folk.js:187-199` (`craft: 0, craftPts: 0`), `src/js/41-save-load.js:127` (defaults), `src/js/38-town-card.js:33-34` (tech rows), `src/js/37-ui.js:105-131` (settlements sub-line).

- [ ] `CRAFT_TECH`, `CRAFT_COST`, `CRAFT_NEED` per spec Part 0. `craftCap = 8`. `craftBanked(t)`. `craftShare(t) = clamp(0.22 + 0.18 * ((t.temper?.food ?? 1) - 1), 0.15, 0.4)`.
- [ ] In `updateTech`: `craftPts += pts * cs` where `cs` is 0 when craft is banked and some other track is not; the remainder splits mil/civ as today. Step-up block mirrors civ's: gate check with `lacking`, Masonry also needs `hasType(t, T.QUARRY)` ("a quarry"), Mastery needs bakery+smokehouse+inn ("a bakery, a smokehouse and an inn"). Log `"${t.name} learns ${CRAFT_TECH[next].toLowerCase()}"` (tech), gate log "has the recipe for X but needs Y".
- [ ] `techWants`/`techReserve` include the craft gate.
- [ ] Town card: "craft" row showing `CRAFT_TECH[t.craft]`. Settlements line appends craft name.
- [ ] Verify: boot, soak 30 s; log shows "learns smoking".
- [ ] Commit.

### Task 2.2: Material layer and fire

**Files:** Modify `src/js/04-world.js` (T.SHELL 58, FUEL[SHELL] absent, `isBuilding` unchanged, `passable` includes SHELL like RUBBLE, `BUILDING_NAMES`), `src/js/07-biomes.js:34ff` (`world.mat = new Uint8Array(N)`), `src/js/12-simulation.js:93-101` (p *= matIgnite(j); source heat *= 0.5 when `mat[i]`; spots suppressed when stone; diagonal rule covers stone buildings), `src/js/23-settlers.js:117` (ember x0.15), `src/js/23-settlers.js:138-158` (burnout -> SHELL when `mat[i]` and `isBuilding`), `src/js/18-dragon.js:215` (stone 0.25/0.08), `src/js/24-town-response.js:3-24` (survival 0.85 / 0.7 dragonfire for stone homes), `src/js/14-battles-you-can-watch.js:102`, `src/js/29-town-growth.js:132,149,155` (sack/riot ignite with 0.35 when stone), `src/js/41-save-load.js` (pack/unpack `mat` like `crop`).

- [ ] Helper in 04: `const STONE_IGNITE = 0.12; function matMul(i) { return world.mat[i] ? STONE_IGNITE : 1; }`. `ignite(i)` burn duration x0.6 when stone.
- [ ] `world.mat[i] = 0` whenever a cell becomes non-building terrain (burnout to ASH, quake to DIRT, blast to RUBBLE keeps 0). SHELL keeps `mat = 1`.
- [ ] Verify: scratch `cdp_stone.mjs`: paint two 7x7 rings of HOUSE (one with mat=1) in grass, ignite centre, compare losses over 10 runs; stone loses < 1/3.
- [ ] Commit.

### Task 2.3: Building in stone

**Files:** Modify `src/js/28-construction.js` (`toSite` stores `mat`; `finishSite` sets `world.mat[i]`), `src/js/29-town-growth.js` (`buildHouse` picks stone with `temper.stone*0.5` or code; `buildTenement` requires `craft >= 2`, sets mat; new `refaceHouse(town)` once per cycle), `src/js/25-townspeople.js:81-99` (`rebuildAt`: SHELL branch `{wood:2, stone:1}`, 40% time; rubble -> stone when `town.code`), `src/js/24-town-response.js:26-54` (track `town.fireLoss` per event; code adoption when losses >= 25% homes or 15% if `order > 0`, `craft >= 2`), `src/js/26-resources.js` (COST.stoneHouse `{wood:2, stone:5}`, COST.reface `{stone:5}`, COST.shell `{wood:2, stone:1}`; quarries `1 + floor(pop/150)`; stone shortage when `code` or reface backlog), `src/js/28-construction.js:5` (BUILD_TIME x1.6 for stone sites), civic placements in 29 `buildCivic` pass `stone: craft >= 2 && canAfford(stoneCost)`.

- [ ] `town.code = { stone: true, since }` adoption logs the decree line; elder gets a deed.
- [ ] Verify: soak 60 s on a seed; grep log for "refaces" and "no more thatch" after forcing a fire with `ignite` near a Masonry town.
- [ ] Commit.

### Task 2.4: Stone sprites and legend

**Files:** Modify `src/js/01-sprites.js` (palette-swap helper `stoneOf(key)`; keys `house0_s, house1_s, tenement_s, granary_s, townhall_s, barracks_s, gaol_s, hospital_s, healer_s, station_s, university_s, forge_s, shell`; register at line 617), `src/js/33-rendering.js:12-74` (`spriteKey` returns `_s` when `mat[i]` and the key exists; SHELL -> 'shell'), `src/js/37-ui.js:149-152` (TYPE_NAMES), `src/js/40-history-sand-plots.js:204-222` (legend entries).

- [ ] Verify: boot (legend builds), screenshot shows grey houses on a Masonry town.
- [ ] Commit, soak, save round trip. Step 2 done.

---

## Step 3: Jobs

### Task 3.1: Allocator

**Files:** Create `src/js/26b-jobs.js`. Modify `src/js/29-town-growth.js` (call `allocateJobs(town)` after eating), `src/js/11-notable-folk.js:187-199` (`jobs: {}`), `src/js/41-save-load.js:127` (`t.jobs = t.jobs || {}`).

- [ ] `JOBS` list and `WORKPLACE_SLOTS` per spec Part 3. `allocateJobs(town)` fills in order: young/old share, soldier (barracks*12 if `mil >= 1`), constable/healer (existing counts), militia (`militiaRate`), farmer (farms/2), shortage-matched gatherers, remaining slots, hauler, trader, idle. Invariant `sum === popLeft` enforced at the end by adjusting idle.
- [ ] `jobCount(town, job)` helper. Idle pressure into `updateUnrest` (+0.3 when idle > 15% of workers).
- [ ] Verify: scratch `cdp_jobs.mjs` asserts the invariant for every town every 100 ticks over 10k ticks.
- [ ] Commit.

### Task 3.2: Production follows headcount

**Files:** Modify `src/js/26-resources.js` (`spawnGatherers`: visible caps from `JOBS[k].cap`, quotas from `jobCount`; `addRes` from a job walker multiplied by `yieldMul(town, job)` = `min(8, jobs[job] / visible) * logistics(town) * tools(town)`), `src/js/28-construction.js` (harvest, build same), `src/js/13-alignment-militia-diplomacy-war.js:66-80` (`updateMilitia` reads `jobs.militia`; soldiers separate), `src/js/14-battles-you-can-watch.js:4-40` (strength = soldiers*2 + militia; losses hit soldiers first).

- [ ] Haulers: `jobs.hauler` walkers shuttle production building <-> granary/townhall with `carry`; `logistics = min(1, 0.6 + 0.4 * haulers / wanted)`.
- [ ] Traders: wagon dispatch in `17-trade-roads.js` needs `jobs.trader >= 1`; +40% frequency at 2+. Caravan prices in `27-traders` +10%/trader to 30%.
- [ ] Smiths: `tools(town)` = 1.2 when `jobs.smith >= 1 && res.iron >= 2`; consume 1 iron / 200 ticks.
- [ ] Verify: soak 60 s; valley pop within 20% of baseline on the same seed (record baseline first on main).
- [ ] Commit.

### Task 3.3: Walkers, sprites, UI, phrases, folk

**Files:** Modify `src/js/01-sprites.js` (recolours `farmer, fisher, icefisher, mason, baker, smoker, cook, hauler, trader, smith`), `src/js/34-view-pan-and-zoom.js:95` (`WALKER_SPRITE[job]`), `src/js/38-town-card.js:28` (work grid), `src/js/37-ui.js:125` ("working / idle"), `src/js/40-history-sand-plots.js:4,13,16` (`jobs` stack: farming, gathering, crafting, military, idle) + `41:110`, `src/js/11b-phrases.js` (job lines), `src/js/11-notable-folk.js:8` (roles baker, fisher, mason, smith, trader, soldier, cook; `elect` on first workplace).

- [ ] Verify: boot, soak, save; screenshot of town card.
- [ ] Commit. Step 3 done.

---

## Step 4: The larder

### Task 4.1: Resources and eating

**Files:** Modify `src/js/26-resources.js:5-6,22-32` (`bread, jerky, meals, beer, fruit` in RES_KINDS, PRICE, resCap), `src/js/29-town-growth.js:30-31,53-62,162-168` (spoilage table, eating order fish/game/meals/fruit/bread/grain/jerky, `foodSupply`), `src/js/28-construction.js:98` (shortage sums `FOOD_KINDS`), `src/js/30b-law-and-order.js:81,125` (theft order), `src/js/11-notable-folk.js:197` (start res), `src/js/38-town-card.js:29-30`.

- [ ] `const FOOD_KINDS = ['fish','game','meals','fruit','bread','grain','jerky']` in 26; every hand list replaced.
- [ ] Verify: boot, save round trip (new keys zero-filled on old save).
- [ ] Commit.

### Task 4.2: Herds and migration

**Files:** Modify `src/js/05-wild-herds.js:4-6,16-33,53-57,84` (counts, elk, hare, autumn migration, seasonal meat), `src/js/07-biomes.js:9` (BIOME_HERDS gets elk in cold/forest, hare everywhere), `src/js/26-resources.js:315-346` (hare trapping: stalk 3, carry 2-3), `src/js/01-sprites.js` (`elk`, `hare`), `src/js/05b-wolves-and-bears.js` (autumn pack arrival x3).

- [ ] Verify: soak; log "the herds come down from the hills" in autumn.
- [ ] Commit.

### Task 4.3: Streams and springs

**Files:** Modify `src/js/07-biomes.js:147-174` (always a tributary; 35% spring from an interior high cell; `T.SPRING = 59` at the source), `src/js/04-world.js` (SPRING not fuel, not passable, counts as water for `nearWater`), `src/js/26-resources.js` (a spring within R+6 counts as a well), `src/js/20-snow.js` (spring cell never ices), `src/js/01-sprites.js` (`spring`), `src/js/33-rendering.js`.

- [ ] Salmon run: `world.salmonRun = tick` set at the start of autumn; fishing on `flow >= 0` cells x1.3 for 400 ticks; log once per year per valley.
- [ ] Verify: generate 20 seeds in a scratch harness; every map has >= 2 river paths; ~1/3 have a SPRING.
- [ ] Commit.

### Task 4.4: Fishery, fishers, ice fishing, town boats

**Files:** Create `src/js/26c-larder.js` (fishing + processing + crops). Modify `src/js/04-world.js` (T.FISHERY 60, FUEL 0.7), `src/js/26-resources.js` (COST, NEVER_RESERVED, spawn `fish` job, `updateFisher`), `src/js/29-town-growth.js` (`buildCivic` wishlist: fishery at pop 20 with water in reach via `placeSite(..., t => t === T.WATER)`), `src/js/16-boats.js` (`boat.town`, owner catch, wanderers `min(3, water/400)`, town builds boat at 60 pop + 8 wood), `src/js/01-sprites.js` (`fishery`, `fisher`, `icefisher`, `boat_town`), `src/js/37-ui.js` jobs map.

- [ ] `updateFisher(town, w)`: target = nearest water cell within R+12; if `snow[i] >= ICE_AT` and winter: walk onto the ice (allow stepping onto frozen WATER), 2% through-ice loss on ice younger than 10 ticks (`world.iceSince` not tracked: use `snow[i] < ICE_AT + 6` as "thin"); work 8 ticks; `carry = (2 + rand*3) * waterYield(town) * seasonMul`.
- [ ] Verify: scratch `cdp_ice.mjs`: `setWeather('snow')` long enough to freeze, assert fishers on ice cells and `fish` rising.
- [ ] Commit.

### Task 4.5: Crops

**Files:** Modify `src/js/07-biomes.js:34ff` (`world.cropKind`), `src/js/28-construction.js:81-92` (growth table per kind), `src/js/28-construction.js:56-79` (harvest yield per kind; orchard yields `fruit`, stays at 100 -> 0 but not replanted), `src/js/29-town-growth.js:171+` (`buildField` picks a kind by unlock and weights), `src/js/01-sprites.js` (farm stage sprites per kind: `farm1_b/t/o` etc.), `src/js/33-rendering.js`, `src/js/41-save-load.js` (pack `cropKind`).

- [ ] Verify: soak on cold seed shows turnip fields after Root cellars; orchard fruit in autumn.
- [ ] Commit.

### Task 4.6: Smokehouse, mill, bakery, cellar, brewery, inn, mastery

**Files:** `src/js/26c-larder.js` (`updateProcessing(town)` every 16 ticks: per building with workers, convert per spec; wood fuel; mastery ratio), `src/js/04-world.js` (T.SMOKEHOUSE 62 ignite 0.85, T.BAKERY 61 0.7, T.INN 63 0.6, T.MILL 64 0.6, T.BREWERY 65 0.6, T.CELLAR 66 0.1; `isBuilding` explicit adds; BUILDING_NAMES), `src/js/26-resources.js` (COST, resCap for bread/jerky/meals/beer/fruit, cellar halves spoilage, fish/game cap moves to smokehouse), `src/js/29-town-growth.js:267-295` (`buildCivic` wishlist with craft gates and pop thresholds), `src/js/11-notable-folk.js` (festival feast with Mastery; recipes), `src/js/35-effects.js` or `34` (smoke/glow particles from working buildings every 12 ticks), `src/js/01-sprites.js`, `src/js/37-ui.js`, `src/js/40` legend.

- [ ] Beer effects: unrest -0.4 with inn + beer; caravans +15%; festival crowd bigger.
- [ ] Verify: scratch `cdp_larder.mjs`: force a town to craft 8 with `debugCraft`, give stock, assert bread/jerky/meals/beer produced and wood consumed; winter famine count on cold seed lower than baseline.
- [ ] Commit.

### Task 4.7: Debug handle, README, soak, push

- [ ] `window.__wildfire.debugCraft(a, level)`, `debugFreeze()`.
- [ ] README feature list updated.
- [ ] Full harness green; fast-forward main; push.
