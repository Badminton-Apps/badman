import { FormGroup, FormControl } from '@angular/forms';
import * as moment from 'moment';

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

export const compPeriod = (year?: number) => {
  if (!year) {
    year = currentCompetitionYear();
  }
  return [`${year}-08-01`, `${year + 1}-07-01`];
};

export const currentCompetitionYear = (override?: number) => {
  if (override) {
    return override;
  }

  const today = moment();

  return today.month() >= 6 ? today.year() : today.year() - 1;
};

