import { FocusMonitor } from '@angular/cdk/a11y';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  ViewChild,
  ElementRef,
  Inject,
  OnDestroy,
  Optional,
  Self,
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormBuilder, FormControl, NgControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldControl, MAT_FORM_FIELD, MatFormField } from '@angular/material/form-field';
import { Club, TimePickerInput } from 'app/_shared';
import * as moment from 'moment';
import { Moment } from 'moment';
import { Subject } from 'rxjs';
import { CalendarComponent } from '../calendar';

const selector = 'app-date-selector';

@Component({
  selector,
  templateUrl: './date-selector.component.html',
  styleUrls: ['./date-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateSelectorComponent implements ControlValueAccessor, MatFormFieldControl<Moment>, OnDestroy {
  static nextId = 0;

  @Input()
  club?: string;

  dateControl: FormControl;

  stateChanges = new Subject<void>();
  focused = false;
  touched = false;
  id = `${selector}-${DateSelectorComponent.nextId++}`;
  onChange = (_: any) => {};
  onTouched = () => {};

  get empty() {
    return !this.dateControl;
  }

  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  @Input('aria-describedby') userAriaDescribedBy?: string;

  @Input()
  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(value: string) {
    this._placeholder = value;
    this.stateChanges.next();
  }
  private _placeholder!: string;

  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
    this.stateChanges.next();
  }
  private _required = false;

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
    this._disabled ? this.dateControl.disable() : this.dateControl.enable();
    this.stateChanges.next();
  }
  private _disabled = false;

  @Input()
  get value(): Moment | null {
    if (this.dateControl.valid) {
      return this.dateControl.value;
    }
    return null;
  }
  set value(tel: Moment | null) {
    const t = tel || moment();
    this.dateControl.setValue(t);
    this.stateChanges.next();
  }

  get errorState(): boolean {
    return this.dateControl.invalid && this.touched;
  }

  constructor(
    private _focusMonitor: FocusMonitor,
    private _elementRef: ElementRef<HTMLElement>,
    @Optional() @Inject(MAT_FORM_FIELD) public _formField: MatFormField,
    @Optional() @Self() public ngControl: NgControl,
    private _dialog: MatDialog
  ) {
    this.dateControl = new FormControl(null, [Validators.required]);

    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }

  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this._focusMonitor.stopMonitoring(this._elementRef);
  }

  onFocusIn(event: FocusEvent) {
    if (!this.focused) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onClick(event: Event) {
    this._dialog.open(CalendarComponent, {
      data: {
        clubId: this.club,
      },
    });
  }

  onFocusOut(event: FocusEvent) {
    if (!this._elementRef.nativeElement.contains(event.relatedTarget as Element)) {
      this.touched = true;
      this.focused = false;
      this.onTouched();
      this.stateChanges.next();
    }
  }

  autoFocusNext(control: AbstractControl, nextElement?: HTMLInputElement): void {
    if (!control.errors && nextElement) {
      this._focusMonitor.focusVia(nextElement, 'program');
    }
  }

  autoFocusPrev(control: AbstractControl, prevElement: HTMLInputElement, minLength = 1): void {
    if ((control.value?.length ?? 0) < minLength) {
      this._focusMonitor.focusVia(prevElement, 'program');
    }
  }

  setDescribedByIds(ids: string[]) {
    const controlElement = this._elementRef.nativeElement.querySelector('.app-time-picker-input-container')!;
    controlElement.setAttribute('aria-describedby', ids.join(' '));
  }

  onContainerClick() {}

  writeValue(tel: Moment | null): void {
    this.value = tel;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  _handleInput(control: AbstractControl): void {
    this.onChange(this.value);
  }
}
