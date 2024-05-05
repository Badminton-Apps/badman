import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { HasClaimComponent } from '@badman/frontend-components';
import { RankingSystemService } from '@badman/frontend-graphql';
import { EntryCompetitionPlayer, Player, Team, TeamPlayer } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import {
  ClubMembershipType,
  LevelType,
  SubEventTypeEnum,
  getUpcommingSeason,
  endOfSeason,
  startOfSeason,
} from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { delay, forkJoin, lastValueFrom, of, switchMap } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { CLUB, COMMENTS, EMAIL, LOCATIONS, SEASON, TEAMS, TRANSFERS_LOANS } from '../../forms';
import {
  ClubStepComponent,
  CommentsStepComponent,
  LocationForm,
  LocationsStepComponent,
  TeamsStepComponent,
  TeamsTransferStepComponent,
} from './components';
import { PlayerTransferStepComponent } from './components/steps/player-transfer';
import { TeamEnrollmentDataService } from './service/team-enrollment.service';
import { minAmountOfTeams } from './validators';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';

export type TeamFormValue = {
  team: Team;
  entry: {
    players: (EntryCompetitionPlayer | null)[];
    subEventId: string | null;
  };
};

export type TeamForm = FormGroup<{
  team: FormControl<Team>;
  entry: FormGroup<{
    players: FormArray<FormControl<EntryCompetitionPlayer>>;
    subEventId: FormControl<string | null>;
  }>;
}>;

@Component({
  selector: 'badman-team-enrollment',
  templateUrl: './team-enrollment.page.html',
  styleUrls: ['./team-enrollment.page.scss'],
  standalone: true,
  imports: [
    ClubStepComponent,
    CommentsStepComponent,
    CommonModule,
    HasClaimComponent,
    LocationsStepComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatStepperModule,
    MatTooltipModule,
    NgxJsonViewerModule,
    PlayerTransferStepComponent,
    ReactiveFormsModule,
    TeamsStepComponent,
    TeamsTransferStepComponent,
    TranslateModule,
  ],
})
export class TeamEnrollmentComponent implements OnInit, OnDestroy {
  @ViewChild(MatStepper) vert_stepper!: MatStepper;

  readonly systemService = inject(RankingSystemService);
  private readonly dataService = inject(TeamEnrollmentDataService);
  private readonly seoService = inject(SeoService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apollo = inject(Apollo);
  private readonly router = inject(Router);

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
    [LevelType.PROV]: new FormGroup({
      comment: new FormControl(''),
      id: new FormControl(''),
    }),
    [LevelType.LIGA]: new FormGroup({
      comment: new FormControl(''),
      id: new FormControl(''),
    }),

    [LevelType.NATIONAL]: new FormGroup({
      comment: new FormControl(''),
      id: new FormControl(''),
    }),
  });

  transfersLoansControls = new FormGroup({
    [ClubMembershipType.NORMAL]: new FormControl<string[]>([]),
    [ClubMembershipType.LOAN]: new FormControl<string[]>([]),
  });

  formGroup: FormGroup = new FormGroup({
    // internal
    [SEASON]: new FormControl(getUpcommingSeason(), [Validators.required]),

    // Setps
    [CLUB]: this.clubControl,
    [EMAIL]: this.emailControl,
    [TRANSFERS_LOANS]: this.transfersLoansControls,
    [LOCATIONS]: this.locationControl,

    [TEAMS]: this.teamControl,

    [COMMENTS]: this.commentsControl,
  });

  allLoaded = this.dataService.state.allLoaded;
  hadEntries = this.dataService.state.hadEntries;
  saving = false;

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

  ngOnDestroy(): void {
    this.dataService.state.clear();
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
              membershipType: player.teamMembership?.membershipType,
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

    // save the transfers and loans to the backend
    const transfers = this.formGroup.get(TRANSFERS_LOANS)?.value as {
      [key in ClubMembershipType]: string[];
    };

    const players = (transfers.LOAN ?? []).concat(transfers.NORMAL);
    const existingLoans = this.dataService.state.loans() ?? [];
    const existingTransfers = this.dataService.state.transfers() ?? [];
    const season = this.formGroup.get(SEASON)?.value;
    const startDate = startOfSeason(season);
    const endDate = endOfSeason(season);

    for (const player of transfers.LOAN) {
      if (!player) {
        continue;
      }

      if (existingLoans.find((p) => p.id == player)) {
        continue;
      }

      console.log(endDate);

      observables.push(
        this.apollo.mutate({
          mutation: gql`
            mutation AddPlayerToClub($data: ClubPlayerMembershipNewInput!) {
              addPlayerToClub(data: $data)
            }
          `,
          variables: {
            data: {
              clubId: club,
              start: startDate.toDate(),
              end: endDate.toDate(),
              membershipType: ClubMembershipType.LOAN,
              playerId: player,
            },
          },
        }),
      );
    }

    for (const player of transfers.NORMAL) {
      if (!player) {
        continue;
      }

      if (existingTransfers.find((p) => p.id == player)) {
        continue;
      }

      observables.push(
        this.apollo.mutate({
          mutation: gql`
            mutation AddPlayerToClub($data: ClubPlayerMembershipNewInput!) {
              addPlayerToClub(data: $data)
            }
          `,
          variables: {
            data: {
              clubId: club,
              start: startDate,
              end: null,
              membershipType: ClubMembershipType.NORMAL,
              playerId: player,
            },
          },
        }),
      );
    }

    // find if any transfers or loans are removed
    for (const player of [...existingLoans, ...existingTransfers]) {
      if (players.includes(player.id)) {
        continue;
      }

      observables.push(
        this.apollo.mutate({
          mutation: gql`
            mutation RemovePlayerFromClub($id: ID!) {
              removePlayerFromClub(id: $id)
            }
          `,
          variables: {
            id: player.clubMembership.id,
          },
        }),
      );
    }

    return forkJoin(observables);
  }

  async saveAndContinue(includeTeams = false) {
    this.saving = true;
    try {
      await lastValueFrom(await this.save(includeTeams));

      this.snackBar.open(this.translate.instant('all.competition.team-enrollment.saved'), 'Close', {
        duration: 2000,
        panelClass: 'success',
      });

      this.vert_stepper.next();
    } catch (error) {
      this.snackBar.open(
        this.translate.instant('all.competition.team-enrollment.saved-failed'),
        'Close',
        {
          duration: 2000,
          panelClass: 'error',
        },
      );
    } finally {
      this.saving = false;
    }
  }

  async saveAndFinish() {
    this.saving = true;
    try {
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

      this.snackBar.open(this.translate.instant('all.competition.team-enrollment.saved'), 'Close', {
        duration: 2000,
        panelClass: 'success',
      });

      this.router.navigate(['/club', this.formGroup.value.club]);
    } catch (error) {
      this.snackBar.open(
        this.translate.instant('all.competition.team-enrollment.saved-failed'),
        'Close',
        {
          duration: 2000,
          panelClass: 'error',
        },
      );
    } finally {
      this.saving = false;
    }
  }
}
