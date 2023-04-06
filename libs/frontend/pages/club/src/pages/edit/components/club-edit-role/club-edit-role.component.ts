import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import {
  HasClaimComponent,
  PlayerSearchComponent,
} from '@badman/frontend-components';
import { Club, Player, Role } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-club-edit-role',
  templateUrl: './club-edit-role.component.html',
  styleUrls: ['./club-edit-role.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,

    // Other modules
    MatMenuModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,

    // My Modules
    HasClaimComponent,
    PlayerSearchComponent,
  ],
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
