import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  PageHeaderComponent,
  RankingTableComponent
} from '@badman/frontend-components';
import { RankingSystem } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
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
    RankingTableComponent
  ],
})
export class DetailPageComponent implements OnInit {
  rankingSystem!: RankingSystem;


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
