import { MatSnackBar } from '@angular/material/snack-bar';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ValidatorFn } from '@angular/forms';
import { MatVerticalStepper } from '@angular/material/stepper';
import { Apollo } from 'apollo-angular';
import { Club, Comment, CompetitionEvent, EventService, EventType, SubEvent, SystemService, Team } from 'app/_shared';
import { combineLatest, Observable, of, ReplaySubject } from 'rxjs';
import { debounceTime, filter, map, shareReplay, startWith, switchMap, take } from 'rxjs/operators';
import * as AssignLocationEvent from './graphql/AssignLocationEventMutation.graphql';
import * as AssignTeamSubEvent from './graphql/AssignTeamSubEventMutation.graphql';
import * as GetClub from './graphql/GetClub.graphql';

import * as updateComment from './graphql/UpdateComment.graphql';
import * as addComment from './graphql/AddComment.graphql';

@Component({
  selector: 'app-team-enrollment',
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent implements OnInit {
  @ViewChild(MatVerticalStepper) vert_stepper: MatVerticalStepper;

  formGroup: FormGroup;

  enabledProvincialControl: FormControl;
  enabledLigaControl: FormControl;
  enabledNationalControl: FormControl;
  commentControl: FormControl;

  club$: Observable<Club>;
  comment: Comment;

  teamsM$: Observable<Team[]>;
  teamsF$: Observable<Team[]>;
  teamsMX$: Observable<Team[]>;

  provEvent$: Observable<CompetitionEvent>;
  ligaEvent$: Observable<CompetitionEvent>;
  natEvent$: Observable<CompetitionEvent>;

  subEventM$: ReplaySubject<SubEvent[]> = new ReplaySubject(1);
  subEventF$: ReplaySubject<SubEvent[]> = new ReplaySubject(1);
  subEventMX$: ReplaySubject<SubEvent[]> = new ReplaySubject(1);

  show$: Observable<any>;
  form$: Observable<any>;

  subEventsInitialized: boolean = false;

  constructor(
    private eventService: EventService,
    private systemService: SystemService,
    private apollo: Apollo,
    private snackbar: MatSnackBar
  ) {}

  async ngOnInit() {
    this.enabledProvincialControl = new FormControl(false);
    this.enabledLigaControl = new FormControl(false);
    this.enabledNationalControl = new FormControl(false);
    this.commentControl = new FormControl();

    this.formGroup = new FormGroup(
      {
        enabledProvincial: this.enabledProvincialControl,
        enabledLiga: this.enabledLigaControl,
        enabledNational: this.enabledNationalControl,
        comment: this.commentControl,
      },
      { validators: this.hasAnyLevelSelected }
    );

    this.form$ = this.formGroup.valueChanges;
    this.form$.subscribe((newValue) => {
      // re-intialize subevents when change on the subEvent selection
      this.subEventsInitialized = false;
    });

    this.setTeams();

    this.show$ = combineLatest([
      this.teamsM$,
      this.teamsF$,
      this.teamsMX$,
      this.subEventM$,
      this.subEventF$,
      this.subEventMX$,
      this.club$,
    ]).pipe(
      map(([teamsM, teamsF, teamsMX, subEventM, subEventF, subEventMX, club]) => {
        return {
          teamsM,
          teamsF,
          teamsMX,
          subEventM,
          subEventF,
          subEventMX,
          club,
        };
      })
    );
  }

  async changStepper(event: StepperSelectionEvent) {
    if (event.selectedIndex == 1 && !this.subEventsInitialized) {
      await this.initializeEvents();
    }
  }

  async teamsAssigned(event: { teamId: string; subEventId: string }) {
    await this.apollo
      .mutate({
        mutation: AssignTeamSubEvent,
        variables: {
          ...event,
        },
      })
      .toPromise();
  }

  async submit() {
    this.snackbar.open('Submitted', null, { panelClass: 'success', duration: 2000 });
  }

  async locationAssigned(event: { locationId: string; eventId: string; use: boolean }) {
    await this.apollo
      .mutate({
        mutation: AssignLocationEvent,
        variables: {
          ...event,
        },
      })
      .toPromise();
  }

  private hasAnyLevelSelected: ValidatorFn = (fg: FormGroup) => {
    const prov = fg.get('enabledProvincial').value;
    const liga = fg.get('enabledLiga').value;
    const nat = fg.get('enabledNational').value;

    let hasProvEvent = false;
    if (prov) {
      hasProvEvent = fg.get('event')?.value != undefined;
    }

    return hasProvEvent || liga || nat ? null : { level: true };
  };

  private setTeams() {
    this.club$ = this.form$.pipe(
      startWith(this.formGroup.value),
      map((group) => group?.club?.id),
      filter((id) => !!id),
      take(1),
      switchMap((id) =>
        this.apollo
          .query<{ club: Club }>({
            query: GetClub,
            variables: {
              id,
            },
          })
          .pipe(map((x) => new Club(x.data.club)))
      ),
      shareReplay()
    );

    this.teamsF$ = this.club$.pipe(map((r) => r.teams?.filter((s) => s.type == 'F')));

    this.teamsM$ = this.club$.pipe(map((r) => r.teams?.filter((s) => s.type == 'M')));

    this.teamsMX$ = this.club$.pipe(map((r) => r.teams?.filter((s) => s.type == 'MX')));
  }

  private async initializeEvents() {
    const club = await this.club$.toPromise();
    this.provEvent$ = this.formGroup.get('enabledProvincial').value
      ? this.eventService
          .getCompetitionEvent(this.formGroup.value.event.id, {
            clubId: club.id,
            includeComments: true,
          })
          .pipe(shareReplay(1))
      : of(null);

    this.ligaEvent$ = this.formGroup.get('enabledLiga').value
      ? this.eventService
          .getEvents({
            type: EventType.COMPETITION,
            first: 1,
            where: {
              type: 'LIGA',
              allowEnlisting: true,
            },
            includeSubEvents: true,
          })
          .pipe(
            map((events) => (events?.eventCompetitions?.total > 0 ? events.eventCompetitions.edges[0].node : null)),
            shareReplay(1)
          )
      : of(null);

    this.natEvent$ = this.formGroup.get('enabledNational').value
      ? this.eventService
          .getEvents({
            type: EventType.COMPETITION,
            first: 1,
            where: {
              type: 'NATIONAL',
              allowEnlisting: true,
            },
            includeSubEvents: true,
          })
          .pipe(
            map((events) => (events?.eventCompetitions?.total > 0 ? events.eventCompetitions.edges[0].node : null)),
            shareReplay(1)
          )
      : of(null);

    // not really ideal, but I just want it working for now
    const [prov, liga, nat] = await combineLatest([this.provEvent$, this.ligaEvent$, this.natEvent$]).toPromise();

    this.subEventF$.next([
      ...(nat?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'F') ?? []),
      ...(liga?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'F') ?? []),
      ...(prov?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'F') ?? []),
    ]);

    this.subEventM$.next([
      ...(nat?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'M') ?? []),
      ...(liga?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'M') ?? []),
      ...(prov?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'M') ?? []),
    ]);

    this.subEventMX$.next([
      ...(nat?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'MX') ?? []),
      ...(liga?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'MX') ?? []),
      ...(prov?.subEvents?.filter((s: { eventType: string }) => s.eventType == 'MX') ?? []),
    ]);

    this.comment = prov?.comments.length > 0 ? prov.comments[0] : new Comment({ clubId: club.id });
    this.commentControl.patchValue(this.comment.message);
    this.commentControl.valueChanges.pipe(debounceTime(600)).subscribe((r) => this._updateComment(r));
    this.subEventsInitialized = true;
  }

  private async _updateComment(messaga: string) {
    this.comment.message = messaga;

    // player get's set via authenticated user
    const { player, ...comment } = this.comment;

    const result = await this.apollo
      .mutate<any>({
        mutation: this.comment.id ? updateComment : addComment,
        variables: {
          comment,
          eventId: this.formGroup.value.event.id,
        },
      })
      .toPromise();

    if (result.data?.addComment != null) {
      this.comment.id = result.data?.addComment.id;
    }
  }
}
