import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Event, EventService, EventType } from 'app/_shared';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-select-event',
  templateUrl: './select-event.component.html',
  styleUrls: ['./select-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectEventComponent implements OnInit {
  @Input()
  formGroup: FormGroup;

  @Input()
  requiredPermission: string[];

  formControl = new FormControl();
  filteredOptions: Observable<Event[]>;

  constructor(private eventService: EventService) {}

  async ngOnInit() {
    this.formGroup.addControl('event', this.formControl);

    this.filteredOptions = combineLatest([
      this.eventService
        .getEvents({
          first: 100,
          type: EventType.COMPETITION,
          where: { allowEnlisting: true },
        })
        .pipe(
          map((data) => {
            const count = data.eventCompetitions?.total || 0;
            if (count) {
              return data.eventCompetitions.edges.map((x) => new Event(x.node));
            } else {
              return [];
            }
          })
        ),
      this.formControl.valueChanges.pipe(startWith('')),
    ]).pipe(map(([list, value]) => this._filter(list, value)));
  }

  private _filter(list: Event[], value: string | Event): Event[] {
    // when selected the filter is with the selected object
    if (typeof value === 'string') {
      const filterValue = value.toLowerCase();

      return list.filter(
        (option) => option.name.toLowerCase().indexOf(filterValue) === 0
      );
    }
  }

  getOptionText(option) {
    return option?.name;
  }
}
