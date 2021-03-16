import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

import {
  Club,
  ClubService,
  Event,
  EventService,
  EventType,
  SubEvent,
  SystemService,
  Team,
} from 'app/_shared';
import { combineLatest, Observable } from 'rxjs';
import {
  filter,
  map,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

@Component({
  selector: 'app-team-enrollment',
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});

  teamsM$: Observable<Team[]>;
  teamsF$: Observable<Team[]>;
  teamsMX$: Observable<Team[]>;

  subEventM$: Observable<SubEvent[]>;
  subEventF$: Observable<SubEvent[]>;
  subEventMX$: Observable<SubEvent[]>;

  show$: Observable<boolean>;

  form$: Observable<any>;

  constructor(
    private eventService: EventService,
    private systemService: SystemService,
    private clubService: ClubService
  ) {}

  async ngOnInit() {
    this.form$ = this.formGroup.valueChanges.pipe(shareReplay(1));

    this.setTeams();
    this.setSubEvents();
    this.show$ = this.form$.pipe(map((fg) => fg.club && fg.event));
  }

  private setTeams() {
    const club$ = combineLatest([
      this.form$.pipe(
        startWith(this.formGroup.value),
        map((group) => group?.club?.id),
        filter((id) => !!id)
      ),
      this.systemService.getPrimarySystem(),
    ]).pipe(
      switchMap(([id, primary]) =>
        this.clubService.getClub(id, {
          rankingSystem: primary.id,
        includeTeams: true,
        })
      ),
      shareReplay()
    );

    this.teamsF$ = club$.pipe(
      map((r) => r.teams?.filter((s) => s.type == 'F'))
    );

    this.teamsM$ = club$.pipe(
      map((r) => r.teams?.filter((s) => s.type == 'M'))
    );

    this.teamsMX$ = club$.pipe(
      map((r) => r.teams?.filter((s) => s.type == 'MX'))
    );
  }

  private setSubEvents() {
    const event$ = this.form$.pipe(
      startWith(this.formGroup.value),
      map((group) => group?.event?.id),
      filter((id) => !!id),
      switchMap((id) => this.eventService.getCompetitionEvent(id)),
      shareReplay()
    );

    this.subEventF$ = event$.pipe(
      map((r) => r.subEvents?.filter((s) => s.eventType == 'F'))
    );

    this.subEventM$ = event$.pipe(
      map((r) => r.subEvents?.filter((s) => s.eventType == 'M'))
    );

    this.subEventMX$ = event$.pipe(
      map((r) => r.subEvents?.filter((s) => s.eventType == 'MX'))
    );
  }
}
