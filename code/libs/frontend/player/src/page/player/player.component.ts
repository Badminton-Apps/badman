import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import {
  BehaviorSubject,
  combineLatest,
  lastValueFrom,
  Observable,
} from 'rxjs';
import {
  catchError,
  map,
  share,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { apolloCache } from '@badman/frontend-graphql';
import { DeviceService } from '@badman/frontend-shared';

import { Player } from '@badman/frontend-models';
import { UserService } from '@badman/frontend-authentication';

@Component({
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit, OnDestroy {
  private mobileQueryListener!: () => void;
  player$!: Observable<Player | null>;
  user$!: Observable<Player | undefined | null>;
  loadingPlayer = false;

  canClaimAccount$!: Observable<{
    isUser: boolean;
    canClaim: boolean;
  }>;

  updateHappend$ = new BehaviorSubject(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private snackbar: MatSnackBar,
    private titleService: Title,
    public device: DeviceService,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(map((x) => x.get('id')));

    this.player$ = combineLatest([id$, this.updateHappend$]).pipe(
      share(),
      switchMap(([playerId]) => {
        if (!playerId) {
          throw new Error('No player id');
        }
        return this.apollo.query<{ player: Partial<Player> }>({
          query: gql`
            # Write your query or mutation here
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
                updatedAt
              }
            }
          `,
          variables: {
            id: playerId,
          },
        });
      }),
      map(({ data }) => {
        if (!data) {
          throw new Error('No player found');
        }
        return new Player(data.player);
      }),
      tap((player) => this.titleService.setTitle(`${player.fullName}`)),
      catchError((err) => {
        console.error('error', err);
        this.snackbar.open(err.message);
        this.router.navigate(['/']);
        throw err;
      }),
      shareReplay()
    );

    this.user$ = this.updateHappend$.pipe(
      switchMap(() => this.userService.profile$),
      shareReplay()
    );

    // this.canClaimAccount$ = combineLatest([this.player$, this.user$]).pipe(
    //   map(([player, user]) => {
    //     if (!player) {
    //       return { canClaim: false, isUser: false };
    //     }

    //     return {
    //       canClaim: !player.sub && !user,
    //       isUser: user?.id === player?.id,
    //     };
    //   }),
    //   startWith({ canClaim: false, isUser: false })
    // );
  }

  ngOnDestroy(): void {
    this.device.removeEvent('change', this.mobileQueryListener);
  }

  async claimAccount(playerId: string) {
    const result = await lastValueFrom(
      this.apollo.mutate<{ claim: Player }>({
        mutation: gql`
          mutation ClaimAccount($playerId: String!) {
            claimAccount(playerId: $playerId) {
              id
              fullName
              sub
            }
          }
        `,
        variables: {
          playerId,
        },
      })
    );

    if (result.data?.claim) {
      this.snackbar.open('Account claimed');
      // Clear cache
      const normalizedId = apolloCache.identify({
        id: result.data?.claim?.id,
        __typename: 'Player',
      });
      apolloCache.evict({ id: normalizedId });
      apolloCache.gc();

      // Mark as updated
      this.userService.reloadProfile();
      this.updateHappend$.next(null);
    }

    // const result = await lastValueFrom(
    //   this.userService
    //     .requestLink(playerId)
    //     .pipe(tap(() => this.updateHappend$.next(null)))
    // );

    // if (result && result.id) {
    //   this.snackbar.open('Account linked', 'close', { duration: 5000 });
    // } else {
    //   this.snackbar.open("Wasn't able to link the account", 'close', {
    //     duration: 5000,
    //   });
    // }
  }
}
