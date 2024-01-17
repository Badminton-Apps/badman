import { NgxMatDatetimePickerModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
  ],
  templateUrl: './set-open-close-enrollments.component.html',
  styleUrls: ['./set-open-close-enrollments.component.scss'],
  standalone: true,
})
export class OpenCloseDateDialogComponent implements OnInit {
  openControl?: FormControl;
  closeControl?: FormControl;

  constructor(
    public dialogRef: MatDialogRef<OpenCloseDateDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { openDate: Date; closeDate: Date },
  ) {}

  ngOnInit(): void {
    this.openControl = new FormControl(this.data.openDate);
    this.closeControl = new FormControl(this.data.closeDate);
  }

  save() {
    this.dialogRef.close({
      openDate: this.openControl?.value,
      closeDate: this.closeControl?.value,
    });
  }
}
