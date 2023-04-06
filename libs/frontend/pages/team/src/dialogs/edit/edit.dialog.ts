import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { EditTeamComponent } from '../../components/edit-team/edit-team.component';

@Component({
  templateUrl: './edit.dialog.html',
  styleUrls: ['./edit.dialog.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,

    // My Modules
    EditTeamComponent,

    // Material
    MatDialogModule,
    MatButtonModule,
  ],
})
export class EditDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EditDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { teamId: string }
  ) {}
}
