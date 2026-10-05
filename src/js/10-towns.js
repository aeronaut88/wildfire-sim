/* ───────────────────────── Towns ───────────────────────── */

function placeTowns(n) {
  let count = 1 + (rand() < 0.55 ? 1 : 0) + (rand() < 0.3 ? 1 : 0) + (n >= 160 && rand() < 0.6 ? 1 : 0) + (n >= 240 && rand() < 0.6 ? 1 : 0);
  if (n < 50) count = 1;
  world.names = [];
  for (let t = 0; t < count; t++) {
    // Starting size varies a lot: most towns are small, a few start as real towns.
    const R = Math.max(2, Math.min(9, Math.round(2 + Math.pow(rand(), 1.4) * Math.min(7, n / 16))));
    const site = findTownSite(R, rand);
    if (!site) continue;
    foundTown(site[0], site[1], R, { houseScale: 0.55 + rand() * 0.5, stationChance: R >= 4 ? 0.5 : 0.2, rng: rand });
  }
  world.buildingsLeft = world.buildingsTotal;
  world.popLeft = world.popTotal;
}

