import moment from 'moment-timezone';
import { getRankingPeriods } from './get-ranking-periods';

describe('getRankingPeriods', () => {
  // set global moment timezone
  moment.tz.setDefault('UTC');

  describe('Ranking: 1 month, Points: 1 week', () => {
    const system = {
      updateIntervalAmount: 1,
      updateIntervalUnit: 'months',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateIntervalAmountLastUpdate: moment(
        '2023-12-03T00:00:00.000Z',
      ).toDate(),
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
          date: moment('2023-01-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-02-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-01T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-05T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-07T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-04T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-04T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2024-01-01T00:00:00.000Z'),
          updatePossible: true,
        },
      ];
      expect(
        result.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      ).toEqual(
        expected.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      );
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
          date: moment('2023-01-02T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-09T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-16T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-23T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-30T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-06T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-13T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-20T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-27T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-06T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-13T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-20T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-27T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-03T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-10T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-17T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-24T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-01T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-08T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-15T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-22T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-29T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-05T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-12T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-19T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-26T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-03T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-10T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-17T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-24T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-31T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-07T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-14T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-21T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-28T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-04T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-11T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-18T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-25T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-02T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-09T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-16T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-23T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-30T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-06T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-13T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-20T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-27T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-04T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-11T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-18T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-25T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2024-01-01T00:00:00.000Z'),
          updatePossible: false,
        },
      ];
      expect(
        result.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      ).toEqual(
        expected.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      );
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
          date: moment('2023-01-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-01-09T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-16T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-23T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-30T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-02-13T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-20T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-27T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-13T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-20T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-27T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-10T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-17T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-24T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-01T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-08T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-15T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-22T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-29T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-05T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-12T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-19T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-26T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-10T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-17T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-24T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-31T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-07T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-14T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-21T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-28T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-04T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-11T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-18T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-25T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-09T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-16T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-23T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-30T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-13T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-20T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-27T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-04T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-11T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-18T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-25T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2024-01-01T00:00:00.000Z'),
          updatePossible: true,
        },
      ];
      expect(
        result.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      ).toEqual(
        expected.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      );
    });

    describe('last update based on dates', () => {
      const expected = [
        {
          date: moment('2023-04-03T00:00:00.000Z'),
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

        expect(
          result.map((r) => ({
            date: r.date.toISOString(),
            updatePossible: r.updatePossible,
          })),
        ).toEqual(
          expected.map((r) => ({
            date: r.date.toISOString(),
            updatePossible: r.updatePossible,
          })),
        );
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
        expect(
          result.map((r) => ({
            date: r.date.toISOString(),
            updatePossible: r.updatePossible,
          })),
        ).toEqual(
          expected.map((r) => ({
            date: r.date.toISOString(),
            updatePossible: r.updatePossible,
          })),
        );
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
        expect(
          result.map((r) => ({
            date: r.date.toISOString(),
            updatePossible: r.updatePossible,
          })),
        ).toEqual(
          expected.map((r) => ({
            date: r.date.toISOString(),
            updatePossible: r.updatePossible,
          })),
        );
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
      updateIntervalAmountLastUpdate: moment(
        '2023-12-03T00:00:00.000Z',
      ).toDate(),
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
          date: moment('2023-01-02T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-06T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-01T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-05T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-03T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-07T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-04T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-06T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-04T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2024-01-01T00:00:00.000Z'),
          updatePossible: false,
        },
      ];
      expect(
        result.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      ).toEqual(
        expected.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      );
    });
  });

  describe('Ranking: 2 month, Points: 1 week', () => {
    const system1Month = {
      updateIntervalAmount: 2,
      updateIntervalUnit: 'months',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateIntervalAmountLastUpdate: moment(
        '2023-12-03T00:00:00.000Z',
      ).toDate(),
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
          date: moment('2023-02-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-05T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-07T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-04T00:00:00.000Z'),
          updatePossible: true,
        },
      ];
      expect(
        result.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      ).toEqual(
        expected.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      );
    });
  });

  describe('Ranking: 2 week, Points: 1 week', () => {
    const system = {
      updateIntervalAmount: 2,
      updateIntervalUnit: 'weeks',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateIntervalAmountLastUpdate: moment(
        '2023-12-03T00:00:00.000Z',
      ).toDate(),
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
          date: moment('2023-01-02T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-09T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-01-16T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-01-23T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-01-30T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-02-13T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-02-20T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-02-27T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-13T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-03-20T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-27T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-10T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-04-17T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-24T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-01T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-08T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-15T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-22T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-05-29T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-05T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-12T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-19T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-06-26T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-03T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-10T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-17T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-07-24T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-31T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-07T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-14T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-08-21T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-28T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-04T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-11T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-09-18T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-25T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-09T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-16T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-23T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-10-30T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-06T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-13T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-20T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-11-27T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-04T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-11T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-18T00:00:00.000Z'),
          updatePossible: false,
        },
        {
          date: moment('2023-12-25T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2024-01-01T00:00:00.000Z'),
          updatePossible: false,
        },
      ];
      expect(
        result.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      ).toEqual(
        expected.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      );
    });
  });

  describe('Ranking: 1 week, Points: 1 week', () => {
    const system = {
      updateIntervalAmount: 1,
      updateIntervalUnit: 'weeks',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateIntervalAmountLastUpdate: moment(
        '2023-12-03T00:00:00.000Z',
      ).toDate(),
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
          date: moment('2023-01-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-01-09T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-01-16T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-01-23T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-01-30T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-02-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-02-13T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-02-20T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-02-27T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-13T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-20T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-03-27T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-10T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-17T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-04-24T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-01T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-08T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-15T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-22T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-05-29T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-05T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-12T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-19T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-06-26T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-03T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-10T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-17T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-24T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-07-31T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-07T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-14T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-21T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-08-28T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-04T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-11T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-18T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-09-25T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-02T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-09T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-16T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-23T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-10-30T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-06T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-13T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-20T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-11-27T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-04T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-11T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-18T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2023-12-25T00:00:00.000Z'),
          updatePossible: true,
        },
        {
          date: moment('2024-01-01T00:00:00.000Z'),
          updatePossible: true,
        },
      ];

      expect(
        result.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      ).toEqual(
        expected.map((r) => ({
          date: r.date.toISOString(),
          updatePossible: r.updatePossible,
        })),
      );
    });
  });
});
