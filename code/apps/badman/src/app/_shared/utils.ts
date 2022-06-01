import { FormGroup, FormControl } from '@angular/forms';
import { SortDirection } from '@angular/material/sort';
import { CompetitionSubEvent } from './models';

export const validateAllFormFields = (formGroup: FormGroup) => {
  Object.keys(formGroup.controls).forEach((field) => {
    const control = formGroup.get(field);
    if (control instanceof FormControl) {
      control.markAsTouched({ onlySelf: true });
    } else if (control instanceof FormGroup) {
      validateAllFormFields(control);
    }
  });
};

export const resetAllFormFields = (formGroup: FormGroup) => {
  Object.keys(formGroup.controls).forEach((field) => {
    const control = formGroup.get(field);
    if (control instanceof FormControl) {
      control.markAsUntouched({ onlySelf: true });
      control.reset();
      control.setErrors(null);
    } else if (control instanceof FormGroup) {
      resetAllFormFields(control);
    }
  });
};

export const sortSubEvents = (
  a: CompetitionSubEvent,
  b: CompetitionSubEvent
) => {
  if (a.eventType === b.eventType) {
    return (a.level ?? 0) - (b.level ?? 0);
  }

  return (a.eventType ?? '').localeCompare(b.eventType ?? '');
};

export interface pageArgs {
  take?: number;
  skip?: number;
  query?: string;
  order?: { field: string; direction: SortDirection | 'ASC' | 'DESC' }[];
  ids?: string[];
}
