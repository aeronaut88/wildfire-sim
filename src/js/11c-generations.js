/* ───────────────────────── Generations ─────────────────────────
   Children are born to the notable families, grow up in their parents' shadow, come of age, and
   sometimes carry a trait on. When an elder dies in a lawful town the chair often passes to kin,
   and when two claimants want it, the town has a crisis. */

function updateFamilies(town) {
  if (!town.people || town.popLeft < 20 || !town.fed || town.mobilized) return;
  if (world.tick % 400 >= 16 || Math.random() > 0.35) return;
  const parents = town.people.filter(p => p.alive && ['townsfolk', 'elder', 'constable', 'healer', 'hunter', 'chief', 'slayer', 'geologist'].includes(p.role) && personAge(p) >= 18 && personAge(p) <= 45);
  if (!parents.length) return;
  const parent = parents[Math.floor(Math.random() * parents.length)];
  const child = makePersonIn(town, 'child', 0, parent);
  child.born = world.tick; child.story = `child of ${parent.name}${parent.role === 'elder' ? ' the elder' : parent.role === 'constable' ? ' the constable' : ''}`; child.parent = parent.name;
  town.people.push(child); if (town.people.length > 16) town.people = town.people.filter(q => q.alive).slice(-12).concat(town.people.filter(q => !q.alive).slice(-4));
  stat('ev', 'births');
  if (Math.random() < 0.3) say(town, 'birth', { who: child.name, parent: parent.name }, 'good');
}
function comeOfAge(town) {
  if (world.tick % 600 !== 0 || !town.people) return;
  for (const p of town.people) {
    if (!p.alive || p.role !== 'child' || personAge(p) < 15) continue;
    p.role = 'townsfolk';
    const parent = town.people.find(q => q.name === p.parent);
    if (parent && parent.trait && Math.random() < 0.4) { p.trait = parent.trait; p.story = `grew up at ${parent.name}'s knee and has the same ${TRAITS[parent.trait].label}'s way about them`; }
    else p.story = `grew up in the shadow of ${p.parent || 'the hall'} and ${['has never left the valley', 'wants to see what is over the pass', 'can already outshoot the hunter', 'reads better than the elder', 'is afraid of fire and will not say so'][Math.floor(Math.random() * 5)]}`;
    stat('ev', 'cameOfAge');
    if (Math.random() < 0.3) log(`${p.name} of ${town.name} comes of age${p.trait ? `, ${/^[aeiou]/.test(TRAITS[p.trait].label) ? 'an' : 'a'} ${TRAITS[p.trait].label} like ${p.parent}` : ''}`, 'good');
  }
}
// Who takes the chair when the elder dies: in a lawful town, often the elder's kin, and sometimes two of them want it.
function succession(town, prev, quiet, avoidTrait) {
  if (!prev || town.align.order <= 0) return null;
  const heirs = (town.people || []).filter(q => q.alive && q.role === 'townsfolk' && (q.kin === prev.name || q.parent === prev.name || surnameOf(q.name) === surnameOf(prev.name)) && personAge(q) >= 16);
  if (!heirs.length || Math.random() > 0.55) return null;
  const h = heirs[Math.floor(Math.random() * heirs.length)];
  if (heirs.length >= 2 && (town.unrest || 0) >= 35) {
    const rival = heirs.find(q => q !== h);
    town.unrest = Math.min(100, (town.unrest || 0) + 10); town.militia = Math.floor(town.militia * 0.9); stat('ev', 'successionCrises');
    log(`${h.name} and ${rival.name} both claim the chair at ${town.name} when ${prev.name} dies. ${h.name} wins it; ${rival.name} does not forget.`, 'war');
    rival.grudge = { against: 'the elder', why: `being passed over for the chair at ${town.name}`, since: world.tick, over: h.name };
    if (Math.random() < 0.3) { const homes = town.buildings.filter(i => isHome(world.type[i]) && world.burnLeft[i] <= 0); if (homes.length) { ignite(homes[Math.floor(Math.random() * homes.length)]); log(`A house burns in ${town.name} the night of the succession`, 'arson'); } }
  }
  h.role = 'elder'; h.trait = h.trait || rollTrait(town, avoidTrait);
  town.dynasty = (town.dynasty || 0) + 1; stat('ev', 'dynasties');
  if (!quiet) log(`${h.name}, ${h.parent === prev.name ? 'child' : 'kin'} of ${prev.name}, takes the chair at ${town.name}: ${/^[aeiou]/.test(TRAITS[h.trait].label) ? 'an' : 'a'} ${TRAITS[h.trait].label} who ${TRAITS[h.trait].blurb}`, 'build');
  return h;
}
PHRASES.birth = [
  c => `A child is born to ${c.parent} in ${c.name}: ${c.who}`,
  c => `${c.who} is born in ${c.name} ${daypart()}, ${c.parent}'s. The healer says the lungs are good`,
  c => `${c.name} has a new ${c.who.split(' ')[1]}: ${c.who}, born to ${c.parent} ${weatherWord()}`,
];
