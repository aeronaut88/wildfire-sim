# The crown over the elder: factions that rule their towns

Design spec, 2026-10-10. Status: written autonomously from James's brief of 2026-10-10 (second feature of the day); assumptions are marked. **Implemented 2026-10-10** on branch `crown-over-elder` after the `world-breathes` writers' branches merged; `tests/crown.mjs` covers all six governments. Deviations: the research nudge is applied through militarism and craft share rather than the three-way split directly; a kingdom's warning line goes through `crownWarns`, a theocracy's denunciation is silent for the season before the elder steps down.

## The brief

James: the leader of a faction must now supersede the personality of the town leaders. Town leaders stay a driver of actions, but a faction's towns as a whole act under direction from their ruler. Town leaders can be ousted by the larger government when they are out of line (depending on the government type). Under a democracy even town leaders face elections. Town government must follow and be integrated with the larger faction.

## What exists

- Every town has an **elder** with one of 16 **traits** (`TRAITS` in `11-notable-folk.js`). `has(town, trait)` is read at about 40 sites and is what "personality" means mechanically: war and peace odds, who sends help, whether a road or a union is possible, research speed, caravan haggling, justice, building speed, farming, drinking.
- A faction of two or more towns has a **government** (kingdom, dominion, republic, horde, theocracy, merchant republic) and a **ruler**: a person made in the capital, or the elder of the winning town in an election. **The ruler has no trait and no effect on behaviour.** The faction's only effects are: no internal wars, shared wars, elections every two years for republics, succession on death, coups and assassinations for dominions and hordes, purges for hordes, break-away of towns at 80 unrest under a dominion or horde.
- Town elders are replaced by `elect(town, 'elder')` on death or revolt: kin succession in orderly towns, otherwise a new person with a rolled trait. **There are no town elections.** Revolt is the only way a town removes its elder.

## Design

### 1. Rulers have a personality

Every ruler gets a trait at crowning (`crownRuler`) via `rollTrait(cap)` with a government bias applied on top of the capital's alignment weights:

| government | favoured traits (weight x3) |
|---|---|
| kingdom | builder, warmonger, hoarder |
| dominion | tyrant, miser, warmonger |
| republic | peacemaker, scholar, builder, physician |
| horde | warmonger, tyrant, madman |
| theocracy | prophet, scholar, firewatch |
| merchant | merchant, miser, hoarder |

An elected ruler keeps the trait they had as elder. The town card and the Info tab show the ruler's trait and blurb beside the title.

### 2. The ruling trait: what a town answers to

New accessor in `11-notable-folk.js`:

```
function rules(town, tr)   // the trait that directs this town's dealings with the world
```

If the town belongs to a governed faction (`govOf(town)` non-null) and the ruler is alive, `rules()` checks the **ruler's** trait; otherwise it falls back to the elder's. `has()` is unchanged and keeps meaning the elder.

Each `has()` site is classified once. **Faction-level** (switch to `rules()`): everything in `13-alignment` (help in wars, councils, war declaration odds, truces, raids and grudges), `13b` (unions, shared wars), `14:167` (sending crews to help), `17-trade-roads` (roads and who they are built with), `27:13` (which town the caravan favours) and `27:74` (haggling), `15:62` (research speed), `18:56` (hoarder draws dragons: the ruler's hoard is the faction's shame). **Local** (stay `has()`): `24` crews, `26` livestock and herbs, `26b` jobs, `26c` drink, `28` building and farming, `29` healer and hospital, all of `30b` justice. Where a site wants both, the town acts on the ruler's trait but the elder's trait still modifies by half (for war declarations: `rules()` sets the base multiplier, `has()` of the elder adds or removes 25%). This is the "town leaders still drive actions" clause.

Research direction follows the ruler too: `updateTech`'s split gets a nudge from the ruling trait (warmonger +0.1 to arms, builder/scholar +0.1 to civil, merchant/greenthumb +0.1 to craft). Small, visible over years, no new mechanic.

### 3. Alignment between elder and ruler

`traitDistance(a, b)` from the `good`/`evil`/`chaos` weights already on each trait: the Euclidean distance between the two weight triples, normalised to 0..1. An elder is **out of line** with the ruler when the distance is over 0.55 (so tyrant vs peacemaker, warmonger vs peacemaker, madman vs builder are out of line; builder vs scholar is not). Same trait is distance 0.

Each town stores `town.inLineSince` (tick) and `town.warned` (tick or 0). The faction pass (`updateFactions`, every 50 ticks) checks every non-capital town with a living elder.

### 4. Ousting, by government

When the elder is out of line, what the government does, with odds per pass:

