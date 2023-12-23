import moment, { Moment } from 'moment';

export function getRankingPeriods<
  T extends Partial<{
    updateIntervalAmount: number;
    updateIntervalUnit: moment.unitOfTime.Base;
    updateIntervalAmountLastUpdate: Date;
    updateDayOfWeek: number;

    calculationIntervalAmount: number;
    calculationIntervalUnit: moment.unitOfTime.Base;
    calculationDayOfWeek: number;
    calculationIntervalLastUpdate: Date;
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

  const lastUpdate = moment(system.updateIntervalAmountLastUpdate);
  const lastCalculation = moment(system.calculationIntervalLastUpdate);
  const updates: {
    date: Moment;
    updatePossible: boolean;
  }[] = [];

  if (args?.includeUpdate ?? true) {
    // get the last update on the first iteration before the from date
    if (lastUpdate.isBefore(from)) {
      while (lastUpdate.isBefore(from)) {
        lastUpdate.add(system.updateIntervalAmount, system.updateIntervalUnit);
      }
    }

    if (lastUpdate.isAfter(from)) {
      while (lastUpdate.isAfter(from)) {
        lastUpdate.subtract(
          system.updateIntervalAmount,
          system.updateIntervalUnit,
        );
      }
    }

    lastUpdate.startOf(system.updateIntervalUnit);
    while (lastUpdate.isSameOrBefore(to)) {
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

      if (lastUpdate.isSameOrBefore(to) && lastUpdate.isSameOrAfter(from)) {
        updates.push({
          date: lastUpdate.clone(),
          updatePossible: true,
        });
      }
    }
  }

  if (args?.includeCalculation ?? true) {
    // get the last calculation on the first iteration before the from date
    if (lastCalculation.isBefore(from)) {
      while (lastCalculation.isBefore(from)) {
        lastCalculation.add(
          system.calculationIntervalAmount,
          system.calculationIntervalUnit,
        );
      }
    }

    if (lastCalculation.isAfter(from) && lastCalculation.isAfter(from)) {
      while (lastCalculation.isAfter(from)) {
        lastCalculation.subtract(
          system.calculationIntervalAmount,
          system.calculationIntervalUnit,
        );
      }
    }

    lastCalculation.startOf(system.calculationIntervalUnit);
    while (lastCalculation.isSameOrBefore(to)) {
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
        lastCalculation.isSameOrBefore(to) &&
        lastCalculation.isSameOrAfter(from)
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
