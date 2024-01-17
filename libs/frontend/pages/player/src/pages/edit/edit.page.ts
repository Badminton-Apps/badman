import { CommonModule, Location } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnInit,
} from '@angular/core';
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
import { combineLatest } from 'rxjs';
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
export class EditPageComponent implements OnInit, AfterViewInit {
  private destroy$ = injectDestroy();

  player!: Player;
  selectedTabIndex?: number;

  hasRankingPermission = false;
  hasClubHistoryPermission = false;
  hasPermissionPermission = false;
  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    private claimService: ClaimService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.route.data,
      this.hasPermission(['edit:ranking', 'status:competition']),
      this.hasPermission(['membership:club']),
      this.hasPermission(['edit:ranking']),
    ]).subscribe(([data, rankingPerm, clubHistoryPerm, permissionPerm]) => {
      this.player = data['player'];
      this.seoService.update({
        title: `${this.player.fullName}`,
        description: `Player ${this.player.fullName}`,
        type: 'website',
        keywords: ['player', 'badminton'],
      });
      this.breadcrumbsService.set('player/:id', this.player.fullName);

      this.hasRankingPermission = rankingPerm;
      this.hasClubHistoryPermission = clubHistoryPerm;
      this.hasPermissionPermission = permissionPerm;
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

  public hasPermission(claim: string[]) {
    return this.claimService.hasAnyClaims$(claim);
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
