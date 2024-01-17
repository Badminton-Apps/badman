import {
  NgxMatDatetimePickerModule,
  NgxMatTimepickerModule,
} from '@angular-material-components/datetime-picker';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatDatepickerModule,
    MatSlideToggleModule,
  ],
  templateUrl: './set-encounter-date.component.html',
  styleUrls: ['./set-encounter-date.component.scss'],
  standalone: true,
})
export class SetEncounterDateDialogComponent implements OnInit {
  dateControl?: FormControl;
  updateBadman?: FormControl;
  updateVisual?: FormControl;
  closeChangeRequest?: FormControl;

  constructor(
    public dialogRef: MatDialogRef<SetEncounterDateDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { date: Date },
  ) {}

  ngOnInit(): void {
    this.dateControl = new FormControl(this.data.date);
    this.updateBadman = new FormControl(true);
    this.updateVisual = new FormControl(false);
    this.closeChangeRequest = new FormControl(true);
  }

  save() {
    this.dialogRef.close({
      openDate: this.dateControl?.value,
      updateBadman: this.updateBadman?.value,
      updateVisual: this.updateVisual?.value,
      closeChangeRequests: this.closeChangeRequest?.value,
    });
  }
}
