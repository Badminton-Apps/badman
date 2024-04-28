import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCalendarCellClassFunction, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RankingPlace, RankingSystem } from '@badman/frontend-models';
import { RankingSystems } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import moment, { Moment } from 'moment';

@Component({
  templateUrl: './edit-ranking-place-dialog.component.html',
  styleUrls: ['./edit-ranking-place-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    TranslateModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    FormsModule,
  ],
})
export class EditRankingPlaceDialogComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<EditRankingPlaceDialogComponent>>(
    MatDialogRef<EditRankingPlaceDialogComponent>,
  );
  public data = inject<{ place: RankingPlace; system: RankingSystem }>(MAT_DIALOG_DATA);
  rankingPlaceForm: FormGroup = new FormGroup({});
  dateClass!: MatCalendarCellClassFunction<Moment>;

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

    if (this.data.system) {
      this.dateClass = (cellDate, view) => {
        if (view === 'month') {
          const day = cellDate.get('day');
          const date = cellDate.get('date');
          const month = cellDate.get('month');

          if (
            this.data.system?.rankingSystem == RankingSystems.VISUAL ||
            this.data.system?.rankingSystem == RankingSystems.BVL
          ) {
            if (day == 1 && date < 8 && month % (this.data.system.updateIntervalAmount ?? 0) == 0) {
              return 'date-class-update';
            }
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
    const date = moment();

    // Get event from group whith highest eventCompetition season
    const compEvent = this.data.system?.rankingGroups?.[0].subEventCompetitions
      ?.map((group) => group.eventCompetition)
      .reduce((prev, current) => {
        if ((prev?.season ?? 0) > (current?.season ?? 0)) {
          return prev;
        } else {
          return current;
        }
      });

    if (!compEvent?.season || !compEvent?.usedRankingUnit || !compEvent?.usedRankingAmount) {
      throw new Error('No event data');
    }

    date.set('year', compEvent.season);
    date.set(compEvent.usedRankingUnit, compEvent.usedRankingAmount);
    date.set('day', 1);

    this.rankingPlaceForm.patchValue({
      rankingDate: date,
      updatePossible: true,
    });
  }

  onUpdate() {
    this.dialogRef.close({
      action: this.data.place?.id ? 'update' : 'new',
      place: {
        systemId: this.data.system.id,
        ...this.data.place,
        ...this.rankingPlaceForm.value,
      },
    });
  }
  onDelete() {
    this.dialogRef.close({
      action: 'remove',
      place: {
        systemId: this.data.system.id,
        ...this.data.place,
        ...this.rankingPlaceForm.value,
      },
    });
  }
}
