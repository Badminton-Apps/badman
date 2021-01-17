import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Club, Team } from 'app/_shared';

@Component({
  selector: 'app-team-fields',
  templateUrl: './team-fields.component.html',
  styleUrls: ['./team-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFieldsComponent implements OnInit {
  @Input()
  team: Team = {} as Team;

  @Input()
  club: Club;

  @Output() save = new EventEmitter<Team>();
  teamForm: FormGroup;

  ngOnInit() {
    const nameControl = new FormControl(
      this.team.name ?? `${this.club.name} `,
      Validators.required
    );
    const abbrControl = new FormControl(
      this.team.abbreviation ?? `${this.club.abbreviation} `,
      Validators.required
    );

    this.teamForm = new FormGroup({
      name: nameControl,
      abbreviation: abbrControl,
    });

    nameControl.valueChanges.subscribe((r) => {
      if (!abbrControl.touched) {
        const typeMatch = r.match(/(\d[GHD])/) ?? [];
        if (typeMatch) {
          r = r.substr(0, r.lastIndexOf(typeMatch[0]));
        }

        abbrControl.setValue(`${this.club.abbreviation} ${typeMatch[0] ?? ''}`);
      }
    });
  }

  update() {
    if (this.teamForm.valid) {
      this.save.next({ id: this.team.id, ...this.teamForm.value });
    }
  }
}
