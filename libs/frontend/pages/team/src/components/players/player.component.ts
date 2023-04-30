import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { PlayerSearchComponent } from '@badman/frontend-components';
import { Player, TeamPlayer } from '@badman/frontend-models';
import { TeamMembershipType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';

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

    // Material
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatSnackBarModule,

    // Own modules
    PlayerSearchComponent,
  ],
})
export class TeamPlayersComponent implements OnInit {
  @Input()
  group?: FormGroup;

  @Input()
  value?: FormArray;

  types = Object.keys(TeamMembershipType) as TeamMembershipType[];

  wherePlayer: { [key: string]: unknown } = {};

  ngOnInit(): void {
    if (!this.group && !this.value) {
      throw new Error('No group or value provided');
    }

    if (this.group && !this.value) {
      this.value = this.group.get('players') as FormArray;
    }

    if (!this.value) {
      throw new Error('No value provided');
    }


    if (this.group?.value.players?.length > 0) {
      this.wherePlayer['id'] = {
        $notIn: this.group?.value.players?.map((p: Player) => p.id),
      };
    }

    if (this.group?.value.type) {
      this.wherePlayer['gender'] =
        this.group?.value.type === 'MX' ? undefined : this.group?.value.type;
    }

  }

  async playerAdded(player: TeamPlayer) {
    player.membershipType = TeamMembershipType.REGULAR;
    this.group?.get('players')?.value.push(player);
  }

  async playerRemoved(player: TeamPlayer) {
    this.group
      ?.get('players')
      ?.value.splice(this.group?.get('players')?.value.indexOf(player), 1);
  }

  playerMembershipTypeChanged(player: TeamPlayer, type: MatSelectChange) {
    // find the player in the array and update the type
    const index = this.group
      ?.get('players')
      ?.value.findIndex((p: TeamPlayer) => p.id === player.id);

    const fc = this.group?.get('players');

    if (player !== undefined && player !== null && fc) {
      fc.value[index].type = type;
    }
  }

  // wherePlayer?: { [key: string]: unknown };

  // constructor(private apollo: Apollo) {}

  // ngOnInit(): void {
  //   if (
  //     !this.team.players ||
  //     (this.team.players.length === 0 && this.team.id)
  //   ) {
  //     this._loadPlayers()
  //       .pipe(
  //         tap((players) => {
  //           this.wherePlayer = {
  //             gender: this.team.type === 'MX' ? undefined : this.team.type,
  //             id: {
  //               $notIn: players?.map((p) => p.id),
  //             },
  //           };
  //         })
  //       )
  //       .subscribe((players) => {
  //         this.team.players = players || [];
  //       });
  //   }
  // }

  // private _loadPlayers() {
  //   return this.apollo
  //     .watchQuery<{ team: Partial<Team> }>({
  //       query: gql`
  //         query TeamPlayers($teamId: ID!) {
  //           team(id: $teamId) {
  //             id
  //             players {
  //               id
  //               fullName
  //               membershipType
  //               teamId
  //             }
  //           }
  //         }
  //       `,
  //       variables: {
  //         teamId: this.team.id,
  //       },
  //     })
  //     .valueChanges.pipe(
  //       transferState(`teamPlayers-${this.team.id}`),
  //       map((result) =>
  //         result?.data.team.players?.map((t) => new TeamPlayer(t))
  //       ),
  //       map(
  //         (players) =>
  //           players?.sort((a, b) => a.fullName.localeCompare(b.fullName)) ??
  //           undefined
  //       )
  //     );
  // }

  // async changePlayerMembershipType(
  //   player: Player,
  //   event: MatSelectChange
  // ): Promise<void> {
  //   if (player && event.value) {
  //     this.playerMembershipTypeChanged.emit({
  //       player,
  //       type: event.value as TeamMembershipType,
  //     });
  //     this.team.players = this.team.players?.map((p) => {
  //       if (p.id === player.id) {
  //         p.membershipType = event.value;
  //       }
  //       return p;
  //     });
  //   }
  // }

  // async addPlayerToTeam(player: TeamPlayer) {
  //   if (player) {
  //     player.membershipType = TeamMembershipType.REGULAR;
  //     this.playerAdded.emit(player);
  //     this.team.players?.push(player);
  //   }
  // }

  // async removePlayerFromTeam(player: Player) {
  //   if (player) {
  //     this.playerRemoved.emit(player);
  //     this.team.players = this.team.players?.filter((p) => p.id !== player.id);
  //   }
  // }
}
