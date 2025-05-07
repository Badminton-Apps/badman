import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { RankingSystem } from '@badman/frontend-models';

import { HttpClient, HttpEventType } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';
import { lastValueFrom, Subscription } from 'rxjs';
import { RANKING_CONFIG } from '../../injection';
import { IRankingConfig } from '../../interfaces';

@Component({
  selector: 'badman-upload-ranking',
  imports: [
    CommonModule,
    TranslatePipe,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
  ],
  templateUrl: './upload-ranking.dialog.html',
  styleUrls: ['./upload-ranking.dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadRankingDialogComponent {
  private config = inject<IRankingConfig>(RANKING_CONFIG);
  private http = inject(HttpClient);
  public dialogRef = inject<MatDialogRef<UploadRankingDialogComponent>>(
    MatDialogRef<UploadRankingDialogComponent>,
  );
  public data = inject<{ rankingSystem: RankingSystem }>(MAT_DIALOG_DATA);
  private changeDetectorRef = inject(ChangeDetectorRef);
  snackbar = inject(MatSnackBar);
  previewData?: MembersRolePerGroupData[];
  headerRow?: string[];
  dragging = false;
  uploading = false;
  processing = false;
  uploadedFile?: File;
  uploadProgress$?: Subscription;

  competitionStatus = true;
  updatePossible = false;
  updateClubs = true;
  updateRanking = true;
  removeAllRanking = false;
  createNewPlayers = true;
  rankingDate = new Date();

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
    this.previewData = undefined;
    this.headerRow = undefined;
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

    const formData = new FormData();
    formData.append('file', this.uploadedFile, this.uploadedFile.name);

    if (this.uploadedFile.name.indexOf('exportMembersRolePerGroup') !== -1) {
      this.rankingDate = new Date(
        parseInt(this.uploadedFile.name.slice(-9, -5)),
        parseInt(this.uploadedFile.name.slice(-11, -9)) - 1,
        parseInt(this.uploadedFile.name.slice(-13, -11)),
      );
    }

    this.uploadProgress$ = this.http
      .post<MembersRolePerGroupData[]>(`${this.config.api}/upload/preview`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .subscribe((event) => {
        if (event.type === HttpEventType.Response) {
          this.headerRow = (event.body?.[0] || []) as string[];
          this.previewData = event.body?.slice(1);
          this.uploading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  async processData() {
    if (!this.uploadedFile || !this.data.rankingSystem?.id) {
      return;
    }
    this.processing = true;

    const formData = new FormData();
    formData.append('file', this.uploadedFile, this.uploadedFile.name);
    formData.append('rankingSystemId', this.data.rankingSystem.id);
    formData.append('updateCompStatus', this.competitionStatus.toString());
    formData.append('updatePossible', this.updatePossible.toString());
    formData.append('updateRanking', this.updateRanking.toString());
    formData.append('updateClubs', this.updateClubs.toString());
    formData.append('removeAllRanking', this.removeAllRanking.toString());
    formData.append('createNewPlayers', this.createNewPlayers.toString());
    formData.append('rankingDate', this.rankingDate.toISOString());

    try {
      const result = await lastValueFrom(
        this.http.post<{ message: boolean }>(`${this.config.api}/upload/process`, formData),
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

interface MembersRolePerGroupData {
  memberId: string;
  startDate: string;
  endDate: string;
  firstName: string;
  lastName: string;
  single: number;
  doubles: number;
  mixed: number;
}
