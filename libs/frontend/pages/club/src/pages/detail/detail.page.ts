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
  SelectSeasonComponent,
} from '@badman/frontend-components';
import { TwizzitService } from '@badman/frontend-twizzit';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { lastValueFrom } from 'rxjs';
import { distinctUntilChanged, filter, startWith, take } from 'rxjs/operators';
import { ClubDetailService } from '../../services/club.service';

import { MatDialog } from '@angular/material/dialog';
import { Player } from '@badman/frontend-models';
import { ClubAssemblyComponent } from './club-assembly/club-assembly.component';
import { ClubCompetitionComponent } from './club-competition/club-competition.component';
import { ClubEncountersComponent } from './club-encounters/club-encounters.component';
import { ClubPlayersComponent } from './club-players/club-players.component';
import { ClubTeamsComponent } from './club-teams/club-teams.component';
import { ClubAssemblyService } from './club-assembly/club-assembly.service';

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
    SelectSeasonComponent,
  ],
})
export class DetailPageComponent {
  private readonly clubDetailService = inject(ClubDetailService);
  private readonly clubAssemblyService = inject(ClubAssemblyService);

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

    effect(() => {
      this.filter?.valueChanges
        .pipe(startWith(this.filter.getRawValue()), distinctUntilChanged())
        .subscribe((filter) => {
          this.clubAssemblyService.filter.patchValue({
            clubId: this.club()?.id,
            season: filter.season,
            choices: undefined,
          });
        });
    });
  }

  async downloadTwizzit() {
    const season = this.filter.get('season')?.value;
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
