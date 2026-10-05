/* ───────────────────────── The ledger ─────────────────────────
   Everything that happens is tallied: who died and of what, what burned and why, and how many
   times the sky fell in. Hover a tile in the readout to see it. */
function newStats() { return { deaths: {}, deathsTown: {}, lost: {}, lostTown: {}, ev: {} }; }
function stat(group, key, n) {
  const st = world.stats || (world.stats = newStats());
  const g = st[group] || (st[group] = {});
  g[key] = (g[key] || 0) + (n === undefined ? 1 : n);
}

