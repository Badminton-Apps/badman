import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  templateUrl: './change-encounter.component.html',
  styleUrls: ['./change-encounter.component.scss'],
})
export class ChangeEncounterComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});

  requests = null;

  constructor() {}

  ngOnInit(): void {

    // this.formGroup.valueChanges.subscribe(r => console.log(this.formGroup.getRawValue())); 
  }

  showRequests(encounter){
    this.requests = [];
  }
}
