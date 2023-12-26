import moment, { Moment } from 'moment';

export function getRankingPeriods<
  T extends Partial<{
    updateIntervalAmount: number;
    updateIntervalUnit: moment.unitOfTime.Base;
    updateLastUpdate: Date;
    updateDayOfWeek: number;

    calculationIntervalAmount: number;
    calculationIntervalUnit: moment.unitOfTime.Base;
    calculationDayOfWeek: number;
    calculationLastUpdate: Date;
  }>,
>(
  system: T,
  from: Moment,
  to: Moment,
  args?: {
    includeUpdate?: boolean;
    includeCalculation?: boolean;
  },
): { date: Moment; updatePossible: boolean }[] {
  if (
    ((args?.includeUpdate ?? true) && !system.updateIntervalAmount) ||
    !system.updateIntervalUnit ||
    !system.updateDayOfWeek
  ) {
    throw new Error('No update interval defined');
  }

  if (
    ((args?.includeCalculation ?? true) && !system.calculationIntervalAmount) ||
    !system.calculationIntervalUnit ||
    !system.calculationDayOfWeek
  ) {
    throw new Error('No calculation interval defined');
  }

  if (!from.isValid() || !to.isValid()) {
    throw new Error('Invalid date');
  }

  const lastUpdate = moment(system.updateLastUpdate);
  const lastCalculation = moment(system.calculationLastUpdate);
  const updates: {
    date: Moment;
    updatePossible: boolean;
  }[] = [];

  if (args?.includeUpdate ?? true) {
    // get the last update on the first iteration before the from date
    if (lastUpdate.isBefore(from, 'day')) {
      while (lastUpdate.isBefore(from, 'day')) {
        lastUpdate.add(system.updateIntervalAmount, system.updateIntervalUnit);
      }
    }

    if (lastUpdate.isAfter(from, 'day')) {
      while (lastUpdate.isAfter(from, 'day')) {
        lastUpdate.subtract(
          system.updateIntervalAmount,
          system.updateIntervalUnit,
        );
      }
    }

    lastUpdate.startOf(system.updateIntervalUnit);
    while (lastUpdate.isSameOrBefore(to, 'day')) {
      lastUpdate.add(system.updateIntervalAmount, system.updateIntervalUnit);

      if (system.updateIntervalUnit === 'months') {
        lastUpdate.isoWeekday(system.updateDayOfWeek + 7);
        if (lastUpdate.date() > 7) {
          lastUpdate.isoWeekday(-(7 - system.updateDayOfWeek));
        }
      } else if (system.updateIntervalUnit === 'weeks') {
        lastUpdate.isoWeekday(system.updateDayOfWeek);
      } else if (system.updateIntervalUnit === 'days') {
        // no logic for day
      }

      if (
        lastUpdate.isSameOrBefore(to, 'day') &&
        lastUpdate.isSameOrAfter(from, 'day')
      ) {
        updates.push({
          date: lastUpdate.clone(),
          updatePossible: true,
        });
      }
    }
  }

  if (args?.includeCalculation ?? true) {
    // get the last calculation on the first iteration before the from date
    if (lastCalculation.isBefore(from, 'day')) {
      while (lastCalculation.isBefore(from, 'day')) {
        lastCalculation.add(
          system.calculationIntervalAmount,
          system.calculationIntervalUnit,
        );
      }
    }

    if (lastCalculation.isAfter(from, 'day')) {
      while (lastCalculation.isAfter(from, 'day')) {
        lastCalculation.subtract(
          system.calculationIntervalAmount,
          system.calculationIntervalUnit,
        );
      }
    }

    lastCalculation.startOf(system.calculationIntervalUnit);
    while (lastCalculation.isSameOrBefore(to, 'day')) {
      lastCalculation.add(
        system.calculationIntervalAmount,
        system.calculationIntervalUnit,
      );

      if (system.calculationIntervalUnit === 'months') {
        lastCalculation.isoWeekday(system.calculationDayOfWeek + 7);
        if (lastCalculation.date() > 7) {
          lastCalculation.isoWeekday(-(7 - system.calculationDayOfWeek));
        }
      } else if (system.calculationIntervalUnit === 'weeks') {
        lastCalculation.isoWeekday(system.calculationDayOfWeek);
      } else if (system.calculationIntervalUnit === 'days') {
        // no logic for day
      }

      // if update already exists, don't add it again
      if (
        updates.find((u) =>
          u.date.isSame(lastCalculation, system.calculationIntervalUnit),
        )
      ) {
        continue;
      }

      if (
        lastCalculation.isSameOrBefore(to, 'day') &&
        lastCalculation.isSameOrAfter(from, 'day')
      ) {
        updates.push({
          date: lastCalculation.clone(),
          updatePossible: false,
        });
      }
    }
  }

  // sort updates by date
  updates.sort((a, b) => {
    if (a.date.isBefore(b.date)) {
      return -1;
    }

    if (a.date.isAfter(b.date)) {
      return 1;
    }

    return 0;
  });

  return updates;
}
