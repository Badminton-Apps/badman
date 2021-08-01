import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from 'app/_shared';
import { Team } from 'app/_shared/models/team.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-select-team',
  templateUrl: './select-team.component.html',
  styleUrls: ['./select-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectTeamComponent implements OnInit, OnDestroy {
  @Input()
  controlName = 'team';

  @Input()
  formGroup: FormGroup;

  @Input()
  dependsOn: string = 'club';

  formControl = new FormControl();
  teamsM: Team[];
  teamsF: Team[];
  teamsMX: Team[];

  constructor(private teamService: TeamService, private router: Router, private activatedRoute: ActivatedRoute) {}

  async ngOnInit() {
    this.formControl.disable();
    this.formGroup.addControl(this.controlName, this.formControl);

    const previous = this.formGroup.get(this.dependsOn);

    if (previous) {
      this.formControl.valueChanges.pipe(filter((r) => !!r)).subscribe((r) => {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { team: r.id },
          queryParamsHandling: 'merge',
        });
      });

      previous.valueChanges.subscribe(async (r) => {
        this.formControl.setValue(null);

        if (r?.id != null) {
          if (!this.formControl.enabled) {
            this.formControl.enable();
          }
          // TODO: Convert to observable way
          const teams = await this.teamService.getTeams(r.id).toPromise();

          this.teamsF = teams.filter((r) => r.type === 'F').sort((a, b) => a.teamNumber - b.teamNumber);
          this.teamsM = teams.filter((r) => r.type === 'M').sort((a, b) => a.teamNumber - b.teamNumber);
          this.teamsMX = teams.filter((r) => r.type === 'MX').sort((a, b) => a.teamNumber - b.teamNumber);

          const params = this.activatedRoute.snapshot.queryParams;
          if (params && params.team && teams.length > 1) {
            const foundTeam = teams.find((r) => r.id == params.team);
          
          
            if (foundTeam) {
              this.formControl.setValue(foundTeam);
            } else {
              this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { team: undefined, encounter: undefined },
                queryParamsHandling: 'merge',
              });
            }
          }
        } else {
          this.formControl.disable();
        }
      });
    } else {
      console.warn(`Dependency ${this.dependsOn} not found`, previous);
    }
  }

  ngOnDestroy() {
    this.formGroup.removeControl(this.controlName);
  }
}
