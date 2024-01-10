import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  inject,
} from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { RankingSystem } from '@badman/frontend-models';

import { HttpClient, HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { lastValueFrom, Subscription } from 'rxjs';
import { IRankingConfig } from '../../interfaces';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RANKING_CONFIG } from '../../injection';

@Component({
  selector: 'badman-upload-ranking',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,

    // Material modules
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
  snackbar = inject(MatSnackBar);

  previewData?: MembersRolePerGroupData[];
  headerRow?: string[];
  dragging = false;
  uploading = false;
  processing = false;
  uploadedFile?: File;
  uploadProgress$?: Subscription;

  competitionStatus = false;
  updatePossible = false;
  removeAllRanking = false;
  updateRanking = false;
  createNewPlayers = true;
  rankingDate = new Date();

  constructor(
    @Inject(RANKING_CONFIG) private config: IRankingConfig,
    private http: HttpClient,
    public dialogRef: MatDialogRef<UploadRankingDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { rankingSystem: RankingSystem },
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

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

    if (!this.uploadedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', this.uploadedFile, this.uploadedFile.name);

    this.uploadProgress$ = this.http
      .post<MembersRolePerGroupData[]>(
        `${this.config.api}/upload/preview`,
        formData,
        {
          reportProgress: true,
          observe: 'events',
        },
      )
      .subscribe((event) => {
        if (event.type === HttpEventType.Response) {
          this.headerRow = (event.body?.[0] || []) as string[];
          this.previewData = event.body?.slice(1);
          this.uploading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  onNoClick(): void {
    this.dialogRef.close();
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
    formData.append('removeAllRanking', this.removeAllRanking.toString());
    formData.append('createNewPlayers', this.createNewPlayers.toString());
    formData.append('rankingDate', this.rankingDate.toISOString());
    formData.append('updateRanking', this.updateRanking.toString());
 
    try {
      const result = await lastValueFrom(
        this.http.post<{ message: boolean }>(
          `${this.config.api}/upload/process`,
          formData,
        ),
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
