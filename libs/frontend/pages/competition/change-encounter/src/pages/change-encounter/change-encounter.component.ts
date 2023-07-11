import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { ClaimService } from '@badman/frontend-auth';
import {
  HasClaimComponent,
  SelectClubComponent,
  SelectSeasonComponent,
  SelectTeamComponent,
} from '@badman/frontend-components';
import { VERSION_INFO } from '@badman/frontend-html-injects';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { map } from 'rxjs';
import { ListEncountersComponent, ShowRequestsComponent } from './components';

@Component({
  selector: 'badman-change-encounter',
  templateUrl: './change-encounter.component.html',
  styleUrls: ['./change-encounter.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,

    TranslateModule,

    MatIconModule,

    // Own
    SelectClubComponent,
    SelectTeamComponent,
    SelectSeasonComponent,
    ListEncountersComponent,
    ShowRequestsComponent,
    HasClaimComponent,
  ],
  standalone: true,
})
export class ChangeEncounterComponent implements OnInit {
  breakpointObserver = inject(BreakpointObserver);
  isHandset = toSignal(
    this.breakpointObserver
      .observe(Breakpoints.Handset)
      .pipe(map((result) => result.matches))
  );

  hasPermission = toSignal(
    this.claimService.hasAnyClaims$(['change-any:encounter'])
  );

  canSelectSeason = computed(
    () => this.hasPermission() || this.versionInfo.beta
  );

  formGroup?: FormGroup;

  constructor(
    private activatedRoute: ActivatedRoute,
    @Inject(VERSION_INFO)
    private versionInfo: {
      beta: boolean;
      version: string;
    },
    private claimService: ClaimService
  ) {}

  ngOnInit(): void {
    const querySeason = parseInt(
      this.activatedRoute.snapshot.queryParams['season'],
      10
    );
    const season = isNaN(querySeason) ? getCurrentSeason() : querySeason;

    this.formGroup = new FormGroup({
      season: new FormControl(season),
      mayRankingDate: new FormControl(moment(`${season}-05-15`).toDate()),
      club: new FormControl(),
      team: new FormControl(),
      encounter: new FormControl(),
    });
  }
}
