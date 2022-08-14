import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Player, RankingSystem } from '@badman/frontend/models';
import { ClaimService } from '@badman/frontend/shared';
@Component({
  templateUrl: './edit-player.component.html',
  styleUrls: ['./edit-player.component.scss'],
})
export class EditPlayerComponent implements OnInit {
  player$!: Observable<Player>;
  system?: RankingSystem;
  selectedTabIndex?: number;

  constructor(
    private apollo: Apollo,
    private claimService: ClaimService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.selectedTabIndex =
      parseInt(
        this.activatedRoute.snapshot.queryParamMap.get('tab') ?? '',
        10
      ) || 0;
    if (isNaN(this.selectedTabIndex) || this.selectedTabIndex < 0) {
      this.selectedTabIndex = 0;
    }
  }

  ngOnInit(): void {
    this.player$ = this.activatedRoute.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) {
          throw new Error('No id');
        }
        return this.apollo.query<{ player: Player }>({
          query: gql`
            query GetUserInfoQuery($id: ID!) {
              player(id: $id) {
                id
                slug
                memberId
                firstName
                lastName
                sub
                gender
                competitionPlayer
              }
            }
          `,
          variables: {
            id,
          },
        });
      }),
      map((result) => new Player(result?.data?.player))
    );
  }

  public hasPermission(claim: string[]) {
    return this.claimService.hasAnyClaims$(claim);
  }

  onTabChange(selectedTabIndex: number): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      replaceUrl: true,
      queryParams: {
        tab: selectedTabIndex,
      },
    });
    this.selectedTabIndex = selectedTabIndex;
  }
}
