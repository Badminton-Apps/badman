import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Club, Player, Role } from '@badman/frontend/models';

@Component({
  selector: 'badman-club-edit-role',
  templateUrl: './club-edit-role.component.html',
  styleUrls: ['./club-edit-role.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubEditRoleComponent {
  @Output() whenPlayerAdded = new EventEmitter<Player>();
  @Output() whenPlayerRemoved = new EventEmitter<Player>();
  @Output() whenEdit = new EventEmitter<Role>();
  @Output() whenDelete = new EventEmitter<Role>();

  @Input()
  club!: Club;

  @Input()
  role!: Role;
}
