import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-add-event',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSlideToggleModule,
    TranslateModule,
  ],
  templateUrl: './add-event.component.html',
  styleUrls: ['./add-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEventComponent {
  public dialogRef = inject<MatDialogRef<AddEventComponent>>(MatDialogRef<AddEventComponent>);
  formGroup = new FormGroup({
    url: new FormControl('', [Validators.required]),
    official: new FormControl(true),
  });

  submit() {
    const url = this.formGroup.value.url as string;
    const official = this.formGroup.value.official;

    this.dialogRef.close({ id: url, official });
  }
}
