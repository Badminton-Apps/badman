import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo, gql } from 'apollo-angular';
import { combineLatest, Observable } from 'rxjs';
import { groupBy, map, mergeMap, take, tap, toArray } from 'rxjs/operators';
import { Claim, Player } from '@badman/frontend/models';
import { ClaimService, UserService } from '@badman/frontend/shared';

@Component({
  selector: 'badman-edit-permissions',
  templateUrl: './edit-permissions.component.html',
  styleUrls: ['./edit-permissions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPermissionsComponent implements OnInit {
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  @Input()
  player!: Player;

  constructor(
    private claimService: ClaimService,
    private apollo: Apollo,
    private userService: UserService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (!this.player?.id) {
      throw new Error('No player');
    }

    const claims$ = this.apollo
      .query<{ claims: Claim[] }>({
        fetchPolicy: 'no-cache',
        query: gql`
          query Claims($where: JSONObject) {
            claims(where: $where) {
              name
              description
              category
              type
              id
            }
          }
        `,
        variables: {
          where: {
            type: 'GLOBAL',
          },
        },
      })
      .pipe(map((x) => x.data?.claims?.map((c) => new Claim(c))));

    const playerClaims$ = this.apollo
      .query<{
        player: { claims: Claim[] };
      }>({
        fetchPolicy: 'no-cache',
        query: gql`
          query PlayerClaims($playerId: ID!) {
            player(id: $playerId) {
              id
              claims {
                id
                name
                category
                description
                type
              }
            }
          }
        `,
        variables: {
          playerId: this.player.id,
        },
      })
      .pipe(map((x) => x.data?.player?.claims?.map((c) => new Claim(c))));

    this.claims$ = combineLatest([playerClaims$, claims$]).pipe(
      take(1),
      map(([userPerm, globalClaims]) =>
        globalClaims.map((c) => {
          c.hasPermission = userPerm.findIndex((uc) => uc.name == c.name) != -1;
          return c;
        })
      ),
      mergeMap((res) => res),
      groupBy((claim) => claim.category ?? 'Other'),
      mergeMap((obs) => {
        return obs.pipe(
          toArray(),
          map((items) => {
            return { category: obs.key, claims: items };
          })
        );
      }),
      toArray()
    );
  }

  claimChanged(claim: Claim, checked: boolean) {
    if (!this.player?.id) {
      throw new Error('No player');
    }
    if (!claim?.id) {
      throw new Error('No claim');
    }

    this.apollo
      .mutate<{ claims: Claim[] }>({
        mutation: gql`
          mutation ClaimPlayer(
            $playerId: ID!
            $claimId: ID!
            $active: Boolean!
          ) {
            assignClaim(claimId: $claimId, playerId: $playerId, active: $active)
          }
        `,
        variables: {
          claimId: claim.id,
          playerId: this.player.id,
          active: checked,
        },
      })
      .pipe(
        take(1),
        tap(() => {
          this.userService.clearUserCache([this.player?.id ?? '']);
          this.userService.reloadProfile();
        })
      )
      .subscribe(() => {
        this._snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }
}
