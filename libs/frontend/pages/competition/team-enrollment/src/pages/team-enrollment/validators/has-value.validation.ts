import { AbstractControl, FormControl, ValidatorFn } from '@angular/forms';

// pass in property to validate and list of validators to run on it
export function validateProperty<T>(property: keyof T, validators: ValidatorFn[]): ValidatorFn {
  return (control: AbstractControl): { [key: string]: unknown } | null => {
    // get the value and assign it to a new form control
    const propertyVal = control.value && control.value[property];
    const newFc = new FormControl(propertyVal);
    // run the validators on the new control and keep the ones that fail
    const failedValidators = validators.map((v) => v(newFc)).filter((v) => !!v);
    // if any fail, return the list of failures, else valid
    return failedValidators.length ? { [`${property.toString()}`]: failedValidators } : null;
  };
}
