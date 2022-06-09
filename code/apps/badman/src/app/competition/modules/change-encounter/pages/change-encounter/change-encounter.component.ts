import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { currentCompetitionYear } from '../../../../../_shared';
import * as moment from 'moment';

@Component({
  templateUrl: './change-encounter.component.html',
  styleUrls: ['./change-encounter.component.scss'],
})
export class ChangeEncounterComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});

  constructor(private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    const queryYear = parseInt(this.activatedRoute.snapshot.queryParams['year'], 10);
    const year = isNaN(queryYear) ? currentCompetitionYear() : queryYear;
    
    this.formGroup.addControl('year', new FormControl(year));
    this.formGroup.addControl('mayRankingDate', new FormControl(moment(`${year}-05-15`).toDate()));
  }
}
