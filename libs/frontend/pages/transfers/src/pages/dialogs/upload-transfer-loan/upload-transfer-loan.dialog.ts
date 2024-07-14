import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { lastValueFrom, Subscription } from 'rxjs';
import { TRANSFERLOAN_CONFIG } from '../../../injection';
import { ITransferLoanConfig } from '../../../interfaces/transfer-loan-config.interface';
import { SelectSeasonComponent } from '@badman/frontend-components';
import { getSeason } from '@badman/utils';

@Component({
  selector: 'badman-upload-transfer-loan',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    SelectSeasonComponent,
  ],
  templateUrl: './upload-transfer-loan.dialog.html',
  styleUrls: ['./upload-transfer-loan.dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadTransferLoanDialogComponent {
  private config = inject<ITransferLoanConfig>(TRANSFERLOAN_CONFIG);
  private http = inject(HttpClient);
  public dialogRef = inject<MatDialogRef<UploadTransferLoanDialogComponent>>(
    MatDialogRef<UploadTransferLoanDialogComponent>,
  );
  private changeDetectorRef = inject(ChangeDetectorRef);
  snackbar = inject(MatSnackBar);

  dragging = false;
  uploading = false;
  processing = false;
  uploadedFile?: File;
  uploadProgress$?: Subscription;

  transferOrLoan: 'transfer' | 'loan' | null = null;
  season: number = getSeason();

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragging = false;
  }

  onFileRemove() {
    this.uploadedFile = undefined;
    this.uploading = false;
    this.uploadProgress$?.unsubscribe();
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging = false;
    this.uploading = true;
    this.uploadedFile = event.dataTransfer?.files?.[0];
    this.processFile();
  }

  // on click open file picker and to the file drop logic
  onCLick(event: MouseEvent) {
    event.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    input.style.display = 'none';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files?.length) {
        this.uploadedFile = target.files[0];
        this.processFile();
      }
    };
    document.body.appendChild(input);
    input.click();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  private async processFile() {
    if (!this.uploadedFile) {
      return;
    }

    if (this.uploadedFile.name.includes('Transfers')) {
      this.transferOrLoan = 'transfer';
    } else if (
      this.uploadedFile.name.includes('Loans') ||
      this.uploadedFile.name.includes('Uitleningen')
    ) {
      this.transferOrLoan = 'loan';
    } else {
      this.transferOrLoan = null;
      this.snackbar.open(
        "Unable to determine if it's a loan or transfer file, are you sure you have the correct file?",
        undefined,
        {
          duration: 5000,
        },
      );
    }

    // find if there are years in the file name
    const matches = this.uploadedFile.name.match(/\d{4}/g);
    if (matches) {
      this.season = Math.min(...matches.map((m) => parseInt(m, 10)));
    }

    this.uploading = false;
    this.changeDetectorRef.markForCheck();
  }

  async processData() {
    if (!this.uploadedFile || this.transferOrLoan === null) {
      return;
    }
    this.processing = true;

    const formData = new FormData();
    formData.append('file', this.uploadedFile, this.uploadedFile.name);
    formData.append('transferOrLoan', this.transferOrLoan);
    formData.append('season', this.season.toString());

    try {
      const result = await lastValueFrom(
        this.http.post<{ message: boolean }>(`${this.config.api}/process`, formData),
      );

      if (result?.message) {
        this.snackbar.open('Processing started', undefined, {
          duration: 5000,
        });
      }

      this.dialogRef.close();
    } catch (error) {
      console.error(error);
    } finally {
      this.processing = false;
      this.changeDetectorRef.markForCheck();
    }
  }
}
