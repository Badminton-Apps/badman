import { Component, OnInit } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { CompetitionEvent, EventService } from 'app/_shared';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  skip,
  switchMap,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: './edit-competition-event.component.html',
  styleUrls: ['./edit-competition-event.component.scss'],
})
export class EditEventCompetitionComponent implements OnInit {
  event$: Observable<CompetitionEvent>;
  update$ = new BehaviorSubject(0);
  saved$ = new BehaviorSubject(0);

  formGroup: FormGroup;

  constructor(
    private eventService: EventService,
    private route: ActivatedRoute,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.formGroup = new FormGroup({});
    this.event$ = combineLatest([
      this.route.paramMap,
      this.update$.pipe(debounceTime(600)),
    ]).pipe(
      map(([params]) => params.get('id')),
      switchMap((id) =>
        this.eventService.getCompetitionEvent(id, {
          includeTeams: true,
          includeRoles: true,
        })
      ),
      tap((r) => {
        const subEvents = new FormArray([]);
        for (const subEvent of r.subEvents) {
          subEvents.push(new FormGroup({}));
        }
        this.formGroup.addControl('subEvents', subEvents);
      })
    );

    this.saved$.pipe(debounceTime(5000)).subscribe(() => {
      this._snackBar.open('Saved', null, {
        duration: 1000,
        panelClass: 'success',
      });
    });

    combineLatest([this.formGroup.valueChanges, this.event$])
      .pipe(
        debounceTime(600),
        skip(1),
        filter(() => this.formGroup.valid)
      )
      .subscribe(([form, event]) => {
        const { type, ...newEvent } = { ...event, ...form } as any;

        this.save(newEvent);
      });
  }

  async save(event: CompetitionEvent) {
    await this.eventService.updateCompetitionEvent(event).toPromise();
    this.saved$.next(0);
  }
}
