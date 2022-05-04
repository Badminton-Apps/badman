import { FormGroup, FormControl } from '@angular/forms';

export const validateAllFormFields = (formGroup: FormGroup) => {
  Object.keys(formGroup.controls).forEach((field) => {
    const control = formGroup.get(field);
    if (control instanceof FormControl) {
      control.markAsTouched({ onlySelf: true });
    } else if (control instanceof FormGroup) {
      validateAllFormFields(control);
    }
  });
}

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
}
