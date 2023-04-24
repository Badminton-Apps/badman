import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { Player, TeamPlayer } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { forkJoin } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import {
  ClubStepComponent,
  EventsStepComponent,
  TeamForm,
  TeamsStepComponent,
  TeamsTransferStepComponent,
} from './components';

export const STEP_AVAILIBILTY = 1;

@Component({
  selector: 'badman-team-enrollment',
  templateUrl: './team-enrollment.page.html',
  styleUrls: ['./team-enrollment.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,

    // Material
    ReactiveFormsModule,
    MatStepperModule,
    MatProgressBarModule,
    MatButtonModule,

    // Own Modules
    ClubStepComponent,
    EventsStepComponent,
    TeamsTransferStepComponent,
    TeamsStepComponent,
  ],
})
export class TeamEnrollmentComponent implements OnInit, AfterViewInit {
  @ViewChild(MatStepper) vert_stepper!: MatStepper;

  formGroup: FormGroup = new FormGroup({
    season: new FormControl(2023, [Validators.required]),
    club: new FormControl(undefined, [Validators.required]),
    events: new FormControl([], [Validators.required]),
    teams: new FormGroup(
      {
        M: new FormArray<TeamForm>([]),
        F: new FormArray<TeamForm>([]),
        MX: new FormArray<TeamForm>([]),
        NATIONAL: new FormArray<TeamForm>([]),
      },
      [Validators.required]
    ),
  });

  constructor(
    private readonly seoService: SeoService,
    private readonly breadcrumbService: BreadcrumbService,
    private readonly translate: TranslateService,
    private readonly apollo: Apollo
  ) {}

  ngOnInit(): void {
    this.translate
      .get(['all.competition.team-enrollment.title', 'all.competition.title'])
      .subscribe((enrollemnt) => {
        this.seoService.update({
          title: enrollemnt['all.competition.team-enrollment.title'],
          description: enrollemnt['all.competition.team-enrollment.title'],
          type: 'website',
          keywords: ['team', 'enrollemnt'],
        });

        this.breadcrumbService.set(
          'competition',
          enrollemnt['all.competition.title']
        );
        this.breadcrumbService.set(
          'competition/enrollment',
          enrollemnt['all.competition.team-enrollment.title']
        );
      });
  }

  ngAfterViewInit(): void {
    this.vert_stepper.selectionChange.subscribe(() => {
      // console.log('NEXT STEP', this.formGroup.value);
    });
  }

  saveAndContinue() {
    this.vert_stepper.next();

    const observables = [];

    // save the teams to the backend
    for (const team of [
      ...this.formGroup.value.teams.M,
      ...this.formGroup.value.teams.F,
      ...this.formGroup.value.teams.MX,
      ...this.formGroup.value.teams.NATIONAL,
    ]) {
      const players = team.players.map((player: Partial<TeamPlayer>) => {
        return {
          id: player.id,
          membershipType: player.membershipType,
        };
      });

      const meta = {
        players: team.players.map(
          (
            player: Partial<Player> & {
              single: number;
              double: number;
              mix: number;
            }
          ) => ({
            id: player.id,
            gender: player.gender,
            single: player.single,
            double: player.double,
            mix: player.mix,
          })
        ),
      };

      const data = {
        id: team.id,
        name: team.name,
        teamNumber: team.teamNumber,
        type: team.type,
        clubId: this.formGroup.value.club,
        link: team.link,
        season: this.formGroup.value.season,
        players,
        entry: {
          meta: {
            competition: {
              players: meta.players,
            },
          },
        },
      };

      if (team.id) {
        observables.push(
          this.apollo.mutate({
            mutation: gql`
              mutation UpdateTeam($team: TeamUpdateInput!) {
                updateTeam(data: $team) {
                  id
                }
              }
            `,
            variables: {
              team: data,
            },
          })
        );
      } else {
        observables.push(
          this.apollo.mutate({
            mutation: gql`
              mutation CreateTeam($team: TeamNewInput!) {
                createTeam(data: $team) {
                  id
                }
              }
            `,
            variables: {
              team: data,
            },
          })
        );
      }
    }

    console.log('PROMISES', observables);

    forkJoin(observables).subscribe((res) => {
      console.log('RES', res);
    });
  }
}
