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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthenticateService, ClaimService } from '@badman/frontend-auth';
import {
  ConfirmDialogComponent,
  ConfirmDialogModel,
  HasClaimComponent,
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { Game, Player, Team } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { Observable, combineLatest, lastValueFrom, of } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ShowLevelComponent } from './components/show-level.component';
@Component({
  selector: 'badman-player-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatDialogModule,
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
    HasClaimComponent,
    ShowLevelComponent
],
})
export class DetailPageComponent {
  // Dependencies
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);
  private seoService = inject(SeoService);
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private claim = inject(ClaimService);
  private auth = inject(AuthenticateService);
  private destroy$ = injectDestroy();
  private injector = inject(Injector);

  // route
  private queryParams = toSignal(this.route.queryParamMap);
  private routeParams = toSignal(this.route.paramMap);
  private routeData = toSignal(this.route.data);

  player = computed(() => this.routeData()?.['player'] as Player);
  playerId = computed(() => this.player()?.id as string);
  club = computed(() => this.player().clubs?.[0]);

  initials?: string;

  teams = signal<Team[]>([]);
  hasTeams = computed(() => this.teams()?.length > 0);

  hasMenu$?: Observable<boolean>;
  canClaim$?: Observable<boolean>;

  constructor() {
    effect(
      () => {
        this._loadTeamsForPlayer();

        this.seoService.update({
          title: `${this.player().fullName}`,
          description: `Player ${this.player().fullName}`,
          type: 'website',
          keywords: ['player', 'badminton'],
        });
        this.breadcrumbService.set('player/:id', this.player().fullName);

        const lastNames = `${this.player().lastName}`.split(' ');
        if ((lastNames ?? []).length > 0) {
          this.initials = `${this.player().firstName?.[0]}${lastNames?.[
            lastNames.length - 1
          ][0]}`.toUpperCase();
        }
      },
      {
        allowSignalWrites: true,
        injector: this.injector,
      },
    );

    this.hasMenu$ = combineLatest([
      this.auth.loggedIn$ ?? of(false),
      this.claim.hasAnyClaims$([
        'edit-any:player',
        this.player().id + '_edit:player',
        'change:job',
      ]),
    ]).pipe(
      takeUntil(this.destroy$),
      map(
        ([loggedIn, hasClaim]) =>
          loggedIn && (hasClaim || this.player().sub === null),
      ),
    );

    this.canClaim$ = combineLatest([
      this.auth.loggedIn$ ?? of(false),
      this.auth.user$ ?? of(null),
    ]).pipe(
      takeUntil(this.destroy$),

      map(([loggedIn, user]) => loggedIn && !user.id),
    );
  }

  getPlayer(game: Game, player: number, team: number) {
    const playerInGame = game.players?.find(
      (p) => p.player === player && p.team === team,
    );
    return playerInGame?.fullName || 'Unknown';
  }

  private _loadTeamsForPlayer() {
    this.apollo
      .query<{ player: { teams: Partial<Team>[] } }>({
        query: gql`
          query ClubsAndTeams($playerId: ID!) {
            player(id: $playerId) {
              id
              teams {
                id
                clubId
                slug
              }
            }
          }
        `,
        variables: {
          playerId: this.player().id,
        },
      })
      .pipe(
        takeUntil(this.destroy$),
        map((result) => result.data.player.teams?.map((t) => new Team(t))),
        transferState(
          `teamsPlayer-${this.player().id}`,
          this.stateTransfer,
          this.platformId,
        ),
      )
      .subscribe((teams) => {
        if (!teams) {
          return;
        }

        this.teams.set(teams);
      });
  }

  async claimAccount() {
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation ClaimAccount($playerId: String!) {
            claimAccount(playerId: $playerId) {
              id
            }
          }
        `,
        variables: {
          playerId: this.player().id,
        },
      }),
    );

    this.snackBar.open(this.translate.instant('all.player.claimed'), 'OK', {
      duration: 5000,
    });
    window.location.reload();
  }

  removePlayer() {
    const dialogData = new ConfirmDialogModel(
      'all.club.delete.player.title',
      'all.club.delete.player.description',
    );

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '400px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((dialogResult) => {
      if (!dialogResult) {
        return;
      }

      this.apollo
        .mutate({
          mutation: gql`
            mutation RemovePlayer($id: ID!) {
              removePlayer(id: $id)
            }
          `,
          variables: {
            id: this.player().id,
          },
          refetchQueries: ['Teams'],
        })
        .subscribe(() => {
          this.snackBar.open('Deleted', undefined, {
            duration: 1000,
            panelClass: 'success',
          });
          this.router.navigate(['/']);
        });
    });
  }
}
