import { CommonModule } from '@angular/common';
import { Component, OnInit, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { startWith, takeUntil } from 'rxjs/operators';
import statesList from './states.json';

@Component({
  selector: 'badman-select-state',
  standalone: true,
  imports: [CommonModule, MatSelectModule, TranslateModule, ReactiveFormsModule],
  templateUrl: './select-state.component.html',
  styleUrls: ['./select-state.component.scss'],
})
export class SelectCountrystateComponent implements OnInit {
  private destroy$ = injectDestroy();

  states: {
    code: string;
    name: string;
    country: string;
  }[] = [];

  group = input.required<FormGroup>();

  controlName = input('state');

  dependsOn = input('country');

  control = input<FormControl<string>>();
  protected internalControl!: FormControl<string | null>;
  canBeEmpty = input(false);

  ngOnInit(): void {
    if (this.control()) {
      this.internalControl = this.control() as FormControl<string | null>;
    }

    if (!this.internalControl && this.group()) {
      this.internalControl = this.group().get(this.controlName()) as FormControl<string | null>;
    }

    if (!this.internalControl) {
      this.internalControl = new FormControl<string | null>(
        this.canBeEmpty() ? null : 'BE-VOV',
      ) as FormControl<string | null>;
    }

    if (this.group()) {
      this.group().addControl(this.controlName(), this.internalControl);
    }

    const previous = this.group().get(this.dependsOn());
    if (!previous) {
      console.warn(`Dependency ${this.dependsOn()} not found`, previous);
    } else {
      previous.valueChanges
        .pipe(startWith(previous.value), takeUntil(this.destroy$))
        .subscribe((value) => {
          this.states = statesList?.filter((state) => state.country === value);
        });
    }
  }
}
