import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Club, Location } from 'app/_shared';

@Component({
  selector: 'app-club-edit-location',
  templateUrl: './club-edit-location.component.html',
  styleUrls: ['./club-edit-location.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubEditLocationComponent {
  @Output() onEdit = new EventEmitter<Location>();
  @Output() onDelete = new EventEmitter<Location>();

  @Input()
  club!: Club;

  @Input()
  location!: Location;
}
