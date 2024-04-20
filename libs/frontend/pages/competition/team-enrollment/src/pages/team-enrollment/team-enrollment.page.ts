import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Player, TeamPlayer } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { LevelType, SubEventTypeEnum, getUpcommingSeason } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { delay, forkJoin, lastValueFrom, of, switchMap } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { CLUB, COMMENTS, EMAIL, LOCATIONS, SEASON, TEAMS } from '../../forms';
import {
  ClubStepComponent,
  CommentsStepComponent,
  LocationForm,
  LocationsStepComponent,
  TeamForm,
  TeamsStepComponent,
  TeamsTransferStepComponent,
} from './components';
import { TeamEnrollmentDataService } from './service/team-enrollment.service';
import { minAmountOfTeams } from './validators';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { HasClaimComponent } from '@badman/frontend-components';

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
    TeamsTransferStepComponent,
    TeamsStepComponent,
    LocationsStepComponent,
    CommentsStepComponent,
    NgxJsonViewerModule,

    HasClaimComponent,
  ],
})
export class TeamEnrollmentComponent implements OnInit {
  @ViewChild(MatStepper) vert_stepper!: MatStepper;

  readonly systemService = inject(RankingSystemService);
  private readonly dataService = inject(TeamEnrollmentDataService);
  private readonly seoService = inject(SeoService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apollo = inject(Apollo);

  clubControl = new FormControl(undefined, [Validators.required]);
  emailControl = new FormControl(undefined, [Validators.required]);

  locationControl = new FormArray<LocationForm>([], [Validators.required]);

  teamControl = new FormGroup(
    {
      [SubEventTypeEnum.M]: new FormArray<TeamForm>([]),
      [SubEventTypeEnum.F]: new FormArray<TeamForm>([]),
      [SubEventTypeEnum.MX]: new FormArray<TeamForm>([]),
      [SubEventTypeEnum.NATIONAL]: new FormArray<TeamForm>([]),
    },
    [Validators.required, minAmountOfTeams(1)],
  );

  commentsControl = new FormGroup({
    [SubEventTypeEnum.M]: new FormGroup({
      comment: new FormControl(''),
      id: new FormControl(''),
    }),
    [SubEventTypeEnum.F]: new FormGroup({
      comment: new FormControl(''),
      id: new FormControl(''),
    }),
    [SubEventTypeEnum.MX]: new FormGroup({
      comment: new FormControl(''),
      id: new FormControl(''),
    }),
    [SubEventTypeEnum.NATIONAL]: new FormGroup({
      comment: new FormControl(''),
      id: new FormControl(''),
    }),
  });

  formGroup: FormGroup = new FormGroup({
    // internal
    [SEASON]: new FormControl(getUpcommingSeason(), [Validators.required]),

    // step 1
    [CLUB]: this.clubControl,
    [EMAIL]: this.emailControl,

    // step 2
    [LOCATIONS]: this.locationControl,

    // step 3
    [TEAMS]: this.teamControl,

    // step 4
    [COMMENTS]: this.commentsControl,
  });

  allLoaded = this.dataService.state.allLoaded;

  constructor() {
    this.dataService.state.setSeason(getUpcommingSeason());
  }

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
      const availibility = location.availabilities?.[0];

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
