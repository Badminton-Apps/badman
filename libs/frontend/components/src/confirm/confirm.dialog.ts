import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
  public dialogRef = inject<MatDialogRef<ConfirmDialogComponent>>(
    MatDialogRef<ConfirmDialogComponent>,
  );
  public data = inject<ConfirmDialogModel>(MAT_DIALOG_DATA);
  title: string;
  message: string;

  constructor() {
    // Update view with given values
    this.title = this.data.title;
    this.message = this.data.message;
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
