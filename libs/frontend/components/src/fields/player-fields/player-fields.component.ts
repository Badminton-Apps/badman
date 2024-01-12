import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-player-fields',
  templateUrl: './player-fields.component.html',
  styleUrls: ['./player-fields.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
],
})
export class PlayerFieldsComponent implements OnInit {
  @Input()
  group?: FormGroup;

  static newPlayerForm(
    inputData?: {
      firstName?: string;
      lastName?: string;
      gender?: string;
      memberId?: string;
    },
    group?: FormGroup
  ): FormGroup {
    if (!group) {
      group = new FormGroup({});
    }

    if (group.get('firstName') == null) {
      const firstNameControl = new FormControl(
        inputData?.firstName,
        Validators.required
      );
      group.addControl('firstName', firstNameControl);
    }

    if (group.get('lastName') == null) {
      const lastNameControl = new FormControl(
        inputData?.lastName,
        Validators.required
      );
      group.addControl('lastName', lastNameControl);
    }

    if (group.get('gender') == null) {
      const genderControl = new FormControl(
        inputData?.gender,
        Validators.required
      );
      group.addControl('gender', genderControl);
    }

    if (group.get('memberId') == null) {
      const memberIdControl = new FormControl(
        inputData?.memberId,
        Validators.required
      );
      group.addControl('memberId', memberIdControl);
    }

    return group;
  }

  ngOnInit() {
    if (!this.group) {
      this.group = PlayerFieldsComponent.newPlayerForm();
    }
  }
}
