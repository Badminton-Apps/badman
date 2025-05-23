import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectClubComponent } from '@badman/frontend-components';
import { Club } from '@badman/frontend-models';
import { ClubMembershipType } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    templateUrl: './edit-club-history-dialog.component.html',
    styleUrls: ['./edit-club-history-dialog.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        TranslatePipe,
        MatDialogModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatInputModule,
        MatButtonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatSelectModule,
        SelectClubComponent,
    ]
})
export class EditClubHistoryDialogComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<EditClubHistoryDialogComponent>>(
    MatDialogRef<EditClubHistoryDialogComponent>,
  );
  public data = inject<{ club: Club }>(MAT_DIALOG_DATA);
  clubFormGroup: FormGroup = new FormGroup({});
  membershipFormGroup: FormGroup = new FormGroup({});

  currentClub?: boolean;
  types = Object.keys(ClubMembershipType) as ClubMembershipType[];

  ngOnInit(): void {
    const clubControl = new FormControl(this.data.club?.id, [Validators.required]);
    const startControl = new FormControl(this.data.club?.clubMembership?.start, [
      Validators.required,
    ]);
    const endControl = new FormControl(this.data.club?.clubMembership?.end);
    const confirmedControl = new FormControl(this.data.club?.clubMembership?.confirmed);
    const membershipTypeControl = new FormControl(this.data.club?.clubMembership?.membershipType, [
      Validators.required,
    ]);

    this.currentClub = this.data.club?.clubMembership?.end === undefined;

    this.clubFormGroup.addControl('club', clubControl);
    this.membershipFormGroup.addControl('start', startControl);
    this.membershipFormGroup.addControl('end', endControl);
    this.membershipFormGroup.addControl('membershipType', membershipTypeControl);
    this.membershipFormGroup.addControl('confirmed', confirmedControl);
  }

  toggleCurrentClub() {
    if (this.membershipFormGroup.value.end != null) {
      this.membershipFormGroup.get('end')?.setValue(null);
    } else {
      this.membershipFormGroup.get('end')?.setValue(new Date());
    }
  }

  onUpdate() {
    const data = {
      id: this.data.club?.clubMembership?.id,
      clubId: this.clubFormGroup.value.club,
      ...this.membershipFormGroup.value,
    };
    this.dialogRef.close({
      action: this.data.club?.clubMembership?.id ? 'update' : 'create',
      data,
    });
  }

  onDelete() {
    this.dialogRef.close({
      action: 'delete',
      data: { id: this.data.club.clubMembership?.id },
    });
  }
}
