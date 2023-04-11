import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { EventCompetition, EventTournament } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import {
  NgxMatDatetimePickerModule,
  NgxMatTimepickerModule,
} from '@angular-material-components/datetime-picker';
import { MatDatepickerModule } from '@angular/material/datepicker';
@Component({
  imports: [
    // Core modules
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,

    TranslateModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,

    // Material Modules
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatDatepickerModule
  ],
  templateUrl: './set-open-close.component.html',
  styleUrls: ['./set-open-close.component.scss'],
  standalone: true,
})
export class OpenCloseDateDialogComponent implements OnInit {
  openControl?: FormControl;
  closeControl?: FormControl;

  constructor(
    public dialogRef: MatDialogRef<OpenCloseDateDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { event: EventCompetition | EventTournament }
  ) {}

  ngOnInit(): void {
    this.openControl = new FormControl(this.data.event.openDate);
    this.closeControl = new FormControl(this.data.event.closeDate);
  }

  save() {
    this.dialogRef.close({
      ...this.data.event,
      openDate: this.openControl?.value,
      closeDate: this.closeControl?.value,
    });
  }
}
