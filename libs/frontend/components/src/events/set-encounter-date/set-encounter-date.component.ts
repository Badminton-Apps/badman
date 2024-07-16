import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MtxMomentDatetimeModule } from '@ng-matero/extensions-moment-adapter';
import { MtxDatetimepickerModule } from '@ng-matero/extensions/datetimepicker';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatSlideToggleModule,
    MtxDatetimepickerModule,
    MtxMomentDatetimeModule
  ],
  templateUrl: './set-encounter-date.component.html',
  styleUrls: ['./set-encounter-date.component.scss'],
  standalone: true,
})
export class SetEncounterDateDialogComponent implements OnInit {
  public dialogRef = inject<MatDialogRef<SetEncounterDateDialogComponent>>(
    MatDialogRef<SetEncounterDateDialogComponent>,
  );
  public data = inject<{ date: Date }>(MAT_DIALOG_DATA);
  dateControl?: FormControl;
  updateBadman?: FormControl;
  updateVisual?: FormControl;
  closeChangeRequest?: FormControl;

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
