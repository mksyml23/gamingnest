// Daily sector selection uses UTC and the player's device clock. No save or reward writes.
export function utcDay(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('Invalid date');
  return now.toISOString().slice(0, 10);
}
export function dailySectors(pools, now = new Date()) {
  const date = utcDay(now);
  if (!Array.isArray(pools) || pools.length !== 3 || pools.some(p => !Array.isArray(p) || !p.length)) throw new TypeError('Invalid sector pools');
  let seed = Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000);
  // Mixed radix makes each successive UTC day change at least the first sector.
  const sectors = pools.map(pool => {
    const index = ((seed % pool.length) + pool.length) % pool.length;
    seed = Math.floor(seed / pool.length);
    return pool[index];
  });
  return { date, sectors };
}
