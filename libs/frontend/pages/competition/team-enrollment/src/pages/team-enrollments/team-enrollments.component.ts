import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  templateUrl: './team-enrollments.component.html',
  styleUrls: ['./team-enrollments.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,

    // Material
    MatTabsModule,
  ],
})
export class TeamEnrollmentsComponent {
  eventControl: FormControl = new FormControl();
  yearControl: FormControl = new FormControl();

  constructor(private _title: Title) {
    this._title.setTitle('Team Enrollments');
  }
}
