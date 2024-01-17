import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import countriesList from './countries.json';

@Component({
  selector: 'badman-select-country',
  standalone: true,
  imports: [
    CommonModule,
    MatSelectModule,
    TranslateModule,
    ReactiveFormsModule,
  ],
  templateUrl: './select-country.component.html',
  styleUrls: ['./select-country.component.scss'],
})
export class SelectCountryComponent implements OnInit {
  countries = countriesList?.map((country) => country.code);

  @Input({ required: true })
  group!: FormGroup;

  @Input()
  controlName = 'country';

  @Input()
  control!: FormControl;

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

    // Currently, we only support Belgium
    this.control.setValue('be');
    this.control.disable();
  }
}
