import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { HasClaimComponent, PageHeaderComponent } from '@badman/frontend-components';
import { CronJob } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { CronJobService } from '../../services/cronjob.service';

@Component({
  selector: 'badman-ranking-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MomentModule,
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
    PageHeaderComponent,
    HasClaimComponent,
  ],
})
export class OverviewPageComponent {
  // injects
  service = inject(CronJobService);
  dialog = inject(MatDialog);

  @ViewChild('syncTemplate', { static: true })
  syncTemplate!: TemplateRef<HTMLElement>;

  @ViewChild('rankingTemplate', { static: true })
  rankingTemplate!: TemplateRef<HTMLElement>;

  displayedColumns: string[] = ['name', 'cronTime', 'lastRun', 'nextRun', 'running', 'options'];

  openDialog(cron: CronJob) {
    let template: TemplateRef<HTMLElement>;


    switch (cron.type) {
      case 'sync':
        template = this.syncTemplate;
        // we don't have anything configured for sync jobs
        cron = {
          ...cron,
          meta: {
            ...cron.meta,
            arguments: JSON.stringify(cron.meta?.arguments, null, 2),
          },
        } as CronJob;
        break;
      case 'ranking':
        template = this.rankingTemplate;
        break;

      default:
        console.warn('No template found for cronjob type', cron.type);
        return;
    }

    const dialogRef = this.dialog.open(template, {
      data: cron,
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log('The dialog was closed', result);

      if (result) {
        if (cron.type === 'sync') {
          // convert back
          result.arguments = JSON.parse(result.arguments);
        }

        // Queue the job here
        this.service.state.queue({
          ...cron,
          meta: result,
        });
      }
    });
  }
}
