import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { RankingSystem } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { BreadcrumbService } from 'xng-breadcrumb';
import { MomentModule } from 'ngx-moment';
import { UploadRankingDialogComponent } from '../../dialogs';

@Component({
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterModule,
    MomentModule,

    // Material
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,

    // My Componments
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
  ],
})
export class DetailPageComponent implements OnInit {
  rankingSystem!: RankingSystem;
  dataSource?: MatTableDataSource<RankingScoreTable>;

  displayedColumns = [
    'level',
    'pointsToGoUp',
    'pointsToGoDown',
    'pointsWhenWinningAgainst',
  ];

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private breadcrumbsService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.rankingSystem = this.route.snapshot.data['rankingSystem'];

    this.seoService.update({
      title: `${this.rankingSystem.name}`,
      description: `Player ${this.rankingSystem.name}`,
      type: 'website',
      keywords: ['ranking', 'badminton'],
    });
    this.breadcrumbsService.set('ranking/:id', `${this.rankingSystem.name}`);

    let level = this.rankingSystem.amountOfLevels ?? 0;
    const data = this.rankingSystem.pointsWhenWinningAgainst?.map(
      (winning: number, index: number) => {
        return {
          level: level--,
          pointsToGoUp:
            level !== 0
              ? Math.round(this.rankingSystem.pointsToGoUp?.[index] ?? 0)
              : null,
          pointsToGoDown:
            index === 0
              ? null
              : Math.round(this.rankingSystem.pointsToGoDown?.[index - 1] ?? 0),
          pointsWhenWinningAgainst: Math.round(winning),
        } as RankingScoreTable;
      }
    );

    this.dataSource = new MatTableDataSource(data);
  }

  openUploadDialog() {
    this.dialog.open(UploadRankingDialogComponent, {
      data: {
        rankingSystem: this.rankingSystem,
      },
      disableClose: true,
    });
  }
}

type RankingScoreTable = {
  level: number;
  pointsToGoUp: number;
  pointsToGoDown: number;
  pointsWhenWinningAgainst: number;
};
