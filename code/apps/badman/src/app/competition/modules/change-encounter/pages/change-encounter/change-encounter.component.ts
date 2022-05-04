import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';

@Component({
  templateUrl: './change-encounter.component.html',
  styleUrls: ['./change-encounter.component.scss'],
})
export class ChangeEncounterComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});

  constructor(private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    const today = moment();
    const queryYear = parseInt(this.activatedRoute.snapshot.queryParams['year'], 10);
    const year = isNaN(queryYear) ? (today.month() >= 6 ? today.year() : today.year() - 1) : queryYear;
    
    this.formGroup.addControl('year', new FormControl(year));
    this.formGroup.addControl('mayRankingDate', new FormControl(moment(`${year}-05-15`).toDate()));
  }
}
