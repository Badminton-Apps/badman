import moment from 'moment';
import { getRankingPeriods } from './get-ranking-periods';

describe('getRankingPeriods', () => {
  describe('Ranking: 1 month, Points: 1 week', () => {
    const system = {
      updateIntervalAmount: 1,
      updateIntervalUnit: 'months',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateIntervalAmountLastUpdate: new Date('2023-12-03T23:00:00.000Z'),
      calculationDayOfWeek: 1,
    } as const;

    it('Get for full year only update', () => {
      // Assert
      const from = moment('2023-01-01');
      const to = moment('2024-01-01');

      // Act
      const result = getRankingPeriods(system, from, to, {
        includeCalculation: false,
      });

      // Assert
      const expected = [
        {
          date: new Date('2023-01-01T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-02-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-02T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-30T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-06-04T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-02T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-08-06T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-03T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-01T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-03T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-31T23:00:00.000Z'),
          updatePossible: true,
        },
      ];
      expect(result).toEqual(expected);
    });

    it('Get for full year only calculation', () => {
      // Assert
      const from = moment('2023-01-01');
      const to = moment('2024-01-01');

      // Act
      const result = getRankingPeriods(system, from, to, {
        includeUpdate: false,
      });

      // Assert
      const expected = [
        {
          date: new Date('2023-01-01T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-08T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-15T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-22T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-29T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-05T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-12T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-19T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-26T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-05T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-12T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-19T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-26T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-02T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-09T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-16T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-23T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-30T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-07T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-14T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-21T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-28T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-04T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-11T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-18T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-25T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-02T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-09T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-16T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-23T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-30T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-06T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-13T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-20T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-27T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-03T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-10T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-17T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-24T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-01T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-08T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-15T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-22T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-29T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-05T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-12T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-19T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-26T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-03T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-10T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-17T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-24T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-31T23:00:00.000Z'),
          updatePossible: false,
        },
      ];
      expect(result).toEqual(expected);
    });

    it('Get for full', () => {
      // Assert
      const from = moment('2023-01-01');
      const to = moment('2024-01-01');

      // Act
      const result = getRankingPeriods(system, from, to);

      // Assert
      const expected = [
        {
          date: new Date('2023-01-01T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-01-08T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-15T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-22T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-29T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-02-12T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-19T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-26T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-12T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-19T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-26T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-02T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-09T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-16T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-23T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-30T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-05-07T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-14T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-21T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-28T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-04T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-06-11T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-18T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-25T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-02T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-09T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-16T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-23T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-30T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-06T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-08-13T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-20T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-27T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-03T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-10T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-17T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-24T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-01T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-08T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-15T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-22T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-29T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-12T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-19T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-26T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-03T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-10T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-17T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-24T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-31T23:00:00.000Z'),
          updatePossible: true,
        },
      ];
      expect(result).toEqual(expected);
    });

    describe('last update based on dates', () => {
      const expected = [
        {
          date: new Date('2023-04-02T22:00:00.000Z'),
          updatePossible: true,
        },
      ];
      const from = moment('2023-03-01');
      const to = moment('2023-04-30');

      it('last update before from', () => {
        // Assert

        const s = {
          ...system,
          updateIntervalAmountLastUpdate: moment('2023-02-01').toDate(),
        } as const;

        // Act
        const result = getRankingPeriods(s, from, to, {
          includeCalculation: false,
        });

        expect(result).toEqual(expected);
      });

      it('last update after from', () => {
        // Assert
        const s = {
          ...system,
          updateIntervalAmountLastUpdate: moment('2023-06-01').toDate(),
        } as const;

        // Act
        const result = getRankingPeriods(s, from, to, {
          includeCalculation: false,
        });

        // Assert
        expect(result).toEqual(expected);
      });

      it('last update betweeen', () => {
        // Assert
        const s = {
          ...system,
          updateIntervalAmountLastUpdate: moment('2023-02-01').toDate(),
        } as const;

        // Act
        const result = getRankingPeriods(s, from, to, {
          includeCalculation: false,
        });

        // Assert
        expect(result).toEqual(expected);
      });
    });
  });

  describe('Ranking: 2 month, Points: 1 month', () => {
    const system1Month = {
      updateIntervalAmount: 2,
      updateIntervalUnit: 'months',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'months',
      updateIntervalAmountLastUpdate: new Date('2023-12-03T23:00:00.000Z'),
      calculationDayOfWeek: 1,
    } as const;

    it('Get for full year', () => {
      // Assert
      const from = moment('2023-01-01');
      const to = moment('2024-01-01');

      // Act
      const result = getRankingPeriods(system1Month, from, to);

      // Assert
      const expected = [
        {
          date: new Date('2023-01-01T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-05T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-02T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-30T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-04T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-02T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-06T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-03T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-01T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-05T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-03T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-31T23:00:00.000Z'),
          updatePossible: false,
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('Ranking: 2 month, Points: 1 week', () => {
    const system1Month = {
      updateIntervalAmount: 2,
      updateIntervalUnit: 'months',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateIntervalAmountLastUpdate: new Date('2023-12-03T23:00:00.000Z'),
      calculationDayOfWeek: 1,
    } as const;

    it('Get for full year', () => {
      // Assert
      const from = moment('2023-01-01');
      const to = moment('2024-01-01');

      // Act
      const result = getRankingPeriods(system1Month, from, to, {
        includeCalculation: false,
      });

      // Assert
      const expected = [
        {
          date: new Date('2023-02-05T23:00:00.000Z'),
          updatePossible: true,
        },

        {
          date: new Date('2023-04-02T22:00:00.000Z'),
          updatePossible: true,
        },

        {
          date: new Date('2023-06-04T22:00:00.000Z'),
          updatePossible: true,
        },

        {
          date: new Date('2023-08-06T22:00:00.000Z'),
          updatePossible: true,
        },

        {
          date: new Date('2023-10-01T22:00:00.000Z'),
          updatePossible: true,
        },

        {
          date: new Date('2023-12-03T23:00:00.000Z'),
          updatePossible: true,
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('Ranking: 2 week, Points: 1 week', () => {
    const system = {
      updateIntervalAmount: 2,
      updateIntervalUnit: 'weeks',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateIntervalAmountLastUpdate: new Date('2023-12-03T23:00:00.000Z'),
      calculationDayOfWeek: 1,
    } as const;

    it('Get for full', () => {
      // Assert
      const from = moment('2023-01-01');
      const to = moment('2024-01-01');

      // Act
      const result = getRankingPeriods(system, from, to);

      // Assert
      const expected = [
        {
          date: new Date('2023-01-01T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-08T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-01-15T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-01-22T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-01-29T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-02-12T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-02-19T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-02-26T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-12T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-03-19T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-26T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-02T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-09T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-16T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-23T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-04-30T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-05-07T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-14T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-05-21T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-05-28T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-06-04T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-11T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-06-18T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-06-25T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-02T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-09T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-16T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-07-23T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-30T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-06T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-08-13T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-08-20T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-08-27T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-03T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-10T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-09-17T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-24T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-01T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-08T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-15T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-22T22:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-10-29T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-05T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-12T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-19T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-11-26T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-03T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-10T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-17T23:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: new Date('2023-12-24T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-31T23:00:00.000Z'),
          updatePossible: false,
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('Ranking: 1 week, Points: 1 week', () => {
    const system = {
      updateIntervalAmount: 1,
      updateIntervalUnit: 'weeks',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateIntervalAmountLastUpdate: new Date('2023-12-03T23:00:00.000Z'),
      calculationDayOfWeek: 1,
    } as const;

    it('Get for full', () => {
      // Assert
      const from = moment('2023-01-01');
      const to = moment('2024-01-01');

      // Act
      const result = getRankingPeriods(system, from, to);

      // Assert
      const expected = [
        {
          date: new Date('2023-01-01T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-01-08T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-01-15T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-01-22T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-01-29T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-02-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-02-12T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-02-19T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-02-26T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-12T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-19T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-03-26T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-02T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-09T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-16T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-23T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-04-30T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-05-07T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-05-14T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-05-21T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-05-28T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-06-04T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-06-11T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-06-18T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-06-25T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-02T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-09T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-16T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-23T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-07-30T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-08-06T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-08-13T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-08-20T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-08-27T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-03T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-10T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-17T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-09-24T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-01T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-08T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-15T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-22T22:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-10-29T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-05T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-12T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-19T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-11-26T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-03T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-10T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-17T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-24T23:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: new Date('2023-12-31T23:00:00.000Z'),
          updatePossible: true,
        },
      ];
      expect(result).toEqual(expected);
    });
  });
});
