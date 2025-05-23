import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import {
  SelectClubComponent,
  SelectSeasonComponent,
  SelectTeamComponent
} from '@badman/frontend-components';
import { VERSION_INFO } from '@badman/frontend-html-injects';
import { SeoService } from '@badman/frontend-seo';
import { DEVICE } from '@badman/frontend-utils';
import { getSeason } from '@badman/utils';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ListEncountersComponent, ShowRequestsComponent } from './components';

@Component({
  selector: 'badman-change-encounter',
  templateUrl: './change-encounter.component.html',
  styleUrls: ['./change-encounter.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    MatIconModule,
    SelectClubComponent,
    SelectTeamComponent,
    SelectSeasonComponent,
    ListEncountersComponent,
    ShowRequestsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeEncounterComponent implements OnInit {
  private readonly destroy$ = injectDestroy();

  private readonly seoService = inject(SeoService);
  private readonly breadcrumbsService = inject(BreadcrumbService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly claimService = inject(ClaimService);
  private readonly versionInfo: {
    beta: boolean;
    version: string;
  } = inject(VERSION_INFO);

  private readonly translateService = inject(TranslateService);
  isHandset = inject(DEVICE);

  canSelectSeason = computed(
    () => this.claimService.hasAnyClaims(['change-any:encounter']) || this.versionInfo.beta,
  );

  formGroup?: FormGroup;

  ngOnInit(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const parsed = parseInt(params?.get('season') || '');
    const season = isNaN(parsed) ? getSeason() : parsed;

    this.formGroup = new FormGroup({
      season: new FormControl(season),
      club: new FormControl(),
      team: new FormControl(),
      encounter: new FormControl(),
    });

    const changeEncounterKey = 'all.competition.change-encounter.title';
    const competition = 'all.competition.title';
    this.translateService
      .get([changeEncounterKey, competition])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.seoService.update({
          title: result[changeEncounterKey],
          description: result[changeEncounterKey],
          type: 'website',
          keywords: ['club', 'badminton'],
        });

        this.breadcrumbsService.set('competition/change-encounter', result[changeEncounterKey]);
        this.breadcrumbsService.set('competition', result[competition]);
      });
  }
}
