import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Event, EventService, EventType } from 'app/_shared';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-select-event',
  templateUrl: './select-event.component.html',
  styleUrls: ['./select-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectEventComponent implements OnInit, OnDestroy {
  @Input()
  formGroup: FormGroup;

  formControl = new FormControl(null, [Validators.required]);

  events$: Observable<Event[]>;

  constructor(private eventService: EventService) {}

  ngOnInit() {
    this.formGroup.addControl('event', this.formControl);

    this.events$ = this.eventService
      .getEvents({
        first: 100,
        type: EventType.COMPETITION,
        where: { allowEnlisting: true, type: 'PROV' },
      })
      .pipe(map((r) => r.eventCompetitions.edges.map((r) => r.node)));
  }

  ngOnDestroy() {
    this.formGroup.removeControl('event');
  }
}
