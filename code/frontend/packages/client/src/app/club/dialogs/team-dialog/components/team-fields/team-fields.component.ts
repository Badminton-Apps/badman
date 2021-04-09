import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Input, Output } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Club, Team, Player, PlayerService } from 'app/_shared';
import { debounceTime, skip } from 'rxjs/operators';
import { merge } from 'rxjs';

@Component({
  selector: 'app-team-fields',
  templateUrl: './team-fields.component.html',
  styleUrls: ['./team-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFieldsComponent implements OnInit {
  @Output() onTeamAdded = new EventEmitter<Partial<Team>>();
  @Output() onTeamUpdated = new EventEmitter<Partial<Team>>();
  @Output() onCaptainUpdated = new EventEmitter<Partial<Player>>();

  @Input()
  team: Team = {} as Team;

  @Input()
  club: Club;

  teamForm: FormGroup;
  captainForm: FormGroup;

  ngOnInit() {
    const nameControl = new FormControl(this.team.name ?? `${this.club.name} `, Validators.required);
    const abbrControl = new FormControl(this.team.abbreviation ?? `${this.club.abbreviation} `, Validators.required);

    const typeControl = new FormControl(this.team.type, Validators.required);
    const preferredTimeControl = new FormControl(this.team.preferredTime);
    const preferredDayControl = new FormControl(this.team.preferredDay);
    const captainIdControl = new FormControl(this.team.captain?.id, Validators.required);

    const phoneControl = new FormControl(this.team.captain?.phone, Validators.required);
    const emailControl = new FormControl(this.team.captain?.email, Validators.required);

    this.teamForm = new FormGroup({
      name: nameControl,
      type: typeControl,
      abbreviation: abbrControl,
      preferredTime: preferredTimeControl,
      preferredDay: preferredDayControl,
      captainId: captainIdControl,
    });

    this.captainForm = new FormGroup({
      id: new FormControl(this.team.captain?.id),
      phone: phoneControl,
      email: emailControl,
    });

    this.captainForm.valueChanges.pipe(debounceTime(600)).subscribe(async (e) => {
      if (this.captainForm.valid) {
        if (this.captainForm.dirty) {
          this.onCaptainUpdated.next(this.captainForm.value);
        }

        if (this.teamForm.value.captainId != this.captainForm.value.id) {
          this.teamForm.patchValue({
            captainId: this.captainForm.value.id,
          });
        }
      }
    });

    this.teamForm.valueChanges.pipe(debounceTime(600)).subscribe(async (e) => {
      if (this.team?.id != null) {
        this.onTeamUpdated.next({
          id: this.team?.id,
          type: e?.type,
          abbreviation: e?.abbreviation,
          preferredTime: e?.preferredTime,
          preferredDay: e?.preferredDay,
          captainId: e?.captainId,
        });
      }
    });

    typeControl.valueChanges.subscribe((r) => {
      if (!nameControl.touched) {
        if (typeControl.valid) {
          const number = this.club.teams.reduce(
            (a, b) => (b.type == typeControl.value ? (a > b.teamNumber ? a : b.teamNumber) : a),
            0
          );

          let suffix = '';
          switch (typeControl.value) {
            case 'MX':
              suffix = 'G';
              break;
            case 'F':
              suffix = 'D';
              break;
            case 'M':
              suffix = 'H';
              break;
          }

          nameControl.setValue(`${this.club.name} ${number + 1}${suffix}`);
        }
      }

      if (!abbrControl.touched) {
        let abbr = nameControl.value;
        abbr = abbr.replace(this.club?.name, '');
        abbr = abbr.replace(this.club?.abbreviation, '');
        abbr = abbr.replace(/[^0-9a-zA-Z]+/, ' ');

        const typeMatch = abbr.match(/(\d+[GHD])/) ?? [];
        if (typeMatch) {
          abbr = abbr.substr(0, abbr.lastIndexOf(typeMatch[0]));
        }

        abbrControl.setValue(`${this.club?.abbreviation} ${typeMatch[0] ?? ''}`);
      }
    });
  }

  async selectedCaptain(player: Player) {
    this.captainForm.patchValue({
      phone: player.phone,
      email: player.email,
      id: player.id,
    });
  }

  teamAdded() {
    this.onTeamAdded.next(this.teamForm.value);
  }
}
