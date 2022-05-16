import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Club, Player, Role } from '../../../../../_shared';

@Component({
  selector: 'badman-club-edit-role',
  templateUrl: './club-edit-role.component.html',
  styleUrls: ['./club-edit-role.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubEditRoleComponent {
  @Output() onPlayerAdded = new EventEmitter<Player>();
  @Output() onPlayerRemoved = new EventEmitter<Player>();
  @Output() onEdit = new EventEmitter<Role>();
  @Output() onDelete = new EventEmitter<Role>();

  @Input()
  club!: Club;

  @Input()
  role!: Role;
}
