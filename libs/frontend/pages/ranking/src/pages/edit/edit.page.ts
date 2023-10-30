import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  PLATFORM_ID,
  Signal,
  TransferState,
  computed,
  effect,
  inject,
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
import { lastValueFrom, map } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { RankingSystemFieldsComponent } from '../../components/ranking-system-fields/ranking-system-fields.component';

const FETCH_SYSTEM = gql`
  query RankingSystemQuery($id: ID!) {
    rankingSystem(id: $id) {
      id
      name
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
      caluclationIntervalLastUpdate
      caluclationIntervalAmount
      calculationIntervalUnit
      periodAmount
      periodUnit
      updateIntervalAmountLastUpdate
      updateIntervalAmount
      updateIntervalUnit
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
    // Core modules
    CommonModule,
    RouterModule,

    TranslateModule,
    ReactiveFormsModule,
    MomentModule,

    // Material Modules
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,

    // Own Module
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

  // route
  queryParams = toSignal(this.route.queryParamMap);
  routeParams = toSignal(this.route.paramMap);
  routeData = toSignal(this.route.data);

  systemId = computed(() => this.routeParams()?.get('id') as string);
  systemName = computed(() => this.system()?.name);

  // signals
  system!: Signal<RankingSystem>;
  groups!: Signal<RankingGroup[] | undefined>;

  constructor() {
    if (!this.systemId()) {
      throw new Error('No system id');
    }

    // Effect on the system id
    effect(() => {
      this.system = this._loadSystem();
      this.groups = this._loadGroups();
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
    return toSignal(
      this.apollo
        .query<{ rankingSystem: Partial<RankingSystem> }>({
          query: FETCH_SYSTEM,
          variables: {
            id: this.systemId(),
          },
        })
        .pipe(
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
        ),
      {
        injector: this.injector,
      },
    ) as Signal<RankingSystem>;
  }

  private _loadGroups() {
    return toSignal(
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
        ),
      {
        injector: this.injector,
      },
    ) as Signal<RankingGroup[]>;
  }
}
