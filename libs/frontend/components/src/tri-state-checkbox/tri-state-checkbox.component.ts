import { Component, forwardRef, Input } from "@angular/core";
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from "@angular/forms";
import {
  MatCheckboxDefaultOptions,
  MAT_CHECKBOX_DEFAULT_OPTIONS,
  MatCheckboxModule,
} from "@angular/material/checkbox";

@Component({
  selector: "badman-tri-state-checkbox",
  template: `<mat-checkbox
    [ngModel]="value"
    (click)="next()"
    [disabled]="disabled"
    [indeterminate]="value === null"
    [checked]="value === true"
  >
    <ng-content></ng-content>
  </mat-checkbox>`,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TriStateCheckboxComponent),
      multi: true,
    },
    {
      provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
      useValue: { clickAction: "noop" } as MatCheckboxDefaultOptions,
    },
  ],
  standalone: true,
  imports: [MatCheckboxModule, FormsModule],
})
export class TriStateCheckboxComponent implements ControlValueAccessor {
  @Input() tape = [null, true, false];

  value: boolean | null = false;

  disabled = false;

  private onChange!: (val: boolean | null) => void;
  private onTouched!: () => void;

  writeValue(value: any) {
    this.value = value !== undefined && value !== null ? value : this.tape[0];
  }

  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
  }

  next() {
    this.onChange((this.value = this.tape[(this.tape.indexOf(this.value) + 1) % this.tape.length]));
    this.onTouched();
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }
}
