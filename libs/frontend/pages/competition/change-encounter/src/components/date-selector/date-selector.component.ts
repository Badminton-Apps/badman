import { FocusMonitor } from '@angular/cdk/a11y';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  inject,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  FormsModule,
  NgControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatFormFieldControl, MAT_FORM_FIELD } from '@angular/material/form-field';
import moment, { Moment } from 'moment';
import { Subject } from 'rxjs';
import { CalendarComponent } from '../calendar';
import { CommonModule } from '@angular/common';
import { MomentModule } from 'ngx-moment';
import { input } from '@angular/core';

const selector = 'badman-date-selector';

@Component({
  selector,
  templateUrl: './date-selector.component.html',
  styleUrls: ['./date-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: MatFormFieldControl, useExisting: DateSelectorComponent }],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MomentModule],
})
export class DateSelectorComponent
  implements
    ControlValueAccessor,
    MatFormFieldControl<{
      date: Moment;
      locationId: string;
    }>,
    OnDestroy
{
  private _focusMonitor = inject(FocusMonitor);
  private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef<HTMLElement>);
  private ref = inject(ChangeDetectorRef);
  public _formField = inject<MatFormField>(MAT_FORM_FIELD, { optional: true });
  public ngControl = inject(NgControl, { optional: true, self: true });
  private _dialog = inject(MatDialog);
  static nextId = 0;
  private _placeholder?: string;
  private _required = false;
  private _disabled = false;

  home = input(false);

  homeClubId = input<string | undefined>();

  awayClubId = input<string | undefined>();

  homeTeamId = input<string | undefined>();

  awayTeamId = input<string | undefined>();

  // userAriaDescribedBy = input<string | undefined>(undefined, { alias: 'aria-describedby' });

  dateControl: FormControl;

  stateChanges = new Subject<void>();
  focused = false;
  touched = false;
  controlType = selector;
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

  @HostBinding('class.floating')
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
    if (this._disabled) {
      this.dateControl.disable();
    } else {
      this.dateControl.enable();
    }
    this.stateChanges.next();
  }

  @Input()
  get value(): {
    date: Moment;
    locationId: string;
  } | null {
    if (this.dateControl.valid) {
      return this.dateControl.value;
    }
    return null;
  }

  set value(dateInput: { date: Moment; locationId: string } | null) {
    const date = dateInput?.date || moment();
    this.dateControl.setValue({ date, locationId: dateInput?.locationId });

    this.stateChanges.next();
  }

  get errorState(): boolean {
    return this.dateControl.invalid && this.touched;
  }

  constructor() {
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
    if (this.disabled) {
      return;
    }

    const date = moment(this.value?.date);

    this._dialog
      .open(CalendarComponent, {
        width: '95vw',
        maxWidth: '95vw',
        data: {
          homeClubId: this.homeClubId(),
          awayClubId: this.awayClubId(),
          awayTeamId: this.awayTeamId(),
          homeTeamId: this.homeTeamId(),
          date,
          locationId: this.value?.locationId,
          home: this.home(),
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const { date, locationId } = result;
        if (date) {
          this.value = {
            date: moment(date),
            locationId,
          };
          this._handleInput();
        }
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

  setDescribedByIds(ids: string[]) {
    const controlElement = this._elementRef.nativeElement.querySelector('.date-selector-container');
    if (controlElement) {
      controlElement.setAttribute('aria-describedby', ids.join(' '));
    }
  }

  onContainerClick() {
    this.dateControl.markAsTouched();
  }

  writeValue(
    date: {
      date: Moment;
      locationId: string;
    } | null,
  ): void {
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
