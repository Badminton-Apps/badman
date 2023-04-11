import { Player } from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import { AssemblyData, AssemblyOutput, ValidationError } from '../../../models';
import { Rule } from './_rule.base';

export class PlayerOrderRule extends Rule {
  async validate(assembly: AssemblyData): Promise<AssemblyOutput> {
    const {
      single1,
      single2,
      single3,
      single4,
      double1,
      double2,
      double3,
      double4,
      type,
      system,
    } = assembly;

    let errors = [] as ValidationError[];

    errors.push(
      this._checkSingle(
        single1,
        single2,
        'single1',
        'single2',
        system.amountOfLevels
      )
    );
    errors.push(
      this._checkSingle(
        single3,
        single4,
        'single3',
        'single4',
        system.amountOfLevels
      )
    );

    errors.push(
      this._checkDouble(
        double1,
        double2,
        'double1',
        'double2',
        system.amountOfLevels
      )
    );
    errors.push(
      this._checkDouble(
        double3,
        double4,
        'double3',
        'double4',
        system.amountOfLevels
      )
    );

    if (type !== SubEventTypeEnum.MX) {
      // Non mixed check 2 with 3
      errors.push(
        this._checkSingle(
          single2,
          single3,
          'single2',
          'single3',
          system.amountOfLevels
        )
      );
      errors.push(
        this._checkDouble(
          double2,
          double3,
          'double2',
          'double3',
          system.amountOfLevels
        )
      );
    }

    errors = errors.filter((e) => e !== undefined);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private _checkSingle(
    player1: Player,
    player2: Player,
    game1: string,
    game2: string,
    defaultRanking = 12
  ): ValidationError {
    if (!player1 || !player2) return undefined;

    const ranking1 = player1?.rankingLastPlaces?.[0]?.single ?? defaultRanking;
    const ranking2 = player2?.rankingLastPlaces?.[0]?.single ?? defaultRanking;

    if (ranking2 < ranking1) {
      return {
        message: 'all.competition.team-assembly.errors.player-order-single',
        params: {
          game1,
          game2,
          player1: {
            id: player1?.id,
            fullName: player1?.fullName,
            ranking: ranking1,
          },
          player2: {
            id: player2?.id,
            fullName: player2?.fullName,
            ranking: ranking2,
          },
        },
      };
    }
    return undefined;
  }

  private _checkDouble(
    double1: [Player, Player],
    double2: [Player, Player],
    game1: string,
    game2: string,
    defaultRanking = 12
  ): ValidationError {
    if (!double1 || !double2) return undefined;
    if (!double1[0] || !double1[1] || !double2[0] || !double2[1])
      return undefined;

    let t1p1 = double1?.[0];
    let t1p2 = double1?.[1];

    let d1p1 = double1?.[0]?.rankingLastPlaces?.[0].double ?? defaultRanking;
    let d1p2 = double1?.[1]?.rankingLastPlaces?.[0].double ?? defaultRanking;

    // p1 should always be the lowest ranking
    if (d1p1 > d1p2) {
      t1p1 = double1?.[1];
      t1p2 = double1?.[0];
      d1p1 = double1?.[1]?.rankingLastPlaces?.[0].double ?? defaultRanking;
      d1p2 = double1?.[0]?.rankingLastPlaces?.[0].double ?? defaultRanking;
    }
    let t2p1 = double2?.[0];
    let t2p2 = double2?.[1];
    let d2p1 = double2?.[0]?.rankingLastPlaces?.[0].double ?? defaultRanking;
    let d2p2 = double2?.[1]?.rankingLastPlaces?.[0].double ?? defaultRanking;

    // p1 should always be the lowest ranking
    if (d2p1 > d2p2) {
      t2p1 = double2?.[1];
      t2p2 = double2?.[0];
      d2p1 = double2?.[1]?.rankingLastPlaces?.[0].double ?? defaultRanking;
      d2p2 = double2?.[0]?.rankingLastPlaces?.[0].double ?? defaultRanking;
    }

    if (d2p1 + d2p2 < d1p1 + d1p2) {
      return {
        message: 'all.competition.team-assembly.errors.player-order-doubles',
        params: {
          game1,
          game2,
          team1player1: {
            id: t1p1.id,
            fullName: t1p1.fullName,
            ranking: d1p1,
          },
          team1player2: {
            id: t1p2.id,
            fullName: t1p2.fullName,
            ranking: d1p2,
          },
          team2player1: {
            id: t2p1.id,
            fullName: t2p1.fullName,
            ranking: d2p1,
          },
          team2player2: {
            id: t2p2.id,
            fullName: t2p2.fullName,
            ranking: d2p2,
          },
        },
      };
    } else if (d1p1 + d1p2 === d2p1 + d2p2) {
      // If the ranking is the same, the best player should be first
      const highestd1 = Math.min(d1p1, d1p2);
      const highestd2 = Math.min(d2p1, d2p2);

      if (highestd2 < highestd1) {
        return {
          message: 'all.competition.team-assembly.errors.player-order-highest',
          params: {
            game1,
            game2,
            team1player1: {
              id: t1p1.id,
              fullName: t1p1.fullName,
              ranking: d1p1,
            },
            team1player2: {
              id: t1p2.id,
              fullName: t1p2.fullName,
              ranking: d1p2,
            },
            team2player1: {
              id: t2p1.id,
              fullName: t2p1.fullName,
              ranking: d2p1,
            },
            team2player2: {
              id: t2p2.id,
              fullName: t2p2.fullName,
              ranking: d2p2,
            },
          },
        };
      }
    }

    return undefined;
  }
}
