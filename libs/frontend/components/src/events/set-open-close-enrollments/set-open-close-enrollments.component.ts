import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
    MatDatepickerModule,
    MtxDatetimepickerModule,
  ],
  templateUrl: './set-open-close-enrollments.component.html',
  styleUrls: ['./set-open-close-enrollments.component.scss'],
  standalone: true,
})
export class OpenCloseDateDialogComponent implements OnInit {
  public dialogRef = inject<MatDialogRef<OpenCloseDateDialogComponent>>(
    MatDialogRef<OpenCloseDateDialogComponent>,
  );
  public data = inject<{ openDate: Date; closeDate: Date }>(MAT_DIALOG_DATA);
  openControl?: FormControl;
  closeControl?: FormControl;

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
