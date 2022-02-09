import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { CompetitionEvent, EventService } from 'app/_shared';
import { BehaviorSubject, combineLatest, lastValueFrom, Observable } from 'rxjs';
import { debounceTime, filter, map, skip, switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './edit-competition.component.html',
  styleUrls: ['./edit-competition.component.scss'],
})
export class EditEventCompetitionComponent implements OnInit {
  event$!: Observable<CompetitionEvent>;
  update$ = new BehaviorSubject(0);
  saved$ = new BehaviorSubject(0);

  formGroup: FormGroup = new FormGroup({});

  constructor(private apollo: Apollo, private route: ActivatedRoute, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.event$ = combineLatest([this.route.paramMap, this.update$.pipe(debounceTime(600))]).pipe(
      map(([params]) => params.get('id')),
      switchMap((id) =>
        this.apollo.query<{ competitionEvent: CompetitionEvent }>({
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
      map((event) => new CompetitionEvent(event))
    );

    this.event$.subscribe((event) => {
      this.setupFormGroup(event);
      this.formGroup.valueChanges.pipe(debounceTime(600)).subscribe((form) => {
        const { type, ...newEvent } = { ...event, ...form } as any;
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

  private setupFormGroup(event: CompetitionEvent) {
    console.log(event);

    this.formGroup = new FormGroup({
      name: new FormControl(event.name, Validators.required),
      type: new FormControl(event.type, Validators.required),
      startYear: new FormControl(event.startYear, [Validators.required, Validators.min(2000), Validators.max(3000)]),

      usedRankingUnit: new FormControl(event.usedRankingUnit, [Validators.required]),
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

  async save(event: CompetitionEvent) {
    // strip eventType because it's not used in BE
    const { eventType, updatedAt, ...newEvent } = event;

    await lastValueFrom(
      this.apollo.mutate<{ updateEvent: CompetitionEvent }>({
        mutation: gql`
          mutation UpdateCompetitionEvent($event: EventCompetitionInput!) {
            updateEventCompetition(eventCompetition: $event) {
              id
              name
              startYear
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
}
