import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  SelectClubComponent,
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
    ListEncountersComponent,
    ShowRequestsComponent
  ],
  standalone: true,
})
export class ChangeEncounterComponent implements OnInit {
  formGroup?: FormGroup;

  constructor(private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    const queryYear = parseInt(
      this.activatedRoute.snapshot.queryParams['year'],
      10
    );
    const year = isNaN(queryYear) ? getCurrentSeason() : queryYear;

    this.formGroup = new FormGroup({
      year: new FormControl(year),
      mayRankingDate: new FormControl(moment(`${year}-05-15`).toDate()),
      club: new FormControl(),
      team: new FormControl(),
      encounter: new FormControl(),
    });
  }
}
