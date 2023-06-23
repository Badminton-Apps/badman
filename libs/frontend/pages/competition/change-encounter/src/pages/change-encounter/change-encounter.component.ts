import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  HasClaimComponent,
  SelectClubComponent,
  SelectSeasonComponent,
  SelectTeamComponent,
} from '@badman/frontend-components';
import { getCurrentSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { ListEncountersComponent, ShowRequestsComponent } from './components';

@Component({
  selector: 'badman-change-encounter',
  templateUrl: './change-encounter.component.html',
  styleUrls: ['./change-encounter.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,

    TranslateModule,

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
  formGroup?: FormGroup;

  constructor(private activatedRoute: ActivatedRoute) {}

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
