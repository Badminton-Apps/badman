import { Component, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import {
  BehaviorSubject,
  combineLatest,
  lastValueFrom,
  Observable,
} from 'rxjs';
import { debounceTime, filter, map, skip, switchMap } from 'rxjs/operators';
import { EventCompetition, CompetitionSubEvent } from '../../../_shared';

@Component({
  templateUrl: './edit-competition.component.html',
  styleUrls: ['./edit-competition.component.scss'],
})
export class EditEventCompetitionComponent implements OnInit {
  event$!: Observable<EventCompetition>;
  update$ = new BehaviorSubject(0);
  saved$ = new BehaviorSubject(0);

  formGroup: FormGroup = new FormGroup({});

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.event$ = combineLatest([
      this.route.paramMap,
      this.update$.pipe(debounceTime(600)),
    ]).pipe(
      map(([params]) => params.get('id')),
      switchMap((id) =>
        this.apollo.query<{ competitionEvent: EventCompetition }>({
          query: gql`
            query GetEvent($id: ID!) {
              competitionEvent(id: $id) {
                id
                slug
                name
                startYear
                allowEnlisting
                usedRankingUnit
                usedRankingAmount
                started
                type
                updatedAt
                subEvents(order: "eventType") {
                  id
                  name
                  eventType
                  level
                  maxLevel
                  minBaseIndex
                  maxBaseIndex
                  groups {
                    id
                    name
                  }
                }
              }
            }
          `,
          variables: { id },
        })
      ),
      map((result) => result.data.competitionEvent),
      map((event) => new EventCompetition(event))
    );

    this.event$.subscribe((event) => {
      this.setupFormGroup(event);
      this.formGroup.valueChanges
        .pipe(
          debounceTime(600),
          filter(() => this.formGroup.valid)
        )
        .subscribe((form) => {
          const newEvent = { ...event, ...form } as any;
          this.save(newEvent);
        });
    });

    this.saved$
      .pipe(
        debounceTime(5000),
        skip(1),
        filter(() => this.formGroup.valid)
      )
      .subscribe(() => {
        this._snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }

  private setupFormGroup(event: EventCompetition) {
    this.formGroup = new FormGroup({
      name: new FormControl(event.name, Validators.required),
      type: new FormControl(event.type, Validators.required),
      startYear: new FormControl(event.startYear, [
        Validators.required,
        Validators.min(2000),
        Validators.max(3000),
      ]),

      usedRankingUnit: new FormControl(event.usedRankingUnit, [
        Validators.required,
      ]),
      usedRankingAmount: new FormControl(event.usedRankingAmount, [
        Validators.required,
        Validators.min(1),
        Validators.max(52),
      ]),

      subEvents: new FormArray(
        event.subEvents?.map((subEvent) => {
          return new FormGroup({
            id: new FormControl(subEvent.id),
            name: new FormControl(subEvent.name, Validators.required),
            level: new FormControl(subEvent.level, Validators.required),
            eventType: new FormControl(subEvent.eventType, Validators.required),
            maxLevel: new FormControl(subEvent.maxLevel, Validators.required),
            minBaseIndex: new FormControl(subEvent.minBaseIndex),
            maxBaseIndex: new FormControl(subEvent.maxBaseIndex),
          });
        }) ?? []
      ),
    });
  }

  async save(event: EventCompetition) {
    // strip eventType because it's not used in BE
    const { eventType, updatedAt, ...newEvent } = event;

    await lastValueFrom(
      this.apollo.mutate<{ updateEvent: EventCompetition }>({
        mutation: gql`
          mutation UpdateeventCompetition($event: EventCompetitionInput!) {
            updateEventCompetition(eventCompetition: $event) {
              id
              name
              startYear
              type
              usedRankingUnit
              usedRankingAmount
              subEvents {
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
        variables: { event: newEvent },
      })
    );

    this.saved$.next(0);
  }

  async updateSubEvent() {
    // TODO
  }

  async addSubEvent() {
    // TODO
  }

  async newSubEvent(event: EventCompetition) {
    const subEvents = this.formGroup.get('subEvents') as FormArray;

    subEvents.push(
      new FormGroup({
        name: new FormControl(undefined, Validators.required),
        level: new FormControl(undefined, Validators.required),
        eventType: new FormControl(undefined, Validators.required),
        maxLevel: new FormControl(undefined, Validators.required),
        minBaseIndex: new FormControl(undefined),
        maxBaseIndex: new FormControl(undefined),
      })
    );

    event.subEvents?.push(
      new CompetitionSubEvent({
        eventCompetition: event,
      })
    );
  }

  async removeSubEvent(event: EventCompetition, subEvent: CompetitionSubEvent) {
    const subEvents = this.formGroup.get('subEvents') as FormArray;

    subEvents.removeAt(subEvents.value.indexOf(subEvent));

    event.subEvents?.splice(event.subEvents.indexOf(subEvent), 1);
  }
}
