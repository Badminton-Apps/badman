import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  RankingSystem,
  RankingGroup,
  SystemService,
} from '@badman/frontend/shared';

@Component({
  templateUrl: './edit-ranking-system.component.html',
  styleUrls: ['./edit-ranking-system.component.scss'],
})
export class EditRankingSystemComponent implements OnInit {
  system$!: Observable<RankingSystem>;
  rankingGroups$!: Observable<RankingGroup[]>;

  constructor(
    private systemService: SystemService,
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
        return this.systemService.getSystem(id);
      })
    );
    this.rankingGroups$ = this.systemService.getSystemsGroups();
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
