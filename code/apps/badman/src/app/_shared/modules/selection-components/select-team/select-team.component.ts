import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Team } from '../../../models';
import { TeamService, UserService } from '../../../services';
import { Apollo, gql } from 'apollo-angular';

@Component({
  selector: 'badman-select-team',
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
  dependsOn = 'club';

  formControl = new FormControl();
  teamsM?: Team[];
  teamsF?: Team[];
  teamsMX?: Team[];
  teamsNAT?: Team[];

  teamsM$?: Observable<Team[]>;
  teamsF$?: Observable<Team[]>;
  teamsMX$?: Observable<Team[]>;
  teamsNAT$?: Observable<Team[]>;

  // TODO check if this can be changed to obserable
  options?: Team[];

  constructor(
    private teamService: TeamService,
    private apollo: Apollo,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private user: UserService
  ) {}

  async ngOnInit() {
    this.formControl.disable();
    this.formGroup.addControl(this.controlName, this.formControl);

    const previous = this.formGroup.get(this.dependsOn);

    if (!previous) {
      console.warn(`Dependency ${this.dependsOn} not found`, previous);
    } else {
      this.formControl.valueChanges.pipe(filter((r) => !!r)).subscribe((r) => {
        const selectedTeam = this.options?.find((x) => x.id === r)?.slug ?? r;
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { team: selectedTeam },
          queryParamsHandling: 'merge',
        });
      });

      previous.valueChanges.subscribe(async (clubId: string) => {
        this.formControl.setValue(null);

        if (clubId != null) {
          if (!this.formControl.enabled) {
            this.formControl.enable();
          }
          const team$ = this.apollo
            .query<{
              teams: Team[];
            }>({
              query: gql`
                query GetTeamsQuery($where: JSONObject) {
                  teams(where: $where) {
                    id
                    slug
                    name
                    abbreviation
                    type
                    teamNumber
                    captainId
                  }
                }
              `,
              variables: {
                where: {
                  active: true,
                },
              },
            })
            ?.pipe(map((x) => x.data.teams?.map((y) => new Team(y))));

          this.teamsF$ = team$.pipe(
            map((teams) => teams.filter((team) => team.type === 'F')),
            map((teams) =>
              teams.sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0))
            )
          );

          this.teamsM$ = team$.pipe(
            map((teams) => teams.filter((team) => team.type === 'M')),
            map((teams) =>
              teams.sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0))
            )
          );

          this.teamsMX$ = team$.pipe(
            map((teams) => teams.filter((team) => team.type === 'MX')),
            map((teams) =>
              teams.sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0))
            )
          );

          this.teamsNAT$ = team$.pipe(
            map((teams) => teams.filter((team) => team.type === 'NATIONAL')),
            map((teams) =>
              teams.sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0))
            )
          );

          team$.subscribe((teams) => {
            this.options = teams;

            let foundTeam: Team | null = null;
            const teamId =
              this.activatedRoute.snapshot?.queryParamMap?.get('team');

            if (teamId && teams.length > 0) {
              foundTeam =
                teams.find((r) => r.slug == teamId || r.id == teamId) ?? null;
            }

            if (foundTeam == null) {
              foundTeam =
                teams.find((r) => r.captainId == this.user?.profile?.id) ??
                null;
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
    }
  }

  ngOnDestroy() {
    this.formGroup.removeControl(this.controlName);
  }
}
