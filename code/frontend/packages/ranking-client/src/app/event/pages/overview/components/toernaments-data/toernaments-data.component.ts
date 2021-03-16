import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-toernaments-data',
  templateUrl: './toernaments-data.component.html',
  styleUrls: ['./toernaments-data.component.scss'],
})
export class ToernamentsDataComponent {
  @Input()
  data: Event;
}
