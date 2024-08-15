import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
    MtxDatetimepickerModule,
    MtxMomentDatetimeModule,
  ],
  templateUrl: './select-period.component.html',
  styleUrls: ['./select-period.component.scss'],
  standalone: true,
})
export class SelectPeriodDialogComponent implements OnInit {
  public dialogRef = inject<MatDialogRef<SelectPeriodDialogComponent>>(
    MatDialogRef<SelectPeriodDialogComponent>,
  );
  fromControl?: FormControl;
  toControl?: FormControl;

  ngOnInit(): void {
    this.fromControl = new FormControl();
    this.toControl = new FormControl();
  }

  save() {
    this.dialogRef.close({
      from: this.fromControl?.value,
      to: this.toControl?.value,
    });
  }
}
