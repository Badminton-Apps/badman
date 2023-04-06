/**
 * Converts milliseconds into greater time units as possible
 * @param {int} ms - Amount of time measured in milliseconds
 * @return {?Object} Reallocated time units. NULL on failure.
 */
export const timeUnits = (ms) => {
  if (!Number.isInteger(ms)) {
    return null;
  }
  /**
   * Takes as many whole units from the time pool (ms) as possible
   * @param {int} msUnit - Size of a single unit in milliseconds
   * @return {int} Number of units taken from the time pool
   */
  const allocate = (msUnit) => {
    const units = Math.trunc(ms / msUnit);
    ms -= units * msUnit;
    return units;
  };
  // Property order is important here.
  // These arguments are the respective units in ms.
  return {
    // weeks: allocate(604800000), // Uncomment for weeks
    days: allocate(86400000),
    hours: allocate(3600000),
    minutes: allocate(60000),
    seconds: allocate(1000),
    ms: ms, // remainder
    toString: () => {
      return Object.values(timeUnits(ms))
        .filter((v) => v > 0)
        .join(', ');
    },
  };
};
