import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidatorFn,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { Apollo, gql } from 'apollo-angular';
import {
  BehaviorSubject,
  combineLatest,
  lastValueFrom,
  Observable,
  of,
  Subject,
  withLatestFrom,
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { apolloCache } from '../../../../../graphql.module';
import {
  Club,
  Comment,
  EventCompetition,
  EventService,
  SubEvent,
  SystemService,
  Team,
} from '../../../../../_shared';
import * as addComment from './graphql/AddComment.graphql';
import * as AssignLocationEvent from './graphql/AssignLocationEventMutation.graphql';
import * as AssignTeamSubEvent from './graphql/AssignTeamSubEventMutation.graphql';
import * as updateComment from './graphql/UpdateComment.graphql';

export const STEP_AVAILIBILTY = 1;

@Component({
  selector: 'badman-team-enrollment',
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent implements OnInit {
  @ViewChild(MatStepper) vert_stepper!: MatStepper;

  competitionYear!: number;
  asigned = false;

  formGroup!: FormGroup;

  enabledProvincialControl!: FormControl;
  enabledLigaControl!: FormControl;
  enabledNationalControl!: FormControl;
  commentProvControl!: FormControl;
  commentLigaControl!: FormControl;
  commentNatControl!: FormControl;

  club$!: Observable<Club>;
  commentProv?: Comment;
  commentLiga?: Comment;
  commentNat?: Comment;

  teamsM$!: Observable<Team[]>;
  teamsF$!: Observable<Team[]>;
  teamsMX$!: Observable<Team[]>;

  subEventM$ = new Subject<SubEvent[]>();
  subEventF$ = new Subject<SubEvent[]>();
  subEventMX$ = new Subject<SubEvent[]>();

  updateSubEvents = new BehaviorSubject(0);

  enrolling = false;



  show$?: Observable<{
    teamsM: Team[];
    teamsF: Team[];
    teamsMX: Team[];
    subEventM: SubEvent[];
    subEventF: SubEvent[];
    subEventMX: SubEvent[];
    club: Club;
  }>;

  constructor(
    private systemService: SystemService,
    private eventService: EventService,
    private apollo: Apollo,
    private snackbar: MatSnackBar,
  ) {}

  async ngOnInit() {
    this.enabledProvincialControl = new FormControl(false);
    this.enabledLigaControl = new FormControl(false);
    this.enabledNationalControl = new FormControl(false);

    this.commentProvControl = new FormControl();
    this.commentLigaControl = new FormControl();
    this.commentNatControl = new FormControl();

    this.formGroup = new FormGroup(
      {
        enabledProvincial: this.enabledProvincialControl,
        enabledLiga: this.enabledLigaControl,
        enabledNational: this.enabledNationalControl,
        commentProv: this.commentProvControl,
        commentLiga: this.commentLigaControl,
        commentNat: this.commentNatControl,
      },
      { validators: this.hasAnyLevelSelected }
    );

    this.setTeams();

    this.show$ = combineLatest([
      this.updateSubEvents.pipe(
        withLatestFrom(
          combineLatest([this.subEventM$, this.subEventF$, this.subEventMX$])
        ),
        shareReplay(1)
      ),
      this.teamsM$,
      this.teamsF$,
      this.teamsMX$,
      this.club$,
    ]).pipe(
      map(
        ([
          [, [subEventM, subEventF, subEventMX]],
          teamsM,
          teamsF,
          teamsMX,
          club,
        ]) => {
          return {
            teamsM,
            teamsF,
            teamsMX,
            subEventM,
            subEventF,
            subEventMX,
            club,
          };
        }
      )
    );

    
  }

  async changStepper(event: StepperSelectionEvent) {
    if (event.selectedIndex == 1 && !this.asigned) {
      await this.initializeEvents();
      this.asigned = true;
    }
  }

  async teamsAssigned(event: { team: Team; subEventId: string }) {
    // await lastValueFrom(
    //   this.apollo
    //     .mutate({
    //       mutation: AssignTeamSubEvent,
    //       variables: {
    //         teamId: event.team.id,
    //         subEventId: event.subEventId,
    //       },
    //     })
    //     .pipe(
    //       tap(() => {
    //         // Invalidate Club Cache
    //         const normalized = apolloCache.identify({
    //           id: event.team.clubId,
    //           __typename: 'Club',
    //         });
    //         apolloCache.evict({ id: normalized });
    //         apolloCache.gc();
    //       })
    //     )
    // );
  }

  async submit() {
    this.enrolling = true;
    try {
      await lastValueFrom(
        this.club$.pipe(
          switchMap((club) =>
            this.eventService.finishEnrollment(club, this.competitionYear)
          ),
          take(1)
        )
      );
      this.snackbar.open('Submitted', undefined, {
        panelClass: 'success',
        duration: 2000,
      });
    } catch (e) {
      this.snackbar.open('Error', undefined, {
        panelClass: 'error',
        duration: 2000,
      });
    } finally {
      this.enrolling = false;
    }
  }

  async locationAssigned(event: {
    locationId: string;
    eventId: string;
    use: boolean;
  }) {
    await this.apollo
      .mutate({
        mutation: AssignLocationEvent,
        variables: {
          ...event,
        },
      })
      .toPromise();
  }

  private hasAnyLevelSelected: ValidatorFn | null = (fg: AbstractControl) => {
    const prov = fg.get('enabledProvincial')?.value;
    const liga = fg.get('enabledLiga')?.value;
    const nat = fg.get('enabledNational')?.value;

    let hasProvEvent = false;
    if (prov) {
      hasProvEvent = fg.get('event')?.value != undefined;
    }

    return hasProvEvent || liga || nat ? null : { level: true };
  };

  private setTeams() {
    this.club$ = combineLatest([
      this.formGroup.valueChanges.pipe(
        startWith(this.formGroup.value),
        map((group) => group?.club),
        filter((id) => !!id),
        distinctUntilChanged()
      ),
      this.systemService.getPrimarySystemId(),
    ]).pipe(
      switchMap(([id, systemId]) =>
        this.apollo
          .query<{ club: Club }>({
            query: gql`
              query GetClubInfo($id: ID!, $rankingSystemId: ID!) {
                club(id: $id) {
                  id
                  teams(where: { active: true }) {
                    id
                    slug
                    name
                    abbreviation
                    active
                    teamNumber
                    type
                    preferredTime
                    preferredDay
                    captain {
                      id
                    }
                    locations {
                      id
                      name
                    }
                    players {
                      id
                      slug
                      firstName
                      lastName
                      base
                      gender
                      rankingLastPlaces(where: { systemId: $rankingSystemId }) {
                        id
                        single
                        double
                        mix
                      }
                    }
                    entries {
                      id
                      competitionSubEvent {
                        id
                        eventCompetition {
                          name
                        }
                      }
                    }
                  }

                  locations {
                    id
                    name
                  }
                }
              }
            `,
            variables: {
              id,
              rankingSystemId: systemId,
            },
          })
          .pipe(map((x) => new Club(x.data.club)))
      ),
      shareReplay(1)
    );

    this.teamsF$ = this.club$.pipe(
      map((r) => r.teams?.filter((s) => s.type == 'F') ?? [])
    );

    this.teamsM$ = this.club$.pipe(
      map((r) => r.teams?.filter((s) => s.type == 'M') ?? [])
    );

    this.teamsMX$ = this.club$.pipe(
      map((r) => r.teams?.filter((s) => s.type == 'MX') ?? [])
    );
  }

  private async initializeEvents() {
    const club = await lastValueFrom(this.club$.pipe(take(1)));

    if (!club || !club.id) {
      return;
    }

    const [prov, liga, nat] = await lastValueFrom(
      combineLatest([
        this._getProvEvent(club.id),
        this._getLigaEvent(club.id),
        this._getNatEvent(club.id),
      ])
    );

    const year = prov?.startYear ?? liga?.startYear ?? nat?.startYear;
    if (!year) {
      throw new Error('No year found');
    }
    this.competitionYear = year;

    this.subEventF$.next([
      ...(nat?.subEventCompetitions?.filter((s) => s.eventType == 'F') ?? []),
      ...(liga?.subEventCompetitions?.filter((s) => s.eventType == 'F') ?? []),
      ...(prov?.subEventCompetitions?.filter((s) => s.eventType == 'F') ?? []),
    ]);

    this.subEventM$.next([
      ...(nat?.subEventCompetitions?.filter((s) => s.eventType == 'M') ?? []),
      ...(liga?.subEventCompetitions?.filter((s) => s.eventType == 'M') ?? []),
      ...(prov?.subEventCompetitions?.filter((s) => s.eventType == 'M') ?? []),
    ]);

    this.subEventMX$.next([
      ...(nat?.subEventCompetitions?.filter((s) => s.eventType == 'MX') ?? []),
      ...(liga?.subEventCompetitions?.filter((s) => s.eventType == 'MX') ?? []),
      ...(prov?.subEventCompetitions?.filter((s) => s.eventType == 'MX') ?? []),
    ]);
    this.updateSubEvents.next(0);

    if (prov) {
      this.commentProv =
        (prov.comments?.length ?? 0) > 0
          ? prov.comments?.[0]
          : new Comment({
              clubId: club?.id,
              linkId: prov.id,
              linkType: 'competition',
            });
      this.commentProvControl.patchValue(this.commentProv?.message);
      this.commentProvControl.valueChanges
        .pipe(
          debounceTime(600),
          distinctUntilChanged(),
          filter((c) => (c?.length ?? 0) > 0)
        )
        .subscribe(async (r) => {
          if (!this.commentProv) {
            throw new Error('No comment found');
          }

          this.commentProv.message = r;
          this.commentProv.id = await this._updateComment(this.commentProv);
        });
    }

    if (liga) {
      this.commentLiga =
        (liga.comments?.length ?? 0) > 0
          ? liga?.comments?.[0]
          : new Comment({
              clubId: club?.id,
              linkId: liga.id,
              linkType: 'competition',
            });
      this.commentLigaControl.patchValue(this.commentLiga?.message);
      this.commentLigaControl.valueChanges
        .pipe(
          debounceTime(600),
          distinctUntilChanged(),
          filter((c) => (c?.length ?? 0) > 0)
        )
        .subscribe(async (r) => {
          if (!this.commentLiga) {
            throw new Error('No comment found');
          }

          this.commentLiga.message = r;
          this.commentLiga.id = await this._updateComment(this.commentLiga);
        });
    }

    if (nat) {
      this.commentNat =
        (nat.comments?.length ?? 0) > 0
          ? nat?.comments?.[0]
          : new Comment({
              clubId: club?.id,
              linkId: nat.id,
              linkType: 'competition',
            });
      this.commentNatControl.patchValue(this.commentNat?.message);
      this.commentNatControl.valueChanges
        .pipe(
          debounceTime(600),
          distinctUntilChanged(),
          filter((c) => (c?.length ?? 0) > 0)
        )
        .subscribe(async (r) => {
          if (!this.commentNat) {
            throw new Error('No comment found');
          }

          this.commentNat.message = r;
          this.commentNat.id = await this._updateComment(this.commentNat);
        });
    }
  }

  private async _updateComment(comment: Comment): Promise<string> {
    // player get's set via authenticated user
    const { player, ...commentMessage } = comment;

    const result = await lastValueFrom(
      this.apollo.mutate<{ updateComment?: Comment; addComment: Comment }>({
        mutation: commentMessage.id ? updateComment : addComment,
        variables: {
          data: commentMessage,
        },
      })
    );

    return result?.data?.addComment?.id ?? comment.id ?? '';
  }

  private _getNatEvent(clubId: string) {
    if (!this.formGroup.get('enabledNational')?.value) {
      return of(undefined).pipe(take(1));
    }

    return this.apollo
      .query<{
        eventCompetitions: {
          count: number;
          rows: Partial<EventCompetition>[];
        };
      }>({
        query: gql`
          query GetNatEvents($clubId: ID!) {
            eventCompetitions(
              take: 1
              where: { type: "NATIONAL", allowEnlisting: true }
            ) {
              rows {
                id
                slug
                name
                startYear
                allowEnlisting
                started
                type
                comments(where: { clubId: $clubId }) {
                  id
                  message
                  linkId
                  linkType
                }
                subEventCompetitions {
                  id
                  name
                  eventType
                  level
                  maxLevel
                  minBaseIndex
                  maxBaseIndex
                }
              }
            }
          }
        `,
        variables: {
          clubId,
        },
      })
      .pipe(
        map((result) => {
          if (result?.data?.eventCompetitions?.count != 1) {
            throw new Error(
              `${result?.data?.eventCompetitions?.count} events found`
            );
          }
          return new EventCompetition(result?.data?.eventCompetitions?.rows[0]);
        }),
        take(1)
      );
  }

  private _getLigaEvent(clubId: string) {
    if (!this.formGroup.get('enabledLiga')?.value) {
      return of(undefined);
    }

    return this.apollo
      .query<{
        eventCompetitions: {
          count: number;
          rows: Partial<EventCompetition>[];
        };
      }>({
        query: gql`
          query GetLigaEvents($clubId: ID!) {
            eventCompetitions(
              take: 1
              where: { type: "LIGA", allowEnlisting: true }
            ) {
              count
              rows {
                id
                slug
                name
                startYear
                allowEnlisting
                started
                type
                comments(where: { clubId: $clubId }) {
                  id
                  message
                  linkId
                  linkType
                }
                subEventCompetitions {
                  id
                  name
                  eventType
                  level
                  maxLevel
                  minBaseIndex
                  maxBaseIndex
                }
              }
            }
          }
        `,
        variables: {
          clubId,
        },
      })
      .pipe(
        map((result) => {
          if (result?.data?.eventCompetitions?.count != 1) {
            throw new Error(
              `${result?.data?.eventCompetitions?.count} events found`
            );
          }
          return new EventCompetition(result?.data?.eventCompetitions?.rows[0]);
        }),
        take(1)
      );
  }

  private _getProvEvent(clubId: string) {
    if (!this.formGroup.get('enabledProvincial')?.value) {
      return of(undefined);
    }

    return this.apollo
      .query<{ eventCompetition: EventCompetition }>({
        query: gql`
          query GetProvEvent($id: ID!, $clubId: ID!) {
            eventCompetition(id: $id) {
              id
              slug
              name
              startYear
              allowEnlisting
              started
              type
              comments(where: { clubId: $clubId }) {
                id
                message
                linkId
                linkType
              }
              subEventCompetitions {
                id
                name
                eventType
                level
                maxLevel
                minBaseIndex
                maxBaseIndex
              }
            }
          }
        `,
        variables: {
          id: this.formGroup.value.event.id,
          clubId,
        },
      })
      .pipe(
        map(({ data }) => new EventCompetition(data?.eventCompetition)),
        take(1)
      );
  }
}