| government | what happens | odds per pass | effect on the town |
|---|---|---|---|
| kingdom | a **warning** first (letter from the crown, logged once); after a year still out of line, the crown **names a new elder**, biased to the ruler's trait (60% same trait, else roll). Old elder becomes townsfolk and holds a grudge (`grudgeKin` fires for the family). | 0.08 after the warning year | unrest +8 |
| dominion | **removed**: the militia of the capital arrives (a traveller walks there, existing `sendTraveller` kind `envoy` with a new `kind: 'writ'`); the elder is jailed (role `prisoner`, walks to the gaol if there is one, else cellar) or, 30%, shot. Appointee as kingdom. | 0.12, no warning | unrest +15 |
| horde | the warbands come: elder dragged out, 50% killed, 50% exiled (reuses the exile mechanics in `30b`: walks into the woods, may knock at another gate). Appointee is a warmonger or tyrant. | 0.1, no warning | unrest +12, militia -10% |
| theocracy | **denounced**: a line about omens; after a season the elder steps down "to tend a shrine" (role `townsfolk`, no grudge 50%) and a prophet or scholar is named. | 0.06 after a season | unrest +4 |
| republic, merchant | **never by force.** The town's elder faces the voters; see 5. The ruler may back a challenger. | — | — |

The capital's elder is never ousted (the ruler lives there; in a republic they are often the same person). A town whose elder is ousted twice inside three years gets +25 unrest and is a candidate for break-away under any government (today only dominion and horde break away; the trigger becomes `unrest >= 80` for all, with the capital declaring war to bring it back as today).

Every ousting is a `remember(town, 'deposed', { who })` and a deed on both people. New `MEMORY_SHORT.deposed`.

### 5. Elections in republics, for towns too

Under a republic or merchant republic, every member town holds a **town election** on the faction's election cycle (same tick as `holdElection`, every two years), including the capital. Candidates: the sitting elder and one challenger, an adult `townsfolk` of the town (made with `makePersonIn` if none), with a rolled trait. Votes:

```
incumbent = 50 + cheer/2 - unrest/2 + (inLine ? 10 : -10) + (ruler backs incumbent ? 10 : 0)
challenger = 50 + unrest/2 - cheer/2 + (ruler backs challenger ? 10 : 0) + rand(-15, 15)
```

The ruler backs whichever candidate is in line with their own trait (none if both or neither). The winner is elder; a losing incumbent becomes townsfolk with a 40% grudge. The result is logged once per town per election as one line; when more than three towns vote on the same tick, the faction's results are **one summary line** ("the Republic votes: two chairs change hands, in Hollin and Charwood") per the world-breathes rule, with the detail in each town's chronicle via `deed()`.

Outside republics, when an elder dies or is removed in a governed town, the **ruler appoints** (kingdom, dominion, theocracy, horde) instead of the town choosing: `elect()` checks `govOf(town)` and, if the ruler is alive, biases the new elder's trait toward the ruler's (60%) and the log line says who named them. Kin succession (`succession()` in `11c`) still runs first in orderly towns; the crown appoints only when it fails.

### 6. What the player sees

- Town card: under the faction line, "answers to King X, a warmonger" and, when out of line, "the elder is out of favour with the crown". Under a republic: "next election in N seasons".
- Log lines, through `say()` with bags in a new `src/js/11g-phrases-crown.js`: `crownWarns`, `crownNames`, `writServed`, `hordeDrags`, `denounced`, `townVotes`, `republicVotes` (summary), `appointed`. Six phrasings each, plain chronicle voice, branching on government, season and mood.
- A traveller walks from the capital to the town for a writ or a warning (existing traveller sprite), so the ousting has a body.
- The faction popup on the map ("KINGDOM") is unchanged.

### 7. Testing

- `window.__wildfire.debugUnite(aId, bId)` added to the debug handle (`42-debug.js`): sets relation 100 and calls `joinFaction`, so a harness can make a faction on demand.
- New `tests/crown.mjs`: boot, make a faction of three towns, force a government by setting `f.gov` and crowning, set an elder trait to the far side of the ruler's, run 5,000 ticks and assert at least one ousting (or one town election for a republic) and no exceptions; repeat for each government in one run.
- The standard harness (boot, soak, save, stuck) and the log capture; the new lines must not push any signature over 2%.
- Save round-trip: `town.inLineSince`, `town.warned`, ruler `trait` are plain fields on saved objects; nothing to add.

### Assumptions made without James

1. "Personality" is the trait system; the faction's direction is expressed by the ruler's trait replacing the elder's at faction-level sites, with the elder keeping a half-strength say. No new policy menu.
2. Republics never oust by force; the ballot is the only lever. Everything else ousts.
3. Town elections happen only inside republics; stand-alone towns keep today's succession and revolts.
4. The capital's elder is never ousted.
