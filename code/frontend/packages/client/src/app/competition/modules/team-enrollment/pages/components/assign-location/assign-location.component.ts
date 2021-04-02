import { CompetitionEvent, Location } from 'app/_shared';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  EventEmitter,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-assign-location',
  templateUrl: './assign-location.component.html',
  styleUrls: ['./assign-location.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignLocationComponent implements OnInit {
  @Input()
  locations: Location[];

  @Input()
  event: CompetitionEvent;

  @Output()
  onChange = new EventEmitter<{
    locationId: string;
    eventId: string;
    use: boolean;
  }>();

  checked: Map<string, boolean> = new Map();

  ngOnInit(): void {
    for (const location of this.locations) {
      this.checked.set(
        location.id,
        location.eventCompetitions.find((r) => r.id == this.event.id) != null
      );
    }
  }

  check(location: Location, checked: boolean) {
    this.onChange.next({
      locationId: location.id,
      use: checked,
      eventId: this.event.id,
    });
  }
}
