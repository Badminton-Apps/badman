import { Component, Inject, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RankingPlace, RankingSystem } from 'app/_shared';
import * as moment from 'moment';
import { Moment } from 'moment';

@Component({
  templateUrl: './edit-ranking-place-dialog.component.html',
  styleUrls: ['./edit-ranking-place-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EditRankingPlaceDialogComponent implements OnInit {
  rankingPlaceForm: FormGroup = new FormGroup({});
  dateClass!: MatCalendarCellClassFunction<Moment>;

  mayRankingDate: Moment;

  constructor(
    private dialogRef: MatDialogRef<EditRankingPlaceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { place: RankingPlace; rankingSystem?: RankingSystem }
  ) {
    const today = moment();
    const year = today.month() >= 6 ? today.year() : today.year() - 1;
    this.mayRankingDate = moment(`${year}-05-15`);
  }

  ngOnInit(): void {
    const singleControl = new FormControl(this.data.place?.single, Validators.required);
    const doubleControl = new FormControl(this.data.place?.double, Validators.required);
    const mixControl = new FormControl(this.data.place?.mix, Validators.required);

    const singlePointsControl = new FormControl(this.data.place?.singlePoints);
    const doublePointsControl = new FormControl(this.data.place?.doublePoints);
    const mixPointsControl = new FormControl(this.data.place?.mixPoints);

    const rankingDateControl = new FormControl(this.data.place?.rankingDate, Validators.required);
    const updatePossibleControl = new FormControl(this.data.place?.updatePossible);

    this.rankingPlaceForm.addControl('single', singleControl);
    this.rankingPlaceForm.addControl('double', doubleControl);
    this.rankingPlaceForm.addControl('mix', mixControl);

    this.rankingPlaceForm.addControl('singlePoints', singlePointsControl);
    this.rankingPlaceForm.addControl('doublePoints', doublePointsControl);
    this.rankingPlaceForm.addControl('mixPoints', mixPointsControl);

    this.rankingPlaceForm.addControl('rankingDate', rankingDateControl);
    this.rankingPlaceForm.addControl('updatePossible', updatePossibleControl);

    if (this.data.rankingSystem || true) {
      this.dateClass = (cellDate, view) => {
        if (view === 'month') {
          const date = cellDate.get('date');
          const month = cellDate.get('month');

          if (date == 15 && month == 5) {
            return 'date-class-may';
          }

          if (date == 1 && month % 2 == 0) {
            console.log(`${date}-${month}`);
            return 'date-class-update';
          }
        }

        return '';
      };
    } else {
      this.dateClass = () => '';
    }
  }

  mayRanking(event: Event) {
    event.preventDefault();
    this.rankingPlaceForm.patchValue({ rankingDate: this.mayRankingDate, updatePossible: true });
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
