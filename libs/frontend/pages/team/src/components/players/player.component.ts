import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, input } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { PlayerSearchComponent } from '@badman/frontend-components';
import { Player, TeamPlayer } from '@badman/frontend-models';
import { TeamMembershipType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';

export const PLAYERS_CONTROL = 'players';

@Component({
  selector: 'badman-team-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatSnackBarModule,
    PlayerSearchComponent,
  ],
})
export class TeamPlayersComponent implements OnInit {
  protected internalControl!: FormArray<FormControl<TeamPlayer>>;

  group = input<FormGroup>();
  control = input<FormArray<FormControl<TeamPlayer>>>();
  controlName = input(PLAYERS_CONTROL);

  @Output()
  typeChanged = new EventEmitter<{
    player: TeamPlayer;
    type: TeamMembershipType;
  }>();

  types = Object.keys(TeamMembershipType) as TeamMembershipType[];

  wherePlayer: { [key: string]: unknown } = {};

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    if (this.control() != undefined) {
      this.internalControl = this.control() as FormArray<FormControl<TeamPlayer>>;
    }

    if (!this.internalControl && this.group()) {
      this.internalControl = this.group()?.get(this.controlName()) as FormArray<
        FormControl<TeamPlayer>
      >;
    }

    if (!this.internalControl) {
      this.internalControl = new FormArray<FormControl<TeamPlayer>>([]);
    }

    if (this.group()) {
      this.group()?.addControl(this.controlName(), this.internalControl);
    }

    if (this.group()?.value.players?.length > 0) {
      this.wherePlayer['id'] = {
        $notIn: this.group()?.value.players?.map((p: Player) => p.id),
      };
    }

    if (this.group()?.value.type) {
      this.wherePlayer['gender'] =
        this.group()?.value.type === 'MX' ? undefined : this.group()?.value.type;
    }
  }

  async playerAdded(player: Player) {
    const newPlayer = new TeamPlayer(player);
    newPlayer.membershipType = TeamMembershipType.REGULAR;

    if (!newPlayer) {
      return;
    }

    if (this.control() && newPlayer != null) {
      this.internalControl.push(new FormControl<TeamPlayer>(newPlayer) as FormControl<TeamPlayer>);
    }
  }

  async playerRemoved(player: TeamPlayer) {
    const index = this.internalControl.value.findIndex((p: TeamPlayer) => p.id === player.id);

    if (index !== undefined && index !== null && index >= 0) {
      this.internalControl.removeAt(index);
    }
  }

  playerMembershipTypeChanged(player: TeamPlayer, type: MatSelectChange) {
    // find the player in the array and update the type
    const index = this.group()
      ?.get('players')
      ?.value.findIndex((p: TeamPlayer) => p.id === player.id);

    const fc = this.group()?.get('players');

    if (player !== undefined && player !== null && fc) {
      fc.value[index].type = type;
      this.typeChanged.emit({
        player,
        type: type.value,
      });
    }
  }
}
