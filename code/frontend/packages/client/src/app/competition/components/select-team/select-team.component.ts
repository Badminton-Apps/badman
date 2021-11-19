import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService, UserService } from 'app/_shared';
import { Team } from 'app/_shared/models/team.model';
import { filter, map, share } from 'rxjs/operators';
import { Observable } from 'rxjs';

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
  formGroup!: FormGroup;

  @Input()
  dependsOn: string = 'club';

  formControl = new FormControl();
  teamsM?: Team[];
  teamsF?: Team[];
  teamsMX?: Team[];
  teamsNAT?: Team[];

  teamsM$?: Observable<Team[]>;
  teamsF$?: Observable<Team[]>;
  teamsMX$?: Observable<Team[]>;
  teamsNAT$?: Observable<Team[]>;

  constructor(
    private teamService: TeamService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private user: UserService
  ) {}

  async ngOnInit() {
    this.formControl.disable();
    this.formGroup.addControl(this.controlName, this.formControl);

    const previous = this.formGroup.get(this.dependsOn);

    if (previous) {
      this.formControl.valueChanges.pipe(filter((r) => !!r)).subscribe((r) => {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { team: r },
          queryParamsHandling: 'merge',
        });
      });

      previous.valueChanges.subscribe(async (clubId: string) => {
        this.formControl.setValue(null);

        if (clubId != null) {
          if (!this.formControl.enabled) {
            this.formControl.enable();
          }

          const team$ = this.teamService.getTeams(clubId).pipe(share());

          this.teamsF$ = team$.pipe(
            map((teams) => teams.filter((team) => team.type === 'F')),
            map((teams) => teams.sort((a, b) => a.teamNumber! - b.teamNumber!))
          );

          this.teamsM$ = team$.pipe(
            map((teams) => teams.filter((team) => team.type === 'M')),
            map((teams) => teams.sort((a, b) => a.teamNumber! - b.teamNumber!))
          );

          this.teamsMX$ = team$.pipe(
            map((teams) => teams.filter((team) => team.type === 'MX')),
            map((teams) => teams.sort((a, b) => a.teamNumber! - b.teamNumber!))
          );


          this.teamsNAT$ = team$.pipe(
            map((teams) => teams.filter((team) => team.type === 'NATIONAL')),
            map((teams) => teams.sort((a, b) => a.teamNumber! - b.teamNumber!))
          );


          team$.subscribe((teams) => {
            let foundTeam = null;
            let teamId = this.activatedRoute.snapshot?.queryParamMap?.get('team');

            if (teamId && teams.length > 0) {
              foundTeam = teams.find((r) => r.id == teamId);
            }

            if (foundTeam == null) {
              foundTeam = teams.find((r) => r.captainId == this.user?.profile?.id);
            }

            if (foundTeam) {
              this.formControl.setValue(foundTeam.id, { onlySelf: true });
            } else {
              this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { team: undefined, encounter: undefined },
                queryParamsHandling: 'merge',
              });
            }
          });
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
