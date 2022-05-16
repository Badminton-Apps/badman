import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TournamentEvent } from '../../../_shared';

@Component({
  selector: 'badman-event-tournament-fields',
  templateUrl: './event-tournament-fields.component.html',
  styleUrls: ['./event-tournament-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTournamentFieldsComponent {
  @Input()
  event: TournamentEvent = {} as TournamentEvent;

  eventForm!: FormGroup;
}
