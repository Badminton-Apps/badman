import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TournamentEvent } from 'app/_shared';

@Component({
  selector: 'app-event-tournament-fields',
  templateUrl: './event-tournament-fields.component.html',
  styleUrls: ['./event-tournament-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTournamentFieldsComponent {
  @Input()
  event: TournamentEvent = {} as TournamentEvent;

  eventForm: FormGroup;
}
