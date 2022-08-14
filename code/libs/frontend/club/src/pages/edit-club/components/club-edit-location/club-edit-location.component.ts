import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Club, Location } from '@badman/frontend/models';

@Component({
  selector: 'badman-club-edit-location',
  templateUrl: './club-edit-location.component.html',
  styleUrls: ['./club-edit-location.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubEditLocationComponent {
  @Output() whenEdit = new EventEmitter<Location>();
  @Output() whenDelete = new EventEmitter<Location>();

  @Input()
  club!: Club;

  @Input()
  location!: Location;
}
