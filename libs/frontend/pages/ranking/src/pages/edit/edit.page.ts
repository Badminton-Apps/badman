import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  PLATFORM_ID,
  TransferState,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@badman/frontend-components';
import { RankingGroup, RankingSystem } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { lastValueFrom, map, takeUntil } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { RankingSystemFieldsComponent } from '../../components/ranking-system-fields/ranking-system-fields.component';

const FETCH_SYSTEM = gql`
  query RankingSystemQuery($id: ID!) {
    rankingSystem(id: $id) {
      id
      name
      primary
      calculateUpdates
      amountOfLevels
      procentWinning
      procentWinningPlus1
      procentLosing
      minNumberOfGamesUsedForUpgrade
      maxDiffLevels
      maxDiffLevelsHighest
      latestXGamesToUse
      maxLevelUpPerChange
      maxLevelDownPerChange
      gamesForInactivty
      inactivityAmount
      inactivityUnit
      inactiveBehavior
      calculationLastUpdate
      calculationIntervalAmount
      calculationIntervalUnit
      calculationDayOfWeek
      periodAmount
      periodUnit
      updateLastUpdate
      updateIntervalAmount
      updateIntervalUnit
      updateDayOfWeek
      rankingSystem
      differenceForDowngradeSingle
      differenceForDowngradeDouble
      differenceForDowngradeMix
      differenceForUpgradeSingle
      differenceForUpgradeDouble
      differenceForUpgradeMix
      startingType
      rankingGroups {
        id
        name
      }
    }
  }
`;

@Component({
  selector: 'badman-ranking-edit',
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    ReactiveFormsModule,
    MomentModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    PageHeaderComponent,
    RankingSystemFieldsComponent,
  ],
})
export class EditPageComponent {
  // injects
  private apollo = inject(Apollo);
  private injector = inject(Injector);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private seoService = inject(SeoService);
  private breadcrumbsService = inject(BreadcrumbService);
  private destroy$ = injectDestroy();

  // route
  private queryParams = toSignal(this.route.queryParamMap);
  private routeParams = toSignal(this.route.paramMap);
  private routeData = toSignal(this.route.data);

  systemId = computed(() => this.routeParams()?.get('id') as string);
  systemName = computed(() => this.system()?.name);

  // signals
  system = signal<RankingSystem | null>(null);
  groups = signal<RankingGroup[]>([]);

  constructor() {
    if (!this.systemId()) {
      throw new Error('No system id');
    }

    // Effect on the system id
    effect(() => {
      this._loadSystem();
      this._loadGroups();
    });

    // Effect on the system name
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

  async save(system: RankingSystem) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation UpdateRankingSystem($data: RankingSystemUpdateInput!) {
            updateRankingSystem(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: system,
        },
        refetchQueries: [
          {
            query: FETCH_SYSTEM,
            variables: {
              id: this.systemId(),
            },
          },
        ],
      }),
    );
    this.snackBar.open('Saved', undefined, {
      duration: 1000,
      panelClass: 'success',
    });
  }

  async addGroup({ systemId, groupId }: { systemId: string; groupId: string }) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation AddRankingGroupToRankingSystem(
            $rankingSystemId: ID!
            $rankingGroupId: ID!
          ) {
            addRankingGroupToRankingSystem(
              rankingSystemId: $rankingSystemId
              rankingGroupId: $rankingGroupId
            ) {
              id
            }
          }
        `,
        variables: {
          rankingSystemId: systemId,
          rankingGroupId: groupId,
        },
      }),
    );
    this.snackBar.open('Saved', undefined, {
      duration: 1000,
      panelClass: 'success',
    });
  }
  async removeGroup({
    systemId,
    groupId,
  }: {
    systemId: string;
    groupId: string;
  }) {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation RemoveRankingGroupToRankingSystem(
            $rankingSystemId: ID!
            $rankingGroupId: ID!
          ) {
            removeRankingGroupToRankingSystem(
              rankingSystemId: $rankingSystemId
              rankingGroupId: $rankingGroupId
            ) {
              id
            }
          }
        `,
        variables: {
          rankingSystemId: systemId,
          rankingGroupId: groupId,
        },
      }),
    );
    this.snackBar.open('Saved', undefined, {
      duration: 1000,
      panelClass: 'success',
    });
  }

  private _loadSystem() {
    this.apollo
      .query<{ rankingSystem: Partial<RankingSystem> }>({
        query: FETCH_SYSTEM,
        variables: {
          id: this.systemId(),
        },
      })
      .pipe(
        takeUntil(this.destroy$),
        map((result) => {
          if (!result?.data.rankingSystem) {
            throw new Error('No player');
          }
          return new RankingSystem(result.data.rankingSystem);
        }),
        transferState(
          `teamsPlayer-${this.systemId()}`,
          this.stateTransfer,
          this.platformId,
        ),
      )
      .subscribe((system) => {
        if (!system) {
          return;
        }

        this.system.set(system);
      });
  }

  private _loadGroups() {
    this.apollo
      .query<{
        rankingGroups: Partial<RankingGroup>[];
      }>({
        query: gql`
          query RankingGroupsQuery {
            rankingGroups {
              id
              name
            }
          }
        `,
      })
      .pipe(
        takeUntil(this.destroy$),
        map((result) => {
          if (!result?.data.rankingGroups) {
            throw new Error('No Systems');
          }
          return result.data.rankingGroups.map(
            (group) => new RankingGroup(group),
          );
        }),
        transferState(
          `teamsPlayer-${this.systemId()}`,
          this.stateTransfer,
          this.platformId,
        ),
      )
      .subscribe((groups) => {
        if (!groups) {
          return;
        }

        this.groups.set(groups);
      });
  }
}
