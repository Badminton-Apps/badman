import { Component, Input } from '@angular/core';
import { Event } from '../../../../../_shared';

@Component({
  selector: 'badman-competition-data',
  templateUrl: './competition-data.component.html',
  styleUrls: ['./competition-data.component.scss'],
})
export class CompetitionDataComponent {
  @Input()
  data!: Event;
}
