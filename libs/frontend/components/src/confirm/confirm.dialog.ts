import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { I18nTranslations } from '@badman/utils';
import { PathImpl2 } from '@nestjs/config';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  templateUrl: './confirm.dialog.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslateModule],
  // styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent {
  title: string;
  message: string;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogModel,
  ) {
    // Update view with given values
    this.title = data.title;
    this.message = data.message;
  }

  onConfirm(): void {
    // Close the dialog, return true
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }
}

/**
 * Class to represent confirm dialog model.
 *
 * It has been kept here to keep it as part of shared component.
 */
export class ConfirmDialogModel {
  constructor(
    public title: PathImpl2<I18nTranslations>,
    public message: PathImpl2<I18nTranslations>,
  ) {}
}
