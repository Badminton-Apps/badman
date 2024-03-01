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
      updateLastUpdate: moment('2023-12-03T00:00:00.000Z').toDate(),
      calculationDayOfWeek: 1,
    } as const;

    test('Get for full year only update', () => {
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

    test('Get for full year only update', () => {
      // Assert
      const from = moment('2024-01-01');
      const to = moment('2024-01-31');

      // Act
      const result = getRankingPeriods(system, from, to, {});

      // Assert
      const expected = [
        {
          date: moment('2024-01-01'),
          updatePossible: true,
        },
        {
          date: moment('2024-01-08'),
          updatePossible: false,
        },
        {
          date: moment('2024-01-15'),
          updatePossible: false,
        },
        {
          date: moment('2024-01-22'),
          updatePossible: false,
        },
        {
          date: moment('2024-01-29'),
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

    test('Get for full year only calculation', () => {
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

    test('Get for full', () => {
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

    const cases = [
      ['2023-12-20', 0, undefined],
      ['2023-12-21', 0, undefined],
      ['2023-12-22', 0, undefined],
      ['2023-12-23', 0, undefined],
      ['2023-12-24', 0, undefined],
      ['2023-12-25', 1, false],
      ['2023-12-26', 0, undefined],
      ['2023-12-27', 0, undefined],
      ['2023-12-28', 0, undefined],
      ['2023-12-29', 0, undefined],
      ['2023-12-30', 0, undefined],
      ['2023-12-31', 0, undefined],
      ['2024-01-01', 1, true],
      ['2024-01-02', 0, undefined],
      ['2024-01-03', 0, undefined],
      ['2024-01-04', 0, undefined],
      ['2024-01-05', 0, undefined],
      ['2024-01-06', 0, undefined],
      ['2024-01-07', 0, undefined],
      ['2024-01-08', 1, false],
      ['2024-01-09', 0, undefined],
      ['2024-01-10', 0, undefined],
      ['2024-01-11', 0, undefined],
      ['2024-01-12', 0, undefined],
      ['2024-01-13', 0, undefined],
      ['2024-01-14', 0, undefined],
      ['2024-01-15', 1, false],
      ['2024-01-16', 0, undefined],
      ['2024-01-17', 0, undefined],
      ['2024-01-18', 0, undefined],
      ['2024-01-19', 0, undefined],
      ['2024-01-20', 0, undefined],
    ] as const;

    // Validate some manual updates, so we know the daily also works
    test.each(cases)(
      'For date %s should be %i updates and updatePossible %s',
      (date: string, length: number, updatePossible?: boolean) => {
        // Assert
        const from = moment(date, 'YYYY-MM-DD');
        const to = moment(date, 'YYYY-MM-DD');

        // Act
        const result = getRankingPeriods(system, from, to);

        // Assert
        expect(result.length).toEqual(length);

        if (updatePossible !== undefined) {
          expect(result[0].updatePossible).toEqual(updatePossible);
        }
      },
    );

    describe('last update based on dates', () => {
      const expected = [
        {
          date: moment('2023-04-03T00:00:00.000Z'),
          updatePossible: true,
        },
      ];
      const from = moment('2023-03-01');
      const to = moment('2023-04-30');

      test('last update before from', () => {
        // Assert

        const s = {
          ...system,
          updateLastUpdate: moment('2023-02-01').toDate(),
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

      test('last update after from', () => {
        // Assert
        const s = {
          ...system,
          updateLastUpdate: moment('2023-06-01').toDate(),
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

      test('last update betweeen', () => {
        // Assert
        const s = {
          ...system,
          updateLastUpdate: moment('2023-02-01').toDate(),
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
    const system = {
      updateIntervalAmount: 2,
      updateIntervalUnit: 'months',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'months',
      updateLastUpdate: moment('2023-12-03T00:00:00.000Z').toDate(),
      calculationDayOfWeek: 1,
    } as const;

    test('Get for full year', () => {
      // Assert
      const from = moment('2022-12-31');
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
    const system = {
      updateIntervalAmount: 2,
      updateIntervalUnit: 'months',
      updateDayOfWeek: 1,
      calculationIntervalAmount: 1,
      calculationIntervalUnit: 'weeks',
      updateLastUpdate: moment('2023-12-03T00:00:00.000Z').toDate(),
      calculationDayOfWeek: 1,
    } as const;

    test('Get for full year', () => {
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
      updateLastUpdate: moment('2023-12-03T00:00:00.000Z').toDate(),
      calculationDayOfWeek: 1,
    } as const;

    test('Get for full', () => {
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
      updateLastUpdate: moment('2023-12-03T00:00:00.000Z').toDate(),
      calculationDayOfWeek: 1,
    } as const;

    test('Get for full', () => {
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
