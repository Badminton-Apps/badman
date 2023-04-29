import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlayerSearchComponent } from '@badman/frontend-components';
import {
  Club,
  Player,
  SubEventCompetition,
  Team,
} from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { PickEventDialogComponent } from '../../../../dialogs';

@Component({
  selector: 'badman-club-edit-team',
  templateUrl: './club-edit-team.component.html',
  styleUrls: ['./club-edit-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,

    // Other modules
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,

    // My Modules
    PlayerSearchComponent,
  ],
})
export class ClubEditTeamComponent implements OnInit {
  @Output() whenPlayerAdded = new EventEmitter<Partial<Player>>();
  @Output() whenPlayerRemoved = new EventEmitter<Partial<Player>>();
  @Output() whenSubEventChanged = new EventEmitter<{
    event: string;
    subEvent: string;
  }>();

  @Input()
  club!: Club;

  @Input()
  team!: Team;

  entry?: SubEventCompetition;

  players?: (Partial<Player> & {
    single: number;
    double: number;
    mix: number;
  })[];
  teamIndex?: number;

  where!: { [key: string]: unknown };

  constructor(private readonly dialog: MatDialog) {}

  ngOnInit(): void {
    this.entry = this.team.entry?.subEventCompetition;

    this.teamIndex = this.team.entry?.meta?.competition?.teamIndex;
    this.players = this.team.entry?.meta?.competition?.players.map((p) => {
      const player = new Player(p.player) as Partial<Player> & {
        single: number;
        double: number;
        mix: number;
      };
      player.single = p.single;
      player.double = p.double;
      player.mix = p.mix;

      return player;
    });

    this.where = {
      gender:
        this.team.type == 'MX' || this.team.type == 'NATIONAL'
          ? undefined
          : this.team.type,
    };
  }

  changeSubEvent() {
    this.dialog
      .open(PickEventDialogComponent, {
        data: {
          season: this.team.season,
          eventId: this.entry?.eventCompetition?.id,
          subEventId: this.entry?.id,
        },
      })
      .afterClosed()
      .subscribe((event) => {
        if (event) {
          this.whenSubEventChanged.emit(event);
        }
      });
  }
}
