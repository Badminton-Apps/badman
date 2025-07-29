
import { Component, TemplateRef, ViewChild, computed, inject } from '@angular/core';
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
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@badman/frontend-components';
import { CronJob } from '@badman/frontend-models';
import { MtxGrid, MtxGridColumn } from '@ng-matero/extensions/grid';
import { TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import { CronJobService } from '../../services/cronjob.service';

@Component({
    selector: 'badman-ranking-overview',
    templateUrl: './overview.page.html',
    styleUrls: ['./overview.page.scss'],
    imports: [
    RouterModule,
    TranslatePipe,
    ReactiveFormsModule,
    FormsModule,
    MtxGrid,
    MomentModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    PageHeaderComponent
]
})
export class OverviewPageComponent {
  // injects
  service = inject(CronJobService);
  dialog = inject(MatDialog);

  @ViewChild('syncTemplate', { static: true })
  syncTemplate!: TemplateRef<HTMLElement>;

  @ViewChild('rankingTemplate', { static: true })
  rankingTemplate!: TemplateRef<HTMLElement>;

  cronJobs = this.service.state.cronJobs;
  loaded = this.service.state.loaded;
  loading = computed(() => !this.loaded());

  columns: MtxGridColumn<CronJob>[] = [
    { header: 'Name', field: 'name', sortable: true },
    { header: 'Cron Time', field: 'cronTime', sortable: true },
    {
      header: 'Last Run',
      field: 'lastRun',
      sortable: true,
      formatter: (data) => moment(data.lastRun).calendar(),
    },
    {
      header: 'Next Run',
      field: 'nextRun',
      sortable: true,
      formatter: (data) => moment(data.nextRun).calendar(),
    },
    { header: 'Running', field: 'running', type: 'boolean', sortable: true },
    { header: 'Active', field: 'active', type: 'boolean', sortable: true },
    {
      header: 'Operation',
      field: 'operation',
      pinned: 'right',
      right: '0px',
      type: 'button',
      buttons: [
        {
          text: 'Toogle',
          click: (row) => this.toggleActive(row),
        },
        {
          text: 'Queue',
          click: (row) => this.openDialog(row),
        },
      ],
    },
  ];

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
        cron = {
          ...cron,
          meta: {
            ...cron.meta,
            arguments: JSON.stringify(cron.meta?.arguments, null, 2),
          },
        } as CronJob;
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

  toggleActive(job: CronJob) {
    this.service.state.toggleActive(job);
  }
}
