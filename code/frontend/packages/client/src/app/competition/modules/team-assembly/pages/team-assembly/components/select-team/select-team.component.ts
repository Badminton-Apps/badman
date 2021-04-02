import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { TeamService } from 'app/_shared';
import { Club } from 'app/_shared/models/club.model';
import { Team } from 'app/_shared/models/team.model';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-select-team',
  templateUrl: './select-team.component.html',
  styleUrls: ['./select-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTeamComponent implements OnInit {
  @Input()
  formGroup: FormGroup;
  @Input()
  dependsOn: string = 'club';

  formControl = new FormControl();
  options: Team[];
  filteredOptions: Observable<Team[]>;

  constructor(private teamService: TeamService) {}

  async ngOnInit() {
    this.formControl.disable();
    this.formGroup.addControl('team', this.formControl);

    const previous = this.formGroup.get(this.dependsOn);

    if (previous) {
      previous.valueChanges.subscribe(async (r) => {
        this.formControl.setValue(null);

        if (r?.id != null) {
          if (!this.formControl.enabled) {
            this.formControl.enable();
          }
          // TODO: Convert to observable way
          this.options = await this.teamService.getTeams(r.id).toPromise();
          this.filteredOptions = this.formControl.valueChanges.pipe(
            startWith(''),
            map((value) => this._filter(value))
          );
        } else {
          this.formControl.disable();
        }
      });
    } else {
      console.warn('Dependency not found', previous);
    }
  }

  private _filter(value: string | Team): Team[] {
    // when selected the filter is with the selected object
    if (typeof value === 'string') {
      const filterValue = value.toLowerCase();

      return this.options.filter(
        (option) => option.name.toLowerCase().indexOf(filterValue) === 0
      );
    }
  }

  getOptionText(option) {
    return option?.name;
  }
}
