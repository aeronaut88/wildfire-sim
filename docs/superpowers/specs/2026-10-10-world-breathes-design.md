# The valley breathes: a log you can read for an hour

Design spec, 2026-10-10. Status: written autonomously from James's brief of 2026-10-10 ("make the world breathe"); assumptions are marked. Implementation proceeds from this document, carried out by the `fantasy-writer` agent (`~/.claude/agents/fantasy-writer.md`).

## The brief

James: the log is one-dimensional. The same prompt happens over and over. One event fired once per neighbour floods the stream ("covets the iron seams of A", "...of B", "...of C"). He wants to read for an hour and not see the same kind of thing twice, with the depth and variety of Tolkien and George R. R. Martin.

## What the stream actually looks like (measured)

`tests/logdump.mjs` captures every line the page emits over a 150 s run at 240x (about 32,000 ticks, 13 game years; an hour at the default speed of 4 ticks/s is 14,400 ticks). `tests/analyze_log.py` collapses names, numbers, dayparts and weather words into template signatures.

Baseline on `main` at 598358e:

| | |
|---|---|
| lines | 14,585 |
| distinct signatures | 1,465 |
| top signature, "X clears fields (N farms)" | 585 + 161 |
| "X raises another granary" | 553 + 80 |
| "X covets the iron seams of X" | 497 + 48, of which 364 within 8 lines of the same thing |
| "X and X renew their alliance" (all forms) | ~980 |
| "X is rebuilding (N homes)" | 352 + 94 |
| "X: N people could not get out" | 265 |
| "X finishes its granary" | 188 |

The top seven templates are a fifth of everything the reader sees. The five `DIPLO_BAD` lines ("trade insults at the river crossing" etc.) are each about 100 lines, flat, and never vary. Crew losses say "overrun by the fire" three ways and nothing else. Year on year the distinct count sits around 400 per 1,100 lines: the world has plenty of events, but they are said in too few ways and too often.

Two separate faults, then:

1. **Frequency.** Lines fire per target, per tick, or on a loose random gate with no memory of having said it already.
2. **Flatness.** Most of the 290 direct `log()` calls are a single template. The phrase system (`say()` in `11b-phrases.js`, with anti-repeat, dayparts, weather, mood, elder, and town memory callbacks) covers about 30 events and is the right tool; it just is not used enough.

## Goals

- A reader at default speed sees, in an hour, no two lines that feel like the same line. Operationally: after the change, the same capture shows no signature above 2% of lines, the worst back-to-back repeat count under 30, and total line count down by at least 40% with the distinct count not falling.
- Fan-out events collapse to one line with more meaning than the ten it replaces.
- Every line still carries what the player uses: the town name (chronicles and the click-to-go-there rely on finding it in the text), the number if there was one, and the `kind` tag that colours it.
- The voice stays the valley's: plain chronicle, concrete nouns, one surprising detail, understatement. See the agent definition for the craft rules.

## Non-goals

- No new game mechanics. Nothing about what happens changes; only what is said, how often, and how it is grouped.
- No change to the town card, the sand plots, the HUD or the Info tab beyond what is needed to park detail that leaves the log (the town card already shows who a town covets).
- The 60-line log cap and the chronicle cap stay.

## Design

### A. Measurement is part of the repo

`tests/logdump.mjs <index.html> <out.txt> <seconds>` and `tests/analyze_log.py <out.txt>` are committed. Every writer measures before and after and quotes the numbers in the commit message. CI does not run them (they take minutes); they are a tool, not a gate.

### B. One phrase system, more files

`PHRASES` in `11b-phrases.js` stays the single mechanism. New bags go in new files that extend it, so three writers can work without touching the same file:

```
src/js/11d-phrases-diplomacy.js   Object.assign(PHRASES, { ... })   diplomacy, war, factions, battles
src/js/11e-phrases-town.js        Object.assign(PHRASES, { ... })   growth, building, resources, trade, larder, jobs
src/js/11f-phrases-fire-and-folk.js                                  fire response, losses, settlers, nature, notable folk, tech, disasters, law
```

The build concatenates `src/js/*.js` in name order, so these load after `11b` and before any caller runs. Each bag has 6 to 12 phrasings for anything that fires more than a few times a year, 3 or more for rarer things. Phrasings differ in shape and point of view, not in synonyms. They branch on `season()`, `world.weather.kind`, `daypart()`, `moodWord(town)`, `elderOf(town)`, leader traits (`has(town, 'tyrant')` etc.), and whatever the town remembers (`recall()` is already appended by `say()` 12% of the time).

The direct `log(...)` call at each site becomes `say(town, 'key', { ...facts }, 'kind', at)`. The context object carries every fact the old line carried.

### C. Frequency rules, by offender

Each writer owns the sites in their files. The rule for all of them: say it once when it starts, once when it changes, and only rarely in between, and never the same way.

