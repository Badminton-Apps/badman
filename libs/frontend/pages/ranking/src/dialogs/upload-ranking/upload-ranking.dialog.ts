import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
import moment from 'moment';

@Component({
  selector: 'badman-upload-ranking',
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
  updateClubs = false;
  updateRanking = true;
  removeAllRanking = false;
  createNewPlayers = true;
  rankingDate = new Date();
  clubMembershipStartDate = new Date();
  clubMembershipEndDate = new Date();

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

    // if the filename has 'exportMembersRolePerGroup-' then the part after is the date in DDMMYYYY format set the ranking date to that
    if (this.uploadedFile.name.includes('exportMembersRolePerGroup-')) {
      const datePart = this.uploadedFile.name.split('exportMembersRolePerGroup-')[1];
      const date = moment(datePart, 'DDMMYYYY');
      if (date.isValid()) {
        this.rankingDate = date.toDate();
        this.clubMembershipStartDate = new Date(this.rankingDate.getFullYear(), 5, 1);
        this.clubMembershipEndDate = new Date(this.rankingDate.getFullYear(), 3, 30);
      }
    }

    const formData = new FormData();
    formData.append('file', this.uploadedFile, this.uploadedFile.name);

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
    formData.append('clubMembershipStartDate', this.clubMembershipStartDate.toISOString());
    formData.append('clubMembershipEndDate', this.clubMembershipEndDate.toISOString());

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
