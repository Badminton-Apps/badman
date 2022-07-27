import { FocusMonitor } from '@angular/cdk/a11y';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, Input,
  OnDestroy,
  Optional,
  Self
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NgControl,
  Validators
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import {
  MatFormFieldControl
} from '@angular/material/form-field';
import moment, { Moment } from 'moment';
import { Subject } from 'rxjs';
import { CalendarComponent } from '../calendar';

const selector = 'badman-date-selector';

@Component({
  selector,
  templateUrl: './date-selector.component.html',
  styleUrls: ['./date-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateSelectorComponent
  implements ControlValueAccessor, MatFormFieldControl<Moment>, OnDestroy
{
  static nextId = 0;
  private _placeholder?: string;
  private _required = false;
  private _disabled = false;

  @Input()
  home = false;

  @Input()
  homeClubId?: string;

  @Input()
  awayClubId?: string;

  @Input()
  homeTeamId?: string;

  @Input()
  awayTeamId?: string;

  // eslint-disable-next-line @angular-eslint/no-input-rename
  @Input('aria-describedby')
  userAriaDescribedBy?: string;

  dateControl: FormControl;

  stateChanges = new Subject<void>();
  focused = false;
  touched = false;
  id = `${selector}-${DateSelectorComponent.nextId++}`;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange = (_: unknown) => {
    //
  };
  onTouched = () => {
    //
  };

  get empty() {
    return !this.dateControl;
  }

  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  @Input()
  get placeholder(): string {
    return this._placeholder ?? '';
  }
  set placeholder(value: string) {
    this._placeholder = value;
    this.stateChanges.next();
  }

  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
    this.stateChanges.next();
  }

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
    this._disabled ? this.dateControl.disable() : this.dateControl.enable();
    this.stateChanges.next();
  }

  @Input()
  get value(): Moment | null {
    if (this.dateControl.valid) {
      return this.dateControl.value;
    }
    return null;
  }
  set value(dateInput: Moment | null) {
    const date = dateInput || moment();
    this.dateControl.setValue(date);
    this.stateChanges.next();
  }

  get errorState(): boolean {
    return this.dateControl.invalid && this.touched;
  }

  constructor(
    private _focusMonitor: FocusMonitor,
    private _elementRef: ElementRef<HTMLElement>,
    private ref: ChangeDetectorRef,
    @Optional() @Self() public ngControl: NgControl,
    private _dialog: MatDialog
  ) {

    this.dateControl = new FormControl(null, [Validators.required]);

    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }

    this.stateChanges.subscribe(() => this.ref.markForCheck());
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this._focusMonitor.stopMonitoring(this._elementRef);
  }

  onFocusIn() {
    if (!this.focused) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onClick() {
    const date = moment(this.value);

    this._dialog
      .open(CalendarComponent, {
        width: '80vw',
        data: {
          homeClubId: this.homeClubId,
          awayClubId: this.awayClubId,
          awayTeamId: this.awayTeamId,
          homeTeamId: this.homeTeamId,
          date,
          home: this.home,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.value = moment(result);
        }
      });
  }

  onFocusOut(event: FocusEvent) {
    if (
      !this._elementRef.nativeElement.contains(event.relatedTarget as Element)
    ) {
      this.touched = true;
      this.focused = false;
      this.onTouched();
      this.stateChanges.next();
    }
  }

  autoFocusNext(
    control: AbstractControl,
    nextElement?: HTMLInputElement
  ): void {
    if (!control.errors && nextElement) {
      this._focusMonitor.focusVia(nextElement, 'program');
    }
  }

  autoFocusPrev(
    control: AbstractControl,
    prevElement: HTMLInputElement,
    minLength = 1
  ): void {
    if ((control.value?.length ?? 0) < minLength) {
      this._focusMonitor.focusVia(prevElement, 'program');
    }
  }

  setDescribedByIds(ids: string[]) {
    const controlElement = this._elementRef.nativeElement.querySelector(
      '.app-time-picker-input-container'
    );
    if (controlElement) {
      controlElement.setAttribute('aria-describedby', ids.join(' '));
    }
  }

  onContainerClick() {
    this.dateControl.markAsTouched();
  }

  writeValue(date: Moment | null): void {
    this.value = date;
  }

  registerOnChange(fn: (_: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  _handleInput(): void {
    this.onChange(this.value);
  }
}
