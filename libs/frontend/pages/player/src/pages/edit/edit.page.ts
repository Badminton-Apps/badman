import { CommonModule, Location } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import { Player } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import {
  EditClubHistoryComponent,
  EditCompetitionStatusComponent,
  EditPermissionsComponent,
  EditPlayerFieldsComponent,
  EditRankingAllComponent,
  EditRankingComponent,
} from './tabs';

@Component({
  selector: 'badman-player-edit',
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    EditRankingComponent,
    EditCompetitionStatusComponent,
    EditRankingAllComponent,
    EditClubHistoryComponent,
    EditPermissionsComponent,
    EditPlayerFieldsComponent,
    MatIconModule,
    MatTabsModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPageComponent implements AfterViewInit {
  private readonly seoService = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly breadcrumbsService = inject(BreadcrumbService);
  private readonly claimService = inject(ClaimService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private destroy$ = injectDestroy();

  private routeData = toSignal(this.route.data);

  player = computed(() => this.routeData()?.['player'] as Player);

  // player!: Player;
  selectedTabIndex?: number;

  hasRankingPermission = computed(() =>
    this.claimService.hasAnyClaims(['edit:ranking', 'status:competition']),
  );
  hasClubHistoryPermission = computed(() => this.claimService.hasAnyClaims(['membership:club']));
  hasPermissionPermission = computed(() => this.claimService.hasAnyClaims(['edit:ranking']));

  constructor() {
    effect(() => {
      this.seoService.update({
        title: `${this.player().fullName}`,
        description: `Player ${this.player().fullName}`,
        type: 'website',
        keywords: ['player', 'badminton'],
      });
      this.breadcrumbsService.set('player/:id', this.player().fullName);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.activatedRoute.queryParams
        .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe((params) => {
          this.selectedTabIndex = params['tab'];
        });
    }, 0);
  }

  onTabChange(selectedTabIndex: number): void {
    if (this.selectedTabIndex !== selectedTabIndex) {
      const url = this.router
        .createUrlTree([], {
          relativeTo: this.activatedRoute,
          queryParams: { tab: selectedTabIndex },
        })
        .toString();

      this.location.go(url);
    }
  }
}