| Site | Today | Rule |
|---|---|---|
| `13:138` covets | one line per (neighbour, metal), re-fired every time the target flips | one line per town when envy **begins** ("Hollin has begun to look at its neighbours' iron"), one when the **object changes kind** (iron to coal), one summary a year at most while it persists and names nobody ("covets every seam its neighbours dig"). State: `town.envyLogged = { res, tick }`. The town card keeps the per-neighbour detail. The war reason "over the iron seams" stays as is (achievement regex). |
| `13:151` renew alliance | 5% per pair per diplomacy pass, forever | once per pair per **two years** at most (`a.allyLogged[b.id] = tick`), and the line is about something the allies did together (a hunt, a wedding, a shared watch, a feast), never the word "renew". |
| `13:120-130` DIPLO_GOOD / DIPLO_BAD | one flat string per item | each item becomes a bag of 6; incidents between the same pair rate-limited to one per season (`a.quarrelLogged[b.id]`). |
| `29:216` clears fields | on farm 1 and every 8th | keep the gate, 8 phrasings, foreground what grows this season and who farms it. |
| `29:90` raises a granary | every granary | first granary is news; later ones say so at most once a year per town, or fold into the next harvest line. |
| `25:101` is rebuilding | 10% per rebuild tick | once when rebuilding starts, once when it finishes (there is already "rebuilds from the ashes"), nothing between. |
| `24:20` could not get out | every 8 dead, cumulative | keep the first; after that one line per fire **when the fire is out**, with the whole count. |
| `28:33` finishes its X | 40% per completion | first of each building type per town is news; later ones 10%, phrased as what it is for, not that it is finished. |
| `26:268,274` another cistern / well | every one | first is news; later ones once a year per town. |
| `29:338`, `17:98`, `25:89` wants X but has no Y / halts for want of | one per wish, every 300 ticks | one per town per want per **year**; phrased as a shortage felt by someone, not a build queue. |
| `24` crew lost | always "overrun by the fire" | 8 phrasings with how (wind shift, a falling snag, a crown run, smoke, a wall of flame at the ford); name the chief when there is one. |
| `26:` opens another quarry | every one | as granary. |
| `17:` wagons unload / bring N grain | every arrival | first run on a road is news; later ones 20%, said as market talk. |

Anything else in the top 60 of the baseline gets the same treatment at the writer's judgement.

### D. What must not break

- `32-log-chronicles-achievements.js` is not edited by the writers. Two things in it read log text: `whereOf()` picks what the camera follows with regexes on the text, and the achievements table matches text with regexes. Every new phrasing for an event that one of those regexes catches must still match it (for example "over the \w+ seams", "digs an? \w+ mine", "brings a reactor online", "caravan|traders, heading", "marches|raiding party|column", "settlers|refugees", "envoy sets out", "wedding party sets out", "posse", "fireboat|fishing boat", "wagons|Wagons", "^Wolves come down|The bear"). A writer who wants a phrasing that cannot match lists it in their report instead of changing the matcher.
- Every line includes the town's name as written (`t.name`), because `log()` attributes chronicles by `text.includes(t.name)`.
- Every number the old line carried is in every new phrasing.
- The `kind` tag is unchanged per site.
- New per-town fields are plain scalars or small objects on the town; towns are saved whole, so nothing in `41-save-load.js` changes.
- `README.md` is not edited by the writers; the "The log does not repeat itself" section is updated once at the end.

### E. Verification, every writer, before reporting

```
python build.py
node tests/boot.mjs
node tests/soak.mjs t 30
node tests/save.mjs
node tests/stuck.mjs
node tests/logdump.mjs index.html after.txt 150 && python tests/analyze_log.py after.txt
```

Each writer quotes before and after: total lines, distinct signatures, top ten signatures with counts, worst back-to-back repeat.

### F. Work split

Three `fantasy-writer` agents in parallel worktrees, by file ownership. They do not share files.

| Writer | Owns | Phrase file |
|---|---|---|
| Diplomacy | `13-alignment-militia-diplomacy-war.js`, `13b-factions.js`, `14-battles-you-can-watch.js` | `11d-phrases-diplomacy.js` |
| Town | `29-town-growth.js`, `28-construction.js`, `26-resources.js`, `26b-jobs.js`, `26c-larder.js`, `17-trade-roads.js`, `25-townspeople.js`, `27-traders-from-beyond-the-hills.js` | `11e-phrases-town.js` |
| Fire and folk | `24-town-response.js`, `23-settlers.js`, `05-wild-herds.js`, `05b-wolves-and-bears.js`, `08-hydrology-dams-floods.js`, `09-beavers.js`, `11-notable-folk.js`, `11c-generations.js`, `15-technology-bows-to-the-bomb.js`, `18-dragon.js`, `20b-acts-of-god.js`, `31-air-tanker.js`, `30b-law-and-order.js` | `11f-phrases-fire-and-folk.js` |

The 30 bags already in `11b-phrases.js` are not re-written in this pass (they are the part that already works); a writer may add phrasings to an existing key by `PHRASES.key.push(...)` from their own file.

## Assumptions made without James

1. The agent lives in the user-level agents folder so it can be used on other projects, not only this one.
2. Collapsed detail (which neighbour is coveted) is acceptable in the town card only; nothing new is added to the UI.
3. Lower frequency is as important as variety; a 40% cut in line count is a feature, not a loss. If James wants the old density back, the per-site gates in section C are the knobs.
