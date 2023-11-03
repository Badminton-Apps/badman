import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  HasClaimComponent,
  PageHeaderComponent,
  RankingTableComponent,
} from '@badman/frontend-components';
import { JobsService } from '@badman/frontend-jobs';
import { RankingSystem } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { take } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { UploadRankingDialogComponent } from '../../dialogs';

@Component({
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    MomentModule,

    // Material
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,

    // My Componments
    PageHeaderComponent,
    RankingTableComponent,
    HasClaimComponent,
  ],
})
export class DetailPageComponent {
  private route = inject(ActivatedRoute);
  private seoService = inject(SeoService);
  private breadcrumbsService = inject(BreadcrumbService);
  private dialog = inject(MatDialog);
  private jobService = inject(JobsService);

  // route
  private queryParams = toSignal(this.route.queryParamMap);
  private routeParams = toSignal(this.route.paramMap);
  private routeData= toSignal(this.route.data);

  rankingSystem = computed(
    () => this.routeData()?.['rankingSystem'] as RankingSystem,
  );
  systemName = computed(() => this.rankingSystem()?.name);

  constructor() {
    effect(() => {
      this.seoService.update({
        title: `${this.systemName()}`,
        description: `Player ${this.systemName()}`,
        type: 'website',
        keywords: ['ranking', 'badminton'],
      });
      this.breadcrumbsService.set('ranking/:id', `${this.systemName()}`);
    });
  }

  openUploadDialog() {
    this.dialog.open(UploadRankingDialogComponent, {
      data: {
        rankingSystem: this.rankingSystem,
      },
      disableClose: true,
    });
  }

  sync() {
    this.jobService.syncRanking().pipe(take(1)).subscribe();
  }
}
