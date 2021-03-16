import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Event, TournamentEvent } from 'app/_shared';
import { debounce, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-event-tournament-fields',
  templateUrl: './event-tournament-fields.component.html',
  styleUrls: ['./event-tournament-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTournamentFieldsComponent implements OnInit {
  @Input()
  event: TournamentEvent = {} as TournamentEvent;

  @Output() save = new EventEmitter<TournamentEvent>();

  eventForm: FormGroup;

  ngOnInit() {
    const nameControl = new FormControl(this.event.name, Validators.required);

    this.eventForm = new FormGroup({
      name: nameControl,
    });


    this.eventForm.valueChanges.pipe(debounceTime(600)).subscribe((r) => {
      this.update();
    });
  }

  update() {
    if (this.eventForm.valid) {
      this.save.next({ id: this.event.id, ...this.eventForm.value });
    }
  }
}
