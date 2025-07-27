
import { Component, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { AuthenticateService, ClaimService } from '@badman/frontend-auth';
import {
  ConfirmDialogComponent,
  ConfirmDialogModel,
  HasClaimComponent,
  PageHeaderComponent,
  RecentGamesComponent,
  UpcomingGamesComponent,
} from '@badman/frontend-components';
import { Game } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ShowLevelComponent } from './components/show-level.component';
import { PlayerDetailService } from './detail.service';
import { SelectPeriodDialogComponent } from './dialogs/select-period/select-period.component';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';

@Component({
  selector: 'badman-player-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule,
    RecentGamesComponent,
    UpcomingGamesComponent,
    PageHeaderComponent,
    HasClaimComponent,
    ShowLevelComponent
],
})
export class DetailPageComponent {
  // private
  private readonly router = inject(Router);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly seoService = inject(SeoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly claim = inject(ClaimService);
  private readonly auth = inject(AuthenticateService);

  readonly playerId = injectParams('id') as Signal<string>;
  private readonly detailService = inject(PlayerDetailService);

  private readonly _locale = signal(inject<unknown>(MAT_DATE_LOCALE));
  private readonly _adapter = inject<DateAdapter<unknown, unknown>>(DateAdapter);

  player = this.detailService.player;
  teams = this.detailService.teams;
  loaded = this.detailService.loaded;
  errors = this.detailService.error;

  club = computed(() => this.player()?.club);
  initials = computed(() => {
    const lastNames = `${this.player()?.lastName}`.split(' ');
    return `${this.player()?.firstName?.[0]}${lastNames?.[lastNames.length - 1][0]}`.toUpperCase();
  });

  hasTeams = computed(() => this.teams()?.length > 0);
  hasMenu = computed(() => this.auth.loggedIn() && (this.hasPermission() || this.canClaim()));
  canClaim = computed(() => {
    return this.auth.loggedIn() && !this.auth.user()?.id && !this.player()?.sub;
  });
  hasPermission = this.claim.hasAnyClaimsSignal([
    'edit-any:player',
    this.player()?.id + '_edit:player',
    'change:job',
    're-sync:points',
  ]);

  constructor() {
    effect(() => {
      const playerId = this.playerId();

      if (!playerId) {
        return;
      }

      this.detailService.filter.patchValue({
        playerId,
      });
    });

    effect(() => {
      const player = this.player();

      if (!player) {
        return;
      }

      this.seoService.update({
        title: `${player.fullName}`,
        description: `Player ${player.fullName}`,
        type: 'website',
        keywords: ['player', 'badminton'],
      });
      this.breadcrumbService.set('player/:id', player.fullName ?? '');

      untracked(() => {
        this.detailService.state.loadTeams();
      });
    });
  }

  getPlayer(game: Game, player: number, team: number) {
    const playerInGame = game.players?.find((p) => p.player === player && p.team === team);
    return playerInGame?.fullName ?? 'Unknown';
  }

  async claimAccount() {
    await this.detailService.state.claimAccount();
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

    dialogRef.afterClosed().subscribe(async (dialogResult) => {
      if (!dialogResult) {
        return;
      }

      await this.detailService.state.removePlayer();

      this.snackBar.open('Deleted', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this.router.navigate(['/']);
    });
  }

  reCalculatePoints() {
    this.dialog
      .open(SelectPeriodDialogComponent)
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.detailService.state.reCalculatePoints({
          from: result.from,
          to: result.to,
        });
      });
  }
}
