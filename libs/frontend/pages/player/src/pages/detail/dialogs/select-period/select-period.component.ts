import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MtxDatetimepickerModule } from '@ng-matero/extensions/datetimepicker';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
  imports: [
    CommonModule,
    TranslatePipe,
    ReactiveFormsModule,
    FormsModule,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MtxDatetimepickerModule,
  ],
  templateUrl: './select-period.component.html',
  styleUrls: ['./select-period.component.scss'],
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
