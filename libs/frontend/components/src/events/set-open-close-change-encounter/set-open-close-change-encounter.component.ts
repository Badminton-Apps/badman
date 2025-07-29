
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MtxDatetimepickerModule } from '@ng-matero/extensions/datetimepicker';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
    imports: [
    TranslatePipe,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MtxDatetimepickerModule
],
    templateUrl: './set-open-close-change-encounter.component.html',
    styleUrls: ['./set-open-close-change-encounter.component.scss']
})
export class OpenCloseChangeEncounterDateDialogComponent implements OnInit {
  public dialogRef = inject<MatDialogRef<OpenCloseChangeEncounterDateDialogComponent>>(
    MatDialogRef<OpenCloseChangeEncounterDateDialogComponent>,
  );
  public data = inject<{
    openDate: Date;
    changeCloseDatePeriod1: Date;
    changeCloseDatePeriod2: Date;
    changeCloseRequestDatePeriod1: Date;
    changeCloseRequestDatePeriod2: Date;
  }>(MAT_DIALOG_DATA);
  openControl?: FormControl;
  changeCloseDatePeriod1Control?: FormControl;
  changeCloseDatePeriod2Control?: FormControl;
  changeCloseRequestDatePeriod1Control?: FormControl;
  changeCloseRequestDatePeriod2Control?: FormControl;

  ngOnInit(): void {
    this.openControl = new FormControl(this.data.openDate);
    this.changeCloseDatePeriod1Control = new FormControl(this.data.changeCloseDatePeriod1);
    this.changeCloseDatePeriod2Control = new FormControl(this.data.changeCloseDatePeriod2);
    this.changeCloseRequestDatePeriod1Control = new FormControl(this.data.changeCloseRequestDatePeriod1);
    this.changeCloseRequestDatePeriod2Control = new FormControl(this.data.changeCloseRequestDatePeriod2);
  }

  save() {
    this.dialogRef.close({
      openDate: this.openControl?.value,
      changeCloseDatePeriod1: this.changeCloseDatePeriod1Control?.value,
      changeCloseDatePeriod2: this.changeCloseDatePeriod2Control?.value,
      changeCloseRequestDatePeriod1: this.changeCloseRequestDatePeriod1Control?.value,
      changeCloseRequestDatePeriod2: this.changeCloseRequestDatePeriod2Control?.value,
    });
  }
}
