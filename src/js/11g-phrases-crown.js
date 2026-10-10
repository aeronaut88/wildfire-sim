/* ───────────────────────── Crown phrases: rulers, writs, ballots ─────────────────────────
   What the log says when a faction's ruler reaches down into a town: a warning from the crown, a
   writ served by the capital's militia, the warbands at the hall door, a denunciation from the
   pulpit, and the ballots of a republic. Bags extend PHRASES from 11b. Every phrasing keeps the
   town's name and the names of the people involved.
   Context: name (town), ruler, title, faction, elder (the one in trouble), heir (the new elder),
   label/blurb (the new elder's trait), capital, gov, dead, winner, loser, share, changed, towns. */

function crCap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
function crMood(town) { return crCap(moodWord(town)); }
function crSeal(gov) { return gov === 'kingdom' ? pick(['the royal seal', 'the crown\'s seal', 'wax the colour of blood']) : gov === 'dominion' ? pick(['the Dictator\'s stamp', 'a stamp and no signature', 'the seal of the Dominion']) : gov === 'theocracy' ? pick(['a prayer and a seal', 'the temple seal']) : 'a seal'; }

Object.assign(PHRASES, {
  // The ruler's personality, said once at the crowning or election.
  crownTrait: [
    c => `${c.title} ${c.ruler} of ${c.faction} is ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label}, and ${c.blurb}. The towns will learn what that means`,
    c => `What ${c.faction} has in ${c.title} ${c.ruler}: ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label} who ${c.blurb}`,
    c => `${c.ruler} rules ${c.faction} now. The elders of the towns already know ${c.ruler} for ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label}: ${c.blurb}`,
    c => `The chair in ${c.capital} belongs to ${c.title} ${c.ruler}, ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label} who ${c.blurb}. ${c.faction} will go the way ${c.ruler} goes`,
  ],
  // A kingdom warns first.
  crownWarns: [
    c => `A letter under ${crSeal(c.gov)} reaches ${c.name} ${daypart()}: ${c.title} ${c.ruler} is not pleased with Elder ${c.elder}. ${c.elder} reads it twice and says nothing`,
    c => `${c.title} ${c.ruler} writes to ${c.name}. The letter is short, and it is about ${c.elder}. ${crMood(c.town)}`,
    c => `A rider from ${c.capital} hands Elder ${c.elder} of ${c.name} a folded paper and does not wait for an answer. The crown has noticed`,
    c => `${c.name} hears from ${c.capital}: ${c.title} ${c.ruler} wants ${c.elder} to mend ${pick(['their ways', 'their manners', 'their opinions'])} ${weatherWord()}. Nobody expects it to happen`,
    c => `The crown's displeasure arrives at ${c.name} on good paper. ${c.elder} ${pick(['feeds it to the fire', 'pins it to the hall door', 'puts it in a drawer and locks the drawer'])}`,
    c => `${c.elder} of ${c.name} is warned by ${c.title} ${c.ruler}, by letter, ${pick(['with the seal still warm', 'in a hand that pressed too hard', 'in three lines'])}. It is a season's grace, no more`,
  ],
  // The crown names a new elder over the old one.
  crownNames: [
    c => `${c.title} ${c.ruler} names ${c.heir} elder of ${c.name} by ${crSeal(c.gov)}. ${c.elder} is thanked for ${pick(['long service', 'years of service', 'nothing in particular'])} and shown the door of the hall`,
    c => `The chair at ${c.name} goes to ${c.heir}, ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label} ${c.title} ${c.ruler} can trust. ${c.elder} ${pick(['goes home', 'walks to the river and stands there a while', 'is not asked to the feast'])}`,
    c => `A writ from ${c.capital} ${daypart()}: ${c.elder} is elder of ${c.name} no longer. ${c.heir} is, and ${c.heir} ${c.blurb}`,
    c => `${c.name} wakes to a new elder it did not choose. ${c.heir}, by the hand of ${c.title} ${c.ruler}; ${c.elder} by the hearth with the door shut. ${crMood(c.town)}`,
    c => `${c.title} ${c.ruler} has had enough of ${c.elder}. ${c.heir} takes the hall at ${c.name} ${weatherWord()} with a paper that says so, and the ${c.elder.split(' ').slice(-1)[0]}s remember`,
    c => `Out of favour and out of the chair: ${c.elder} of ${c.name} gives way to ${c.heir}, whom ${c.capital} prefers. The town ${pick(['says nothing', 'mutters', 'watches the road for what comes next'])}`,
  ],
  // A dominion sends the capital's militia with a writ.
  writServed: [
    c => `The militia of ${c.capital} walk into ${c.name} ${daypart()} with a writ. ${c.elder} is ${c.dead ? 'shot in the square before the paper is read out' : pick(['taken to the gaol', 'taken away in a cart', 'put in irons on the hall steps'])}. ${c.heir} is elder by the same paper`,
    c => `${c.title} ${c.ruler} removes ${c.elder} from ${c.name}. ${c.dead ? `There is a body in the square ${weatherWord()} and nobody moves it until dark` : `${c.elder} is marched to the gaol with the whole town watching`}. ${c.heir} takes the chair`,
    c => `A writ with ${crSeal(c.gov)} and twelve spears behind it reaches ${c.name}. ${c.elder} ${c.dead ? 'does not survive the reading of it' : 'is locked up before noon'}. ${c.heir} is named elder and does not look happy about it`,
    c => `${c.name} is corrected. ${c.elder} ${c.dead ? 'is shot against the hall wall' : 'is dragged to the cells'} and ${c.heir} is told the chair is theirs. ${crMood(c.town)}`,
    c => `Soldiers from ${c.capital} at the gate of ${c.name} ${daypart()}, and a paper naming ${c.elder}. ${c.dead ? `${c.elder} is dead by evening.` : `${c.elder} is in the gaol by evening.`} ${c.heir} is elder, by order`,
    c => `The Dictator's writ is served on ${c.name}: ${c.elder} ${c.dead ? 'shot, the paper pinned to the coat' : 'to the cells, the paper pinned to the hall door'}; ${c.heir}, ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label}, to the chair`,
  ],
  // The warbands of a horde drag the elder out.
  hordeDrags: [
    c => `Warbands from ${c.capital} ride into ${c.name} ${daypart()} and drag ${c.elder} out of the hall by the hair. ${c.dead ? `${c.elder} is dead before the horses are watered` : `${c.elder} is driven into the woods with nothing`}. ${c.heir} has the chair`,
    c => `The Supreme Leader's riders come for ${c.elder} of ${c.name}. ${c.dead ? 'There is a killing in the square and the children see it' : `${c.elder} is beaten and sent up the road with a bundle`}. ${c.heir} is put in the hall ${weatherWord()}`,
    c => `${c.name} learns what ${c.faction} does with an elder it does not like. ${c.elder} ${c.dead ? 'is cut down on the hall steps' : 'is thrown out past the last house and told not to turn round'}. ${c.heir} is elder now and the warbands drink the town dry`,
    c => `Horses in ${c.name}'s square before dawn. ${c.elder} ${c.dead ? 'is killed in the doorway of the hall' : 'is marched out of town at spearpoint'}, and ${c.heir} is told to rule and to remember who gave the order`,
    c => `${c.title} ${c.ruler} sends the warbands to ${c.name}. ${c.dead ? `${c.elder} is hung from the hall beam, and left there a day` : `${c.elder} is put out into the ${seasonWord()} woods with a broken hand`}. ${c.heir} takes the chair. ${crMood(c.town)}`,
  ],
  // A theocracy denounces, and the elder retires to a shrine.
  denounced: [
    c => `The omens at ${c.capital} turn against ${c.elder} of ${c.name}: ${pick(['a lamb with no eyes', 'smoke that went north', 'a dream the High Priest had twice', 'ash in the sacred cup'])}. ${c.elder} is to tend a shrine. ${c.heir} is named to the chair`,
    c => `${c.title} ${c.ruler} reads the signs and finds ${c.elder} of ${c.name} wanting. ${c.elder} ${pick(['goes to a shrine above the river', 'takes a hut by the spring', 'sweeps the temple steps now'])}; ${c.heir}, ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label}, sits in the hall`,
    c => `Word from the temple: ${c.elder} of ${c.name} is not in the favour of heaven. ${c.elder} steps down ${daypart()} without a word said against it. ${c.heir} is elder, blessed and anointed`,
    c => `${c.name}'s elder is denounced from the pulpit at ${c.capital}. ${c.elder} ${pick(['does not argue with the gods', 'argues, and then does not', 'asks which god, and is not answered'])}. ${c.heir} takes the chair with a prayer`,
    c => `The gods have a new elder for ${c.name}: ${c.heir}, who ${c.blurb}. ${c.elder} keeps a lamp lit at the roadside shrine and is said to be at peace. Nobody asks`,
  ],
  // A town votes, in a republic.
  townVotes: [
    c => `${c.name} votes ${daypart()}: ${c.winner} takes the chair with ${c.share}% over ${c.loser}. ${c.backed ? `${c.title} ${c.ruler} had let it be known who the capital preferred` : 'The capital kept out of it'}`,
    c => `Ballots in the hall at ${c.name}. ${c.winner}, ${c.share}%. ${c.loser} ${pick(['concedes with a short speech', 'goes home without a word', 'demands a recount and gets one, and loses again'])}`,
    c => `${c.name} chooses ${c.winner} as elder, ${c.share}% of the town behind them. ${c.incumbent ? `${c.loser} had held the chair; the town wanted a change` : `${c.loser}'s challenge fails`}. ${crMood(c.town)}`,
    c => `Election day at ${c.name} ${weatherWord()}. ${c.winner} over ${c.loser}, ${c.share}% to the rest, and ${pick(['a fistfight at the count', 'beer in the square after', 'two families not speaking', 'a dog in the ballot box'])}`,
    c => `${c.winner} is elder of ${c.name} by vote, ${c.share}%. ${c.backed ? `${c.capital} is pleased` : `${c.capital} is not consulted and does not like it`}`,
    c => `The chair at ${c.name} ${c.incumbent ? `changes hands: ${c.winner} in, ${c.loser} out` : `stays with ${c.winner}; ${c.loser} made it close`}, ${c.share}% at the count`,
  ],
  // Many towns vote on the same day: one line.
  republicVotes: [
    c => `${c.faction} goes to the polls. ${c.changed ? `${c.changed} chair${c.changed === 1 ? '' : 's'} change hands: ${c.towns}` : 'Every elder keeps their chair'}. ${pick(['The count takes a day.', 'Beer is poured.', 'The losers blame the weather.', 'Nobody is shot, which is the point.'])}`,
    c => `Election day across ${c.faction} ${weatherWord()}. ${c.changed ? `New elders in ${c.towns}` : 'No town changes its mind'}; the rest as they were`,
    c => `Ballots in every hall of ${c.faction} ${daypart()}. ${c.changed ? `${c.towns} throw out their elders` : 'The elders all survive the day'}. ${c.title} ${c.ruler} ${pick(['watches the returns from the capital', 'says the people have spoken', 'had a word in a few ears beforehand'])}`,
    c => `The towns of ${c.faction} vote. ${c.changed ? `${c.changed} of them choose a new elder (${c.towns})` : 'Not one chair changes'}, and life goes on`,
  ],
  // Outside a republic, the ruler fills an empty chair.
  appointed: [
    c => `${c.title} ${c.ruler} names ${c.heir} elder of ${c.name}, ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label} who ${c.blurb}. The town was not asked`,
    c => `The chair at ${c.name} is filled from ${c.capital}: ${c.heir}, by ${c.title} ${c.ruler}'s choosing. ${c.heir} ${c.blurb}`,
    c => `${c.name} has a new elder, and ${c.capital} chose them: ${c.heir}, ${/^[aeiou]/.test(c.label) ? 'an' : 'a'} ${c.label}. ${crMood(c.town)}`,
    c => `A paper from ${c.capital} ${daypart()} names ${c.heir} to the hall at ${c.name}. ${c.heir} ${c.blurb}, which is what ${c.title} ${c.ruler} wanted`,
    c => `${c.heir} is sent to ${c.name} to be its elder, with ${crSeal(c.gov)} and a trunk. The town ${pick(['takes a look and goes back to work', 'is polite about it', 'already has a nickname for them'])}`,
  ],
  // A town that has had enough of being ruled from elsewhere.
  chafes: [
    c => `${c.name} has lost two elders to ${c.capital} in three years. ${crMood(c.town)}, and the talk at the well is of going it alone`,
    c => `Twice now ${c.capital} has reached into ${c.name}'s hall. People at ${c.name} are counting, and the count is going somewhere`,
    c => `${c.name} is ruled from ${c.capital} and feels every mile of it. A second elder gone in three years; ${pick(['the young men drill in the evenings', 'someone paints over the banner', "the elder's chair stands empty for a day in protest"])}`,
  ],
});
