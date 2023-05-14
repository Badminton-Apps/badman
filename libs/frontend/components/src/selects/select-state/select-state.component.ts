import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import statesList from './states.json';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { startWith, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'badman-select-state',
  standalone: true,
  imports: [
    CommonModule,
    MatSelectModule,
    TranslateModule,
    ReactiveFormsModule,
  ],
  templateUrl: './select-state.component.html',
  styleUrls: ['./select-state.component.scss'],
})
export class SelectCountrystateComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();

  states: {
    code: string;
    name: string;
    country: string;
  }[] = [];

  @Input({ required: true })
  group!: FormGroup;

  @Input()
  controlName = 'state';

  @Input()
  dependsOn = 'country';

  @Input()
  control: FormControl = new FormControl();

  ngOnInit(): void {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormControl<string>;
    }

    if (!this.control) {
      this.control = new FormControl<string | null>('be');
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }

    const previous = this.group?.get(this.dependsOn);
    if (!previous) {
      console.warn(`Dependency ${this.dependsOn} not found`, previous);
    } else {
      previous.valueChanges
        .pipe(startWith(previous.value), takeUntil(this.destroy$))
        .subscribe((value) => {
          this.states = statesList?.filter(
            (state) => state.country === value
          );
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
