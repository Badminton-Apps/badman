import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  input,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClaimService } from '@badman/frontend-auth';
import { ClaimComponent } from '@badman/frontend-components';
import { Claim, Player } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { Observable, combineLatest } from 'rxjs';
import { groupBy, map, mergeMap, take, tap, toArray } from 'rxjs/operators';

@Component({
  selector: 'badman-edit-permissions',
  templateUrl: './edit-permissions.component.html',
  styleUrls: ['./edit-permissions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ClaimComponent],
})
export class EditPermissionsComponent implements OnInit {
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  selectedClaims: string[] = [];

  player = input.required<Player>();

  constructor(
    private apollo: Apollo,
    private claimService: ClaimService,
    private _snackBar: MatSnackBar,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.player()?.id) {
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
            type: 'global',
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
          playerId: this.player().id,
        },
      })
      .pipe(map((x) => x.data?.player?.claims?.map((c) => new Claim(c))));

    this.claims$ = claims$.pipe(
      take(1),
      mergeMap((res) => res),
      groupBy((claim) => claim.category ?? 'Other'),
      mergeMap((obs) => {
        return obs.pipe(
          toArray(),
          map((items) => {
            return { category: obs.key, claims: items };
          }),
        );
      }),
      toArray(),
    );

    combineLatest([claims$, playerClaims$]).subscribe(([claims, playerClaims]) => {
      this.selectedClaims = claims
        .filter((c) => playerClaims.some((pc) => pc.id === c.id))
        ?.map((c) => `${c.id}`);
      this.changeDetector.markForCheck();
    });
  }

  claimChanged(claim: Claim, checked: boolean) {
    if (!this.player()?.id) {
      throw new Error('No player');
    }
    if (!claim?.id) {
      throw new Error('No claim');
    }

    this.apollo
      .mutate<{ claims: Claim[] }>({
        mutation: gql`
          mutation ClaimPlayer($playerId: ID!, $claimId: ID!, $active: Boolean!) {
            assignClaim(claimId: $claimId, playerId: $playerId, active: $active)
          }
        `,
        variables: {
          claimId: claim.id,
          playerId: this.player().id,
          active: checked,
        },
      })
      .pipe(
        take(1),
        tap(() => {
          this.claimService.clearUserCache([this.player()?.id ?? '']);
          this.claimService.reloadProfile();
        }),
      )
      .subscribe(() => {
        this._snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }
}
