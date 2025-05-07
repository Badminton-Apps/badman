import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'badman-choose-period-dialog',
  imports: [
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './choose-period-dialog.component.html',
  styleUrl: './choose-period-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoosePeriodDialogComponent {
  initialRange: FormGroup<{
    from: FormControl<Date | null>;
    to: FormControl<Date | null>;
  }>;

  constructor(
    public dialogRef: MatDialogRef<ChoosePeriodDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public range: FormGroup<{
      from: FormControl<Date | null>;
      to: FormControl;
    }>,
  ) {
    this.initialRange = new FormGroup({
      from: new FormControl(range.controls.from.value),
      to: new FormControl(range.controls.to.value),
    });
  }

  onClear(): void {
    this.range.controls.from.setValue(null);
    this.range.controls.to.setValue(null);
  }
  onCancel(): void {
    this.range.controls.from.setValue(this.initialRange.controls.from.value);
    this.range.controls.to.setValue(this.initialRange.controls.to.value);
    this.dialogRef.close();
  }
}
