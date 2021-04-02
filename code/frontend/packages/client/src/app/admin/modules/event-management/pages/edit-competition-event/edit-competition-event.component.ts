import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
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

  formGroup: FormGroup = new FormGroup({});

  constructor(
    private eventService: EventService,
    private route: ActivatedRoute,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.event$ = combineLatest([
      this.route.paramMap,
      this.update$.pipe(debounceTime(600)),
    ]).pipe(
      map(([params]) => params.get('id')),
      switchMap((id) => this.eventService.getCompetitionEvent(id))
    );

    this.event$.subscribe((event) => {
      this.setupFormGroup(event);
      this.formGroup.valueChanges.pipe(debounceTime(600)).subscribe((form) => {
        const { type, ...newEvent } = { ...event, ...form } as any;
        this.save(newEvent);
      });
    });

    this.saved$.pipe(debounceTime(5000), skip(1)).subscribe(() => {
      this._snackBar.open('Saved', null, {
        duration: 1000,
        panelClass: 'success',
      });
    });
  }

  private setupFormGroup(event: CompetitionEvent) {
    this.formGroup = new FormGroup({
      name: new FormControl(event.name, Validators.required),
      type: new FormControl(event.type, Validators.required),
      startYear: new FormControl(event.startYear, [
        Validators.required,
        Validators.min(2000),
        Validators.max(3000),
      ]),
      subEvents: new FormArray(
        event.subEvents.map((subEvent) => {
          return new FormGroup({
            id: new FormControl(subEvent.id),
            name: new FormControl(subEvent.name, Validators.required),
            level: new FormControl(subEvent.level, Validators.required),
            eventType: new FormControl(subEvent.eventType, Validators.required),
            maxLevel: new FormControl(subEvent.maxLevel, Validators.required),
            minBaseIndex: new FormControl(subEvent.minBaseIndex),
            maxBaseIndex: new FormControl(subEvent.maxBaseIndex),
          });
        })
      ),
    });
  }

  async save(event: CompetitionEvent) {
    // strip eventType because it's not used in BE
    const {eventType, ...newEvent} = event;

    await this.eventService.updateCompetitionEvent(newEvent).toPromise();
    this.saved$.next(0);
  }
}
