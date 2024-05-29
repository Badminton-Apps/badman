import { Component, effect, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterModule } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import {
  AddPlayerComponent,
  HasClaimComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { TwizzitService } from '@badman/frontend-twizzit';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { lastValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { ClubDetailService } from '../../services/club.service';

import { MatDialog } from '@angular/material/dialog';
import { Player } from '@badman/frontend-models';
import { ClubAssemblyComponent } from './club-assembly/club-assembly.component';
import { ClubCompetitionComponent } from './club-competition/club-competition.component';
import { ClubEncountersComponent } from './club-encounters/club-encounters.component';
import { ClubPlayersComponent } from './club-players/club-players.component';
import { ClubTeamsComponent } from './club-teams/club-teams.component';

@Component({
  selector: 'badman-club-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    RouterModule,
    TranslateModule,

    MatMenuModule,
    MatIcon,
    MatButtonModule,
    MatTabsModule,

    HasClaimComponent,
    PageHeaderComponent,

    // tabs
    ClubTeamsComponent,
    ClubAssemblyComponent,
    ClubPlayersComponent,
    ClubEncountersComponent,
    ClubCompetitionComponent,
  ],
})
export class DetailPageComponent {
  private readonly clubDetailService = inject(ClubDetailService);
  private readonly twizzitService = inject(TwizzitService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly claimService = inject(ClaimService);

  private readonly clubId = injectParams('id');
  readonly currentTab = injectQueryParams('tab');

  club = this.clubDetailService.club;
  filter = this.clubDetailService.filter;

  canViewEncounter = this.claimService.hasClaimSignal('edit-any:club');
  canViewEnrollments = this.claimService.hasAnyClaimsSignal([
    'view-any:enrollment-competition',
    `${this.club()?.id}_view:enrollment-competition`,
  ]);

  constructor() {
    effect(() => {
      const clubId = this.clubId();

      if (!clubId) {
        return;
      }

      this.clubDetailService.filter.patchValue({
        clubId,
      });
    });
  }

  async downloadTwizzit() {
    const season = this.clubDetailService.filter.get('season')?.value;
    const club = this.club();

    if (!club || !season) {
      return;
    }

    await lastValueFrom(this.twizzitService.downloadTwizzit(club, season));
  }

  addPlayer() {
    this.dialog
      .open(AddPlayerComponent)
      .afterClosed()
      .pipe(
        take(1),
        filter((player: Player) => !!player?.memberId),
      )
      .subscribe((player: Player) => {
        this.clubDetailService.state.addPlayer(player);
      });
  }

  setTab(index: number) {
    this.router.navigate([], {
      queryParams: {
        tab: index === 0 ? undefined : index,
      },
      queryParamsHandling: 'merge',
    });
  }
}
