import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import {
  HasClaimComponent,
  SelectClubComponent,
  SelectSeasonComponent,
  SelectTeamComponent,
} from '@badman/frontend-components';
import { VERSION_INFO } from '@badman/frontend-html-injects';
import { SeoService } from '@badman/frontend-seo';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { map, takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ListEncountersComponent, ShowRequestsComponent } from './components';

@Component({
  selector: 'badman-change-encounter',
  templateUrl: './change-encounter.component.html',
  styleUrls: ['./change-encounter.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatIconModule,
    SelectClubComponent,
    SelectTeamComponent,
    SelectSeasonComponent,
    ListEncountersComponent,
    ShowRequestsComponent,
    HasClaimComponent
],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeEncounterComponent implements OnInit {
  private destroy$ = injectDestroy();

  breakpointObserver = inject(BreakpointObserver);
  private seoService = inject(SeoService);
  private breadcrumbsService = inject(BreadcrumbService);
  private activatedRoute = inject(ActivatedRoute);
  private claimService = inject(ClaimService);
  private versionInfo: {
    beta: boolean;
    version: string;
  } = inject(VERSION_INFO);

  translateService = inject(TranslateService);

  isHandset = toSignal(
    this.breakpointObserver
      .observe(['(max-width: 959.98px)'])
      .pipe(map((result) => result.matches)),
  );

  hasPermission = toSignal(
    this.claimService.hasAnyClaims$(['change-any:encounter']),
  );

  canSelectSeason = computed(
    () => this.hasPermission() || this.versionInfo.beta,
  );

  formGroup?: FormGroup;

  ngOnInit(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const parsed = parseInt(params?.get('season') || '');
    const season = isNaN(parsed) ? getCurrentSeason() : parsed;

    this.formGroup = new FormGroup({
      season: new FormControl(season),
      club: new FormControl(),
      team: new FormControl(),
      encounter: new FormControl(),
    });

    const changeEncounterKey = 'all.competition.change-encounter.title';

    this.translateService
      .get([changeEncounterKey])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.seoService.update({
          title: result[changeEncounterKey],
          description: result[changeEncounterKey],
          type: 'website',
          keywords: ['club', 'badminton'],
        });
        this.breadcrumbsService.set(
          'competition/change-encounter',
          changeEncounterKey,
        );
      });
  }
}
