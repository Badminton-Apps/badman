/**
 * Converts milliseconds into greater time units as possible
 * @param {number} ms - Amount of time measured in milliseconds
 * @return {?Object} Reallocated time units. NULL on failure.
 */
export const timeUnits = (
  ms: number
): {
  // weeks: number; // Uncomment for weeks
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
  toString: () => string;
} | null => {
  if (!Number.isInteger(ms)) {
    return null;
  }
  /**
   * Takes as many whole units from the time pool (ms) as possible
   * @param {number} msUnit - Size of a single unit in milliseconds
   * @return {number} Number of units taken from the time pool
   */
  const allocate = (msUnit: number): number => {
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
      const values = timeUnits(ms);
      if (!values) return '';

      return Object.values(values)
        .filter((value) => typeof value !== 'function')
        .join(', ');
    },
  };
};
