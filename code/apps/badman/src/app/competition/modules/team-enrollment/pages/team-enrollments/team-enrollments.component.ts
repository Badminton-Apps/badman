import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Title } from '@angular/platform-browser';

@Component({
  templateUrl: './team-enrollments.component.html',
  styleUrls: ['./team-enrollments.component.scss'],
})
export class TeamEnrollmentsComponent {
  eventControl: FormControl = new FormControl();
  yearControl: FormControl = new FormControl();

  constructor(private _title: Title) {
    this._title.setTitle('Team Enrollments');
  }
}
