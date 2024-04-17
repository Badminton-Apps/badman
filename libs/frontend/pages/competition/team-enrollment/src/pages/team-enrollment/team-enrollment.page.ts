import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { Player, TeamPlayer } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { LevelType, getUpcommingSeason } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { delay, forkJoin, lastValueFrom, of, switchMap } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { CLUB, COMMENTS, EVENTS, LOCATIONS, SEASON, TEAMS } from '../../forms';
import {
  ClubStepComponent,
  CommentsStepComponent,
  EventsStepComponent,
  LocationsStepComponent,
  TeamForm,
  TeamsStepComponent,
  TeamsTransferStepComponent,
  LocationForm,
} from './components';
import { minAmountOfTeams } from './validators';
import { MatIconModule } from '@angular/material/icon';
import { RankingSystemService } from '@badman/frontend-graphql';

@Component({
  selector: 'badman-team-enrollment',
  templateUrl: './team-enrollment.page.html',
  styleUrls: ['./team-enrollment.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    ClubStepComponent,
    EventsStepComponent,
    TeamsTransferStepComponent,
    TeamsStepComponent,
    LocationsStepComponent,
    CommentsStepComponent,
  ],
})
export class TeamEnrollmentComponent implements OnInit {
  @ViewChild(MatStepper) vert_stepper!: MatStepper;

  systemService = inject(RankingSystemService);

  formGroup: FormGroup = new FormGroup({
    [SEASON]: new FormControl(getUpcommingSeason(), [Validators.required]),
    [CLUB]: new FormControl(undefined, [Validators.required]),
    [EVENTS]: new FormControl([], [Validators.required, Validators.min(1)]),
    [TEAMS]: new FormGroup(
      {
        M: new FormArray<TeamForm>([]),
        F: new FormArray<TeamForm>([]),
        MX: new FormArray<TeamForm>([]),
        NATIONAL: new FormArray<TeamForm>([]),
      },
      [Validators.required, minAmountOfTeams(1)],
    ),
    [LOCATIONS]: new FormArray<LocationForm>([], [Validators.required]),
  });

  constructor(
    private readonly seoService: SeoService,
    private readonly breadcrumbService: BreadcrumbService,
    private readonly translate: TranslateService,
    private readonly snackBar: MatSnackBar,
    private readonly apollo: Apollo,
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

        this.breadcrumbService.set('competition', enrollemnt['all.competition.title']);
        this.breadcrumbService.set(
          'competition/enrollment',
          enrollemnt['all.competition.team-enrollment.title'],
        );
      });
  }

  async save(includeTeams = false) {
    const observables = [];

    if (includeTeams) {
      await lastValueFrom(
        // delete all teams from the backend
        this.apollo.mutate({
          mutation: gql`
            mutation DeleteTeams($clubId: ID!, $season: Int!) {
              deleteTeams(clubId: $clubId, season: $season)
            }
          `,
          variables: {
            clubId: this.formGroup.value.club,
            season: this.formGroup.value.season,
          },
        }),
      );

      // save the teams to the backend
      for (const enrollment of [
        ...this.formGroup.getRawValue().teams.M,
        ...this.formGroup.getRawValue().teams.F,
        ...this.formGroup.getRawValue().teams.MX,
        ...this.formGroup.getRawValue().teams.NATIONAL,
      ]) {
        if (!enrollment?.team?.id) {
          continue;
        }

        const players =
          enrollment?.team?.players?.map((player: Partial<TeamPlayer>) => {
            return {
              id: player.id,
              membershipType: player.membershipType,
            };
          }) ?? [];

        const meta = {
          players: enrollment?.entry?.players?.map(
            (
              player: Partial<Player> & {
                single: number;
                double: number;
                mix: number;
              },
            ) => ({
              id: player?.id,
              gender: player?.gender,
              single: player?.single,
              double: player?.double,
              mix: player?.mix,
            }),
          ),
        };

        const data = {
          // id: enrollment?.team?.id,
          name: enrollment?.team?.name,
          teamNumber: enrollment?.team?.teamNumber,
          type: enrollment?.team?.type,
          clubId: this.formGroup.value.club,
          link: enrollment?.team?.link,
          season: this.formGroup.value.season,
          preferredDay: enrollment?.team?.preferredDay,
          preferredTime: enrollment?.team?.preferredTime,
          captainId: enrollment?.team?.captainId,
          phone: enrollment?.team?.phone,
          email: enrollment?.team?.email,
          players,
          entry: {
            subEventId: enrollment?.entry?.subEventId,
            meta: {
              competition: {
                players: meta.players,
              },
            },
          },
        };

        observables.push(
          of(data).pipe(
            // we need to delay the request to help 
            delay(Math.random() * 1000),
            switchMap(() =>
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
              }),
            ),
          ),
        );
      }
    }

    const comments = this.formGroup.get(COMMENTS)?.value as {
      [key in LevelType]: {
        comment: string;
        id: string;
      };
    };

    const club = this.formGroup.get(CLUB)?.value;

    // save the comments to the backend
    for (const type of Object.values(LevelType)) {
      // skip if no comment is set
      if (!comments?.[type]?.comment) {
        continue;
      }

      observables.push(
        this.apollo.mutate({
          mutation: gql`
            mutation AddComment($data: CommentNewInput!) {
              addComment(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              clubId: club,
              linkId: comments[type].id,
              linkType: 'competition',
              message: comments[type].comment,
            },
          },
        }),
      );
    }

    const locations = this.formGroup.get(LOCATIONS) as FormArray<LocationForm>;

    for (const location of locations.value) {
      const availibility = location.availibilities?.[0];

      if (!availibility) {
        continue;
      }
      if (!availibility.id) {
        observables.push(
          this.apollo.mutate({
            mutation: gql`
              mutation CreateAvailability($data: AvailabilityNewInput!) {
                createAvailability(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                season: availibility.season,
                locationId: location.id,
                days: availibility.days,
                exceptions: availibility.exceptions,
              },
            },
          }),
        );
      } else {
        observables.push(
          this.apollo.mutate({
            mutation: gql`
              mutation UpdateAvailability($data: AvailabilityUpdateInput!) {
                updateAvailability(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                id: availibility.id,
                season: availibility.season,
                locationId: location.id,
                days: availibility.days,
                exceptions: availibility.exceptions,
              },
            },
          }),
        );
      }
    }

    return forkJoin(observables);
  }

  async saveAndContinue(includeTeams = false) {
    this.formGroup.get(TEAMS)?.setErrors({ loading: true });
    await lastValueFrom(await this.save(includeTeams));
    this.snackBar.open('Teams saved', 'Close', {
      duration: 2000,
    });
    this.formGroup.get(TEAMS)?.setErrors({ loading: false });
    this.vert_stepper.next();
  }

  async saveAndFinish() {
    this.formGroup.get(TEAMS)?.setErrors({ loading: true });
    await lastValueFrom(await this.save(true));

    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation FinishEvent($clubId: ID!, $email: String!, $season: Int!) {
            finishEventEntry(clubId: $clubId, email: $email, season: $season)
          }
        `,
        variables: {
          clubId: this.formGroup.value.club,
          season: this.formGroup.value.season,
          email: this.formGroup.value.email,
        },
      }),
    );

    this.snackBar.open('Ingeschreven', 'Close', {
      duration: 2000,
    });
    this.formGroup.get(TEAMS)?.setErrors({ loading: false });
    this.vert_stepper.next();
  }
}
