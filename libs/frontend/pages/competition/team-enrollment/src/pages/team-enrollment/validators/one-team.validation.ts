import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Team } from '@badman/frontend-models';
import { SubEventType } from '@badman/utils';

export function minAmountOfTeams(minAmount: number): ValidatorFn {
  return (control: AbstractControl<{ [key in SubEventType]: Team[] }>): ValidationErrors | null => {
    // we need in one of the keys to have at least one team
    const teams = Object.values(control.value).reduce((acc, teams) => acc + teams.length, 0);

    return teams >= minAmount ? null : { minAmountOfTeams: true };
  };
}
