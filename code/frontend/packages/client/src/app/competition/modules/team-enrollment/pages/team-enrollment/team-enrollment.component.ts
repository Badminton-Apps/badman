import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidatorFn } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatVerticalStepper } from '@angular/material/stepper';
import { Apollo } from 'apollo-angular';
import { Club, Comment, CompetitionEvent, EventService, EventType, SubEvent, Team } from 'app/_shared';
import { combineLatest, lastValueFrom, Observable, of, ReplaySubject } from 'rxjs';
import { debounceTime, filter, map, shareReplay, startWith, switchMap, take } from 'rxjs/operators';
import * as addComment from './graphql/AddComment.graphql';
import * as AssignLocationEvent from './graphql/AssignLocationEventMutation.graphql';
import * as AssignTeamSubEvent from './graphql/AssignTeamSubEventMutation.graphql';
import * as GetClub from './graphql/GetClub.graphql';
import * as updateComment from './graphql/UpdateComment.graphql';

@Component({
  selector: 'app-team-enrollment',
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent implements OnInit {
  @ViewChild(MatStepper) vert_stepper!: MatStepper;

  competitionYear?: number;

  formGroup!: FormGroup;

  enabledProvincialControl!: FormControl;
  enabledLigaControl!: FormControl;
  enabledNationalControl!: FormControl;
  commentProvControl!: FormControl;
  commentLigaControl!: FormControl;
  commentNatControl!: FormControl;

  club$!: Observable<Club>;
  commentProv!: Comment;
  commentLiga!: Comment;
  commentNat!: Comment;

  teamsM$!: Observable<Team[]>;
  teamsF$!: Observable<Team[]>;
  teamsMX$!: Observable<Team[]>;

  provEvent$!: Observable<CompetitionEvent | null>;
  ligaEvent$!: Observable<CompetitionEvent | null>;
  natEvent$!: Observable<CompetitionEvent | null>;

  subEventM$: ReplaySubject<SubEvent[]> = new ReplaySubject(1);
  subEventF$: ReplaySubject<SubEvent[]> = new ReplaySubject(1);
  subEventMX$: ReplaySubject<SubEvent[]> = new ReplaySubject(1);

  show$?: Observable<{
    teamsM: Team[];
    teamsF: Team[];
    teamsMX: Team[];
    subEventM: SubEvent[];
    subEventF: SubEvent[];
    subEventMX: SubEvent[];
    club: Club;
  }>;
  form$!: Observable<any>;

  subEventsInitialized: boolean = false;

  constructor(private eventService: EventService, private apollo: Apollo, private snackbar: MatSnackBar) {}

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

    this.form$ = this.formGroup.valueChanges;
    this.form$.subscribe((newValue) => {
      // re-intialize subevents when change on the subEvent selection
      this.subEventsInitialized = false;
    });

    this.setTeams();

    this.show$ = combineLatest({
      teamsM: this.teamsM$,
      teamsF: this.teamsF$,
      teamsMX: this.teamsMX$,
      subEventM: this.subEventM$,
      subEventF: this.subEventF$,
      subEventMX: this.subEventMX$,
      club: this.club$,
    });
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
    this.club$.pipe(switchMap((club) => this.eventService.finishEnrollment(club, this.competitionYear!))).toPromise();
    this.snackbar.open('Submitted', undefined, { panelClass: 'success', duration: 2000 });
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

    this.teamsF$ = this.club$.pipe(map((r) => r.teams?.filter((s) => s.type == 'F') ?? []));

    this.teamsM$ = this.club$.pipe(map((r) => r.teams?.filter((s) => s.type == 'M') ?? []));

    this.teamsMX$ = this.club$.pipe(map((r) => r.teams?.filter((s) => s.type == 'MX') ?? []));
  }

  private async initializeEvents() {
    const club = await lastValueFrom(this.club$);

    this.provEvent$ = this.formGroup.get('enabledProvincial')!.value
      ? this.eventService
          .getCompetitionEvent(this.formGroup.value.event.id, {
            clubId: club!.id!,
            includeComments: true,
          })
          .pipe(shareReplay(1))
      : of(null);

    this.ligaEvent$ = this.formGroup.get('enabledLiga')!.value
      ? this.eventService
          .getEvents({
            type: EventType.COMPETITION,
            first: 1,
            where: {
              type: 'LIGA',
              allowEnlisting: true,
            },
            clubId: club!.id,
            includeComments: true,
            includeSubEvents: true,
          })
          .pipe(
            map((events) => ((events?.total ?? 0) > 0 ? events!.events[0].node : null)),
            shareReplay(1)
          )
      : of(null);

    this.natEvent$ = this.formGroup.get('enabledNational')?.value
      ? this.eventService
          .getEvents({
            type: EventType.COMPETITION,
            first: 1,
            where: {
              type: 'NATIONAL',
              allowEnlisting: true,
            },
            clubId: club!.id,
            includeComments: true,
            includeSubEvents: true,
          })
          .pipe(
            map((events) => ((events?.total ?? 0) > 0 ? events!.events[0].node : null)),
            shareReplay(1)
          )
      : of(null);

    // not really ideal, but I just want it working for now
    const [prov, liga, nat] = await lastValueFrom(combineLatest([this.provEvent$, this.ligaEvent$, this.natEvent$]));

    this.competitionYear = prov?.startYear ?? liga!.startYear ?? nat!.startYear;

    this.subEventF$.next([
      ...(nat?.subEvents?.filter((s) => s.eventType == 'F') ?? []),
      ...(liga?.subEvents?.filter((s) => s.eventType == 'F') ?? []),
      ...(prov?.subEvents?.filter((s) => s.eventType == 'F') ?? []),
    ]);

    this.subEventM$.next([
      ...(nat?.subEvents?.filter((s) => s.eventType == 'M') ?? []),
      ...(liga?.subEvents?.filter((s) => s.eventType == 'M') ?? []),
      ...(prov?.subEvents?.filter((s) => s.eventType == 'M') ?? []),
    ]);

    this.subEventMX$.next([
      ...(nat?.subEvents?.filter((s) => s.eventType == 'MX') ?? []),
      ...(liga?.subEvents?.filter((s) => s.eventType == 'MX') ?? []),
      ...(prov?.subEvents?.filter((s) => s.eventType == 'MX') ?? []),
    ]);

    if (prov) {
      this.commentProv =
        (prov.comments?.length ?? 0) > 0
          ? prov!.comments![0]
          : new Comment({
              clubId: club?.id,
              eventId: prov.id,
            });
      this.commentProvControl.patchValue(this.commentProv.message);
      this.commentProvControl.valueChanges.pipe(debounceTime(600)).subscribe(async (r) => {
        this.commentProv.message = r;
        this.commentProv.id = await this._updateComment(this.commentProv);
      });
    }

    if (liga) {
      this.commentLiga =
        (liga.comments?.length ?? 0) > 0
          ? liga!.comments![0]
          : new Comment({
              clubId: club?.id,
              eventId: liga.id,
            });
      this.commentLigaControl.patchValue(this.commentLiga.message);
      this.commentLigaControl.valueChanges.pipe(debounceTime(600)).subscribe(async (r) => {
        this.commentLiga.message = r;
        this.commentLiga.id = await this._updateComment(this.commentLiga);
      });
    }

    if (nat) {
      this.commentNat =
        (nat.comments?.length ?? 0) > 0
          ? nat!.comments![0]
          : new Comment({
              clubId: club?.id,
              eventId: nat.id,
            });
      this.commentNatControl.patchValue(this.commentNat.message);
      this.commentNatControl.valueChanges.pipe(debounceTime(600)).subscribe(async (r) => {
        this.commentNat.message = r;
        this.commentNat.id = await this._updateComment(this.commentNat);
      });
    }

    this.subEventsInitialized = true;
  }

  private async _updateComment(comment: Comment): Promise<string> {
    // player get's set via authenticated user
    const { player, eventId, ...commentMessage } = comment;

    const result = await this.apollo
      .mutate<any>({
        mutation: commentMessage.id ? updateComment : addComment,
        variables: {
          comment: commentMessage,
          eventId,
        },
      })
      .toPromise();

    return result?.data?.addComment?.id ?? comment.id;
  }
}
