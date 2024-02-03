import { CommonModule } from '@angular/common';
import { Component, OnInit, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import countriesList from './countries.json';

@Component({
  selector: 'badman-select-country',
  standalone: true,
  imports: [CommonModule, MatSelectModule, TranslateModule, ReactiveFormsModule],
  templateUrl: './select-country.component.html',
  styleUrls: ['./select-country.component.scss'],
})
export class SelectCountryComponent implements OnInit {
  countries = countriesList?.map((country) => country.code);

  group = input.required<FormGroup>();

  controlName = input('country');

  control = input<FormControl<string | null>>();
  protected internalControl!: FormControl<string | null>;

  ngOnInit(): void {
    if (this.control()) {
      this.internalControl = this.control() as FormControl<string>;
    }

    if (!this.internalControl && this.group()) {
      this.internalControl = this.group().get(this.controlName()) as FormControl<string>;
    }

    if (!this.internalControl) {
      this.internalControl = new FormControl<string | null>('be');
    }

    if (this.group()) {
      this.group().addControl(this.controlName(), this.internalControl);
    }

    // Currently, we only support Belgium
    this.internalControl.setValue('be');
    this.internalControl.disable();
  }
}
