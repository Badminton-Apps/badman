import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MtxDatetimepickerModule } from '@ng-matero/extensions/datetimepicker';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { Moment } from 'moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { startWith, takeUntil } from 'rxjs/operators';
@Component({
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatDatepickerModule,
    MtxDatetimepickerModule,
  ],
  templateUrl: './set-open-close-enrollments.component.html',
  styleUrls: ['./set-open-close-enrollments.component.scss'],
  standalone: true,
})
export class OpenCloseDateDialogComponent implements OnInit {
  private readonly destroy$ = injectDestroy();
  public dialogRef = inject<MatDialogRef<OpenCloseDateDialogComponent>>(
    MatDialogRef<OpenCloseDateDialogComponent>,
  );
  public data = inject<{ openDate: Date; closeDate: Date; season: number }>(MAT_DIALOG_DATA);
  openControl?: FormControl;
  closeControl?: FormControl;

  openYearWarning = false;
  closeYearWarning = false;

  ngOnInit(): void {
    this.openControl = new FormControl(moment(this.data.openDate));
    this.closeControl = new FormControl(moment(this.data.closeDate));

    this.openControl.valueChanges
      .pipe(startWith(this.openControl.value), takeUntil(this.destroy$))
      .subscribe((value: Moment) => {
        if (!value) {
          return;
        }

        this.openYearWarning = value.get('year') !== this.data.season;
      });

    this.closeControl.valueChanges
      .pipe(startWith(this.closeControl.value), takeUntil(this.destroy$))
      .subscribe((value) => {
        if (!value) {
          return;
        }

        this.closeYearWarning = value.get('year') !== this.data.season;
      });
  }

  save() {
    this.dialogRef.close({
      openDate: this.openControl?.value,
      closeDate: this.closeControl?.value,
    });
  }
}
