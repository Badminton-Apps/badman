import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import * as moment from 'moment';

@Component({
  templateUrl: './change-encounter.component.html',
  styleUrls: ['./change-encounter.component.scss'],
})
export class ChangeEncounterComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});

  constructor() {}

  ngOnInit(): void {}
}
