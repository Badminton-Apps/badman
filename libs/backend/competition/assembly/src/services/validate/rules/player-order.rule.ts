import { Player } from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import { AssemblyOutput, AssemblyValidationData, AssemblyValidationError } from '../../../models';
import { Rule } from './_rule.base';

export type PlayerOrderRuleSingleParams = {
  player1: Partial<Player> & { ranking: number };
  player2: Partial<Player> & { ranking: number };
  game1: string;
  game2: string;
};

export type PlayerOrderRuleDoubleParams = {
  team1player1: Partial<Player> & { ranking: number };
  team1player2: Partial<Player> & { ranking: number };
  team2player1: Partial<Player> & { ranking: number };
  team2player2: Partial<Player> & { ranking: number };
  game1: string;
  game2: string;
};

export type PlayerOrderRuleParams = PlayerOrderRuleSingleParams | PlayerOrderRuleDoubleParams;

/**
 * Checks the order of the players
 *
 * Singles: players should be in order of ranking
 * Doubles: the team with the lowest ranking should be first, if the ranking is the same, the best player should be first
 */
export class PlayerOrderRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { single1, single2, single3, single4, double1, double2, double3, double4, type, system } = assembly;

    let errors = [] as AssemblyValidationError<PlayerOrderRuleParams>[];

    if (!system?.amountOfLevels) {
      throw new Error('System is not defined');
    }

    const s1 = this._checkSingle('single1', 'single2', system.amountOfLevels, single1, single2);
    if (s1) errors.push(s1);

    const s3 = this._checkSingle('single3', 'single4', system.amountOfLevels, single3, single4);
    if (s3) errors.push(s3);

    const d3 = this._checkDouble(
      type == SubEventTypeEnum.MX ? 'mix3' : 'double3',
      type == SubEventTypeEnum.MX ? 'mix4' : 'double4',
      system?.amountOfLevels,
      type == SubEventTypeEnum.MX ? 'mix' : 'double',
      double3,
      double4,
    );

    if (d3) errors.push(d3);

    if (type !== SubEventTypeEnum.MX) {
      const d1 = this._checkDouble('double1', 'double2', system?.amountOfLevels, 'double', double1, double2);
      if (d1) errors.push(d1);

      const s2 = this._checkSingle(
        'single2',
        'single3',

        system.amountOfLevels,
        single2,
        single3,
      );

      if (s2) errors.push(s2);

      const d2 = this._checkDouble('double2', 'double3', system.amountOfLevels, 'double', double2, double3);

      if (d2) errors.push(d2);
    }

    errors = errors.filter((e) => e !== undefined);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private _checkSingle(
    game1: string,
    game2: string,
    defaultRanking = 12,
    player1?: Player,
    player2?: Player,
  ): AssemblyValidationError<PlayerOrderRuleSingleParams> | undefined {
    if (!player1 || !player2) return;

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
    return;
  }

  private _checkDouble(
    game1: string,
    game2: string,
    defaultRanking = 12,
    type: 'double' | 'mix' = 'double',
    double1?: [Player | undefined, Player | undefined] | undefined,
    double2?: [Player | undefined, Player | undefined] | undefined,
  ): AssemblyValidationError<PlayerOrderRuleDoubleParams> | undefined {
    if (!double1 || !double2) return;
    if (!double1[0]?.id || !double1[1]?.id || !double2[0]?.id || !double2[1]?.id) {
      return;
    }

    let t1p1 = double1?.[0];
    let t1p2 = double1?.[1];

    let d1p1 = double1?.[0]?.rankingLastPlaces?.[0]?.[type] ?? defaultRanking;
    let d1p2 = double1?.[1]?.rankingLastPlaces?.[0]?.[type] ?? defaultRanking;

    // p1 should always be the lowest ranking
    if (d1p1 > d1p2) {
      t1p1 = double1?.[1];
      t1p2 = double1?.[0];
      d1p1 = double1?.[1]?.rankingLastPlaces?.[0]?.[type] ?? defaultRanking;
      d1p2 = double1?.[0]?.rankingLastPlaces?.[0]?.[type] ?? defaultRanking;
    }
    let t2p1 = double2?.[0];
    let t2p2 = double2?.[1];
    let d2p1 = double2?.[0]?.rankingLastPlaces?.[0]?.[type] ?? defaultRanking;
    let d2p2 = double2?.[1]?.rankingLastPlaces?.[0]?.[type] ?? defaultRanking;

    // p1 should always be the lowest ranking
    if (d2p1 > d2p2) {
      t2p1 = double2?.[1];
      t2p2 = double2?.[0];
      d2p1 = double2?.[1]?.rankingLastPlaces?.[0]?.[type] ?? defaultRanking;
      d2p2 = double2?.[0]?.rankingLastPlaces?.[0]?.[type] ?? defaultRanking;
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
