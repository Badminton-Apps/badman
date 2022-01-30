import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RankingPlace } from 'app/_shared';

@Component({
  templateUrl: './edit-ranking-place-dialog.component.html',
  styleUrls: ['./edit-ranking-place-dialog.component.scss'],
})
export class EditRankingPlaceDialogComponent implements OnInit {
  rankingPlaceForm: FormGroup = new FormGroup({});

  constructor(
    private dialogRef: MatDialogRef<EditRankingPlaceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { place: RankingPlace }
  ) {}

  ngOnInit(): void {
    const singleControl = new FormControl(this.data.place?.single, Validators.required);
    const doubleControl = new FormControl(this.data.place?.double, Validators.required);
    const mixControl = new FormControl(this.data.place?.mix, Validators.required);

    const singlePointsControl = new FormControl(this.data.place?.singlePoints, Validators.required);
    const doublePointsControl = new FormControl(this.data.place?.doublePoints, Validators.required);
    const mixPointsControl = new FormControl(this.data.place?.mixPoints, Validators.required);

    const rankingDateControl = new FormControl(this.data.place?.rankingDate, Validators.required);

    this.rankingPlaceForm.addControl('single', singleControl);
    this.rankingPlaceForm.addControl('double', doubleControl);
    this.rankingPlaceForm.addControl('mix', mixControl);

    this.rankingPlaceForm.addControl('singlePoints', singlePointsControl);
    this.rankingPlaceForm.addControl('doublePoints', doublePointsControl);
    this.rankingPlaceForm.addControl('mixPoints', mixPointsControl);

    this.rankingPlaceForm.addControl('rankingDate', rankingDateControl);
  }

  onUpdate() {
    this.dialogRef.close({
      action: this.data.place?.id ? 'update' : 'add',
      place: {
        ...this.data.place,
        ...this.rankingPlaceForm.value,
      },
    });
  }
  onDelete() {
    this.dialogRef.close({
      action: 'remove',
      place: {
        ...this.data.place,
        ...this.rankingPlaceForm.value,
      },
    });
  }
}
