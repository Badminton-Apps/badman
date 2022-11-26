import { Player, SubEventType } from '@badman/backend-database';
import { AssemblyData, AssemblyOutput, ValidationError } from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks 
 */
export class PlayerGenderRule extends Rule {
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

    const errors = [] as ValidationError[];

    if (type == SubEventType.M) {
      errors.push(
        ...this._checkGender(
          [
            single1,
            single2,
            single3,
            single4,

            ...double1,
            ...double2,
            ...double3,
            ...double4,
          ],
          'M'
        )
      );
    } else if (type == SubEventType.F) {
      errors.push(
        ...this._checkGender(
          [
            single1,
            single2,
            single3,
            single4,

            ...double1,
            ...double2,
            ...double3,
            ...double4,
          ],
          'F'
        )
      );
    } else {
      errors.push(...this._checkGender([single1, single2, ...double1], 'M'));
      errors.push(...this._checkGender([single3, single4, ...double2], 'F'));

      // in doubles 3 and 4 we should have a F and M player
      if (double3[0] && double3[1] && double3[0].gender == double3[1].gender) {
        errors.push({
          message: 'team-assembly.error.player-genders',
          params: {
            game: 'double3',
            player1: double3[0]?.fullName,
            player2: double3[1]?.fullName,
            gender: double3[0]?.gender,
          },
        });
      }

      if (double4[0] && double4[1] && double4[0].gender == double4[1].gender) {
        errors.push({
          message: 'team-assembly.error.player-genders',
          params: {
            game: 'double4',
            player1: double4[0]?.fullName,
            player2: double4[1]?.fullName,
            gender: double4[0]?.gender,
          },
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private _checkGender(players: Player[], gender: string): ValidationError[] {
    const uniquePlayers = [...new Set(players?.filter((p) => p != undefined))];
    const wrong = uniquePlayers?.filter((p) => p?.gender != gender);
    if (wrong) {
      return wrong.map((p) => ({
        message: 'team-assembly-error.player-gender',
        params: {
          fullName: p?.fullName,
          gender,
        },
      }));
    }
    return [];
  }
}
