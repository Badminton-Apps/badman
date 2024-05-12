import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
    MtxDatetimepickerModule,
  ],
  templateUrl: './set-open-close-change-encounter.component.html',
  styleUrls: ['./set-open-close-change-encounter.component.scss'],
  standalone: true,
})
export class OpenCloseChangeEncounterDateDialogComponent implements OnInit {
  public dialogRef = inject<MatDialogRef<OpenCloseChangeEncounterDateDialogComponent>>(
    MatDialogRef<OpenCloseChangeEncounterDateDialogComponent>,
  );
  public data = inject<{ openDate: Date; closeDate: Date; requestDate: Date }>(MAT_DIALOG_DATA);
  openControl?: FormControl;
  closeControl?: FormControl;
  requestDateControl?: FormControl;

  ngOnInit(): void {
    this.openControl = new FormControl(this.data.openDate);
    this.closeControl = new FormControl(this.data.closeDate);
    this.requestDateControl = new FormControl(this.data.requestDate);
  }

  save() {
    this.dialogRef.close({
      openDate: this.openControl?.value,
      closeDate: this.closeControl?.value,
      requestDate: this.requestDateControl?.value,
    });
  }
}
