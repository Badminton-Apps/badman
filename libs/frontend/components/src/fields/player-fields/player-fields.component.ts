import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'badman-player-fields',
    templateUrl: './player-fields.component.html',
    styleUrls: ['./player-fields.component.scss'],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslatePipe,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
    ]
})
export class PlayerFieldsComponent {
  group = input<FormGroup>(PlayerFieldsComponent.newPlayerForm());

  static newPlayerForm(
    inputData?: {
      firstName?: string;
      lastName?: string;
      gender?: string;
      memberId?: string;
    },
    group?: FormGroup,
  ): FormGroup {
    if (!group) {
      group = new FormGroup({});
    }

    if (group.get('firstName') == null) {
      const firstNameControl = new FormControl(inputData?.firstName, Validators.required);
      group.addControl('firstName', firstNameControl);
    }

    if (group.get('lastName') == null) {
      const lastNameControl = new FormControl(inputData?.lastName, Validators.required);
      group.addControl('lastName', lastNameControl);
    }

    if (group.get('gender') == null) {
      const genderControl = new FormControl(inputData?.gender, Validators.required);
      group.addControl('gender', genderControl);
    }

    if (group.get('memberId') == null) {
      const memberIdControl = new FormControl(inputData?.memberId, Validators.required);
      group.addControl('memberId', memberIdControl);
    }

    return group;
  }
}
