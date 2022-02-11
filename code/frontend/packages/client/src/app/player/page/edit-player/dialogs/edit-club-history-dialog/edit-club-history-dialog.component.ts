import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Team, Club, ClubMembership } from 'app/_shared';

@Component({
  templateUrl: './edit-club-history-dialog.component.html',
  styleUrls: ['./edit-club-history-dialog.component.scss'],
})
export class EditClubHistoryDialogComponent implements OnInit {
  clubFormGroup: FormGroup = new FormGroup({});
  membershipFormGroup: FormGroup = new FormGroup({});

  currentClub?: boolean;

  constructor(
    private dialogRef: MatDialogRef<EditClubHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club: Club }
  ) {}

  ngOnInit(): void {
    const clubControl = new FormControl(this.data.club?.id, [Validators.required]);
    const startControl = new FormControl(this.data.club?.clubMembership?.start, [Validators.required]);
    const endControl = new FormControl(this.data.club?.clubMembership?.end);

    this.currentClub = this.data.club?.clubMembership?.end === undefined;

    this.clubFormGroup.addControl('club', clubControl);
    this.membershipFormGroup.addControl('start', startControl);
    this.membershipFormGroup.addControl('end', endControl);
  }

  toggleCurrentClub() {
    if (this.membershipFormGroup.value.end != null) {
      this.membershipFormGroup.get('end')!.setValue(null);
    } else {
      this.membershipFormGroup.get('end')!.setValue(new Date());
    }
  }

  onUpdate() {
    console.log(this.clubFormGroup.getRawValue())

    const data = {
      id: this.data.club?.clubMembership?.id,
      clubId: this.clubFormGroup.value.club,
      ...this.membershipFormGroup!.value,
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
