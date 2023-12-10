import { CommonModule } from '@angular/common';
import {
  Component,
  inject
} from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { CronJobService } from '../../services/cronjob.service';


@Component({
  selector: 'badman-ranking-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,

    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MomentModule,

    // Material Modules
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatDatepickerModule,

    // Own Module
    PageHeaderComponent,
    HasClaimComponent,
  ],
})
export class OverviewPageComponent {
  // injects
  service = inject(CronJobService);

  displayedColumns: string[] = [
    'name',
    'cronTime',
    'lastRun',
    'options',
  ];


}
