import { Player } from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import { AssemblyValidationData, AssemblyOutput, AssemblyValidationError } from '../../../models';
import { Rule } from './_rule.base';

export type PlayerGenderRuleIndividualParams = {
  gender: string;
  player: Partial<Player>;
};
export type PlayerGenderRulePartnerParams = {
  game: string;
  player1: Partial<Player>;
  player2: Partial<Player>;
};
export type PlayerGenderRuleParams =
  | PlayerGenderRuleIndividualParams
  | PlayerGenderRulePartnerParams;

/**
 * Checks if the player is the correct gender
 */
export class PlayerGenderRule extends Rule {
  static override readonly description = 'all.rules.team-assembly.player-gender';

  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { single1, single2, single3, single4, double1, double2, double3, double4, type } =
      assembly;

    const errors = [] as AssemblyValidationError<PlayerGenderRuleParams>[];

    if (type == SubEventTypeEnum.M) {
      errors.push(
        ...this._checkGender(
          [
            single1,
            single2,
            single3,
            single4,

            ...(double1 ?? []),
            ...(double2 ?? []),
            ...(double3 ?? []),
            ...(double4 ?? []),
          ],
          'M',
        ),
      );
    } else if (type == SubEventTypeEnum.F) {
      errors.push(
        ...this._checkGender(
          [
            single1,
            single2,
            single3,
            single4,

            ...(double1 ?? []),
            ...(double2 ?? []),
            ...(double3 ?? []),
            ...(double4 ?? []),
          ],
          'F',
        ),
      );
    } else {
      errors.push(...this._checkGender([single1, single2, ...(double1 ?? [])], 'M'));
      errors.push(...this._checkGender([single3, single4, ...(double2 ?? [])], 'F'));

      if (double4?.[0] && double4?.[1] && double4?.[0].gender == double4?.[1].gender) {
        errors.push({
          message: 'all.v1.teamFormation.errors.player-genders',
          params: {
            game: 'double4',
            player1: {
              id: double4[0]?.id,
              fullName: double4[0]?.fullName,
              gender: double4[0]?.gender,
            },
            player2: {
              id: double4[1]?.id,
              fullName: double4[1]?.fullName,
              gender: double4[1]?.gender,
            },
          } as PlayerGenderRulePartnerParams,
        });
      }

      // in doubles 3 and 4 we should have a F and M player
      if (double3?.[0] && double3?.[1] && double3?.[0].gender == double3?.[1].gender) {
        errors.push({
          message: 'all.v1.teamFormation.errors.player-genders',
          params: {
            game: 'double3',
            player1: {
              id: double3[0]?.id,
              fullName: double3[0]?.fullName,
              gender: double3[0]?.gender,
            },
            player2: {
              id: double3[1]?.id,
              fullName: double3[1]?.fullName,
              gender: double3[1]?.gender,
            },
          } as PlayerGenderRulePartnerParams,
        });
      }

      if (double4?.[0] && double4?.[1] && double4?.[0].gender == double4?.[1].gender) {
        errors.push({
          message: 'all.v1.teamFormation.errors.player-genders',
          params: {
            game: 'double4',
            player1: {
              id: double4[0]?.id,
              fullName: double4[0]?.fullName,
              gender: double4[0]?.gender,
            },
            player2: {
              id: double4[1]?.id,
              fullName: double4[1]?.fullName,
              gender: double4[1]?.gender,
            },
          } as PlayerGenderRulePartnerParams,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private _checkGender(
    players: (Player | undefined)[],
    gender: string,
  ): AssemblyValidationError<PlayerGenderRuleIndividualParams>[] {
    const uniquePlayers = [...new Set(players?.filter((p) => p != undefined && p != null))];
    const wrong = uniquePlayers?.filter((p) => p?.gender != gender);
    if (wrong) {
      return wrong.map((p) => ({
        message: 'all.v1.teamFormation.errors.player-gender',
        params: {
          player: {
            id: p?.id,
            fullName: p?.fullName,
            gender: p?.gender,
          },
          gender,
        },
      }));
    }
    return [];
  }
}
