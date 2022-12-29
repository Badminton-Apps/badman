import { Player, SubEventType } from '@badman/backend-database';
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
    } = assembly;

    let errors = [] as ValidationError[];

    errors.push(this._checkSingle(single1, single2, 'single2'));
    errors.push(this._checkSingle(single3, single4, 'single4'));

    errors.push(this._checkDouble(double1, double2, 'double2'));
    errors.push(this._checkDouble(double3, double4, 'double4'));

    if (type !== SubEventType.MX) {
      // Non mixed check 2 with 3
      errors.push(this._checkSingle(single2, single3, 'single3'));
      errors.push(this._checkDouble(double2, double3, 'double3'));
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
    game: string
  ): ValidationError {
    const ranking1 = player1?.rankingLastPlaces?.[0]?.single;
    const ranking2 = player2?.rankingLastPlaces?.[0]?.single;

    if (ranking2 < ranking1) {
      return {
        message: 'competition.team-assembly.errors.player-order-single',
        params: {
          game,
          player1: {
            id: player1?.id,
            fullName: player1.fullName,
            ranking: ranking1,
          },
          player2: {
            id: player2?.id,
            fullName: player2.fullName,
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
    game: string
  ): ValidationError {
    let t1p1 = double1?.[0];
    let t1p2 = double1?.[1];

    let d1p1 = double1?.[0]?.rankingLastPlaces?.[0].double;
    let d1p2 = double1?.[1]?.rankingLastPlaces?.[0].double;

    // p1 should always be the lowest ranking
    if (d1p1 > d1p2) {
      t1p1 = double1?.[1];
      t1p2 = double1?.[0];
      d1p1 = double1?.[1]?.rankingLastPlaces?.[0].double;
      d1p2 = double1?.[0]?.rankingLastPlaces?.[0].double;
    }
    let t2p1 = double2?.[0];
    let t2p2 = double2?.[1];
    let d2p1 = double2?.[0]?.rankingLastPlaces?.[0].double;
    let d2p2 = double2?.[1]?.rankingLastPlaces?.[0].double;

    // p1 should always be the lowest ranking
    if (d2p1 > d2p2) {
      t2p1 = double2?.[1];
      t2p2 = double2?.[0];
      d2p1 = double2?.[1]?.rankingLastPlaces?.[0].double;
      d2p2 = double2?.[0]?.rankingLastPlaces?.[0].double;
    }

    if (d2p1 + d2p2 < d1p1 + d1p2) {
      return {
        message: 'competition.team-assembly.errors.player-order-doubles',
        params: {
          game,
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
          message: 'competition.team-assembly.errors.player-order-highest',
          params: {
            game,
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
