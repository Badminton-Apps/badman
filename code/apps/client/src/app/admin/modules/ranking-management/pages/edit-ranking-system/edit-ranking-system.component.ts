import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { RankingSystem, RankingGroup } from '@badman/frontend/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, Observable } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './edit-ranking-system.component.html',
  styleUrls: ['./edit-ranking-system.component.scss'],
})
export class EditRankingSystemComponent implements OnInit {
  system$!: Observable<RankingSystem>;
  rankingGroups$!: Observable<RankingGroup[]>;

  constructor(
    private route: ActivatedRoute,
    private apollo: Apollo,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.system$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => {
        if (!id) {
          throw new Error('No id');
        }
        return this.apollo.query<{ rankingSystem: RankingSystem }>({
          query: gql`
            query RankingSystemQuery($id: ID!) {
              rankingSystem(id: $id) {
                id
                name
              }
            }
          `,
          variables: {
            id,
          },
        });
      }),
      map((x) => new RankingSystem(x.data.rankingSystem))
    );
    this.rankingGroups$ = this.apollo
      .query<{ rankingGroups: RankingGroup[] }>({
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
        map((x) => x.data?.rankingGroups ?? []),
        shareReplay(1)
      );
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
      })
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
      })
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
      })
    );
    this.snackBar.open('Saved', undefined, {
      duration: 1000,
      panelClass: 'success',
    });
  }
}
