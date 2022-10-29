import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RankingGroup, RankingSystem } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, map, Observable, shareReplay } from 'rxjs';

@Component({
  templateUrl: './add-ranking-system.component.html',
  styleUrls: ['./add-ranking-system.component.scss'],
})
export class AddRankingSystemComponent {
  rankingGroups$: Observable<RankingGroup[]>;

  constructor(private apollo: Apollo, private router: Router) {
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

  async add(system: RankingSystem) {
    await lastValueFrom(
      this.apollo.mutate<{ createRankingSystem: RankingSystem }>({
        mutation: gql`
          mutation CreateRankingSystemMutation($data: RankingSystemCreateInput!) {
            createRankingSystem(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: system,
        },
      })
    );

    await this.router.navigate(['admin', 'ranking']);
  }
}
