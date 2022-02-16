import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, AbstractControlOptions, FormControl, FormGroup, ValidatorFn } from '@angular/forms';

@Component({
  selector: 'app-select-base',
  template: `<div>This shouldn't be here</div>`,
})
export abstract class SelectBaseComponent implements OnInit, OnDestroy {
  @Input()
  controlName!: string;

  @Input()
  formGroup!: FormGroup;

  @Input()
  dependsOn?: string;

  @Input()
  validators?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null;

  formControl!: AbstractControl;

  ngOnInit(): void {
    if (!this.formGroup) {
      throw Error(`FormGroup is required`);
    }

    if (!this.formControl) {
      this.formControl = new FormControl(null, this.validators);
    }
    if (this.formGroup.get(this.controlName) === null) {
      this.formGroup.addControl(this.controlName, this.formControl);
    } else {
      this.formControl = this.formGroup.get(this.controlName)!;
    }

    if ((this.dependsOn?.length ?? 0) > 0) {
      const previous = this.formGroup.get(this.dependsOn!);
      if (!previous) {
        console.error(`Dependency ${this.dependsOn} not found`, previous);
        throw Error(`Dependency ${this.dependsOn} not found`);
      }
    }
  }

  ngOnDestroy() {
    this.formGroup.removeControl(this.controlName);
  }
}
