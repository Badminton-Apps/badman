import {
  Component, Input
} from '@angular/core';
import { Event } from 'app/_shared';

@Component({
  selector: 'app-competition-data',
  templateUrl: './competition-data.component.html',
  styleUrls: ['./competition-data.component.scss']
})
export class CompetitionDataComponent {
  @Input()
  data!: Event
}
