import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  templateUrl: './team-assembly.component.html',
  styleUrls: ['./team-assembly.component.scss'],
})
export class TeamAssemblyComponent implements OnInit {
  club: any;
  team: any;
  date: any;

  formGroup: FormGroup = new FormGroup({});

  constructor() {}

  ngOnInit(): void {}

  selectClub(club) {
    this.club = club;
  }
}
