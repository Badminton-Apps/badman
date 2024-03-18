import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import {
  AddEventComponent,
  HasClaimComponent,
  PageHeaderComponent,
  SelectSeasonComponent,
} from '@badman/frontend-components';
import { JobsService } from '@badman/frontend-queue';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { CompetitionEventsComponent } from './competition-events/competition-events.component';
import { EventOverviewService } from './overview.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'badman-competition-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    ReactiveFormsModule,
    MomentModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDialogModule,
    PageHeaderComponent,
    HasClaimComponent,
    CompetitionEventsComponent,
    SelectSeasonComponent,
  ],
})
export class OverviewPageComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  private readonly seoService = inject(SeoService);
  private readonly breadcrumbsService = inject(BreadcrumbService);
  private readonly jobsService = inject(JobsService);
  private readonly dialog = inject(MatDialog);

  eventService = inject(EventOverviewService);

  filter = this.eventService.filter;
  

  ngOnInit(): void {
    this.translate.get(['all.competition.title']).subscribe((translations) => {
      this.seoService.update({
        title: translations['all.competition.title'],
        description: translations['all.competition.title'],
        type: 'website',
        keywords: ['event', 'competition', 'badminton'],
      });
      this.breadcrumbsService.set('competition', translations['all.competition.title']);
    });
  }

  async addEvent() {
    const dialogRef = this.dialog.open(AddEventComponent, {
      width: '400px',
    });

    const result = await lastValueFrom(dialogRef.afterClosed());

    if (result?.id) {
      await lastValueFrom(this.jobsService.syncEventById(result));
    }
  }
}
