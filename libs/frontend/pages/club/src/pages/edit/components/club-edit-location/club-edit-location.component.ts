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
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BadmanBlockModule, HasClaimComponent } from '@badman/frontend-components';
import { Club, Location } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-club-edit-location',
  templateUrl: './club-edit-location.component.html',
  styleUrls: ['./club-edit-location.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    ReactiveFormsModule,

    // Other modules
    MatDividerModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,

    // My Modules
    HasClaimComponent,
    BadmanBlockModule
  ],
})
export class ClubEditLocationComponent {
  @Output() whenEdit = new EventEmitter<Location>();
  @Output() whenDelete = new EventEmitter<Location>();

  @Input()
  club!: Club;

  @Input()
  location!: Location;
}
