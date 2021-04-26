import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Club } from 'app/_shared';
import { debounce, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-club-fields',
  templateUrl: './club-fields.component.html',
  styleUrls: ['./club-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubFieldsComponent implements OnInit {
  @Input()
  club: Club = {} as Club;

  @Output() save = new EventEmitter<Club>();

  clubForm: FormGroup;

  ngOnInit() {
    const nameControl = new FormControl(this.club.name, Validators.required);
    const clubIdControl = new FormControl(this.club.clubId, Validators.required);
    const abbrControl = new FormControl(
      this.club.abbreviation,
      Validators.required
    );

    this.clubForm = new FormGroup({
      name: nameControl,
      abbreviation: abbrControl,
      clubId: clubIdControl
    });

    this.clubForm.disable();

    nameControl.valueChanges.subscribe((r) => {
      if (!abbrControl.touched) {
        const matches = r.match(/\b(\w)/g);
        abbrControl.setValue(matches.join(''));
      }
    });

    this.clubForm.valueChanges.pipe(debounceTime(600)).subscribe((r) => {
      if (this.clubForm.valid) {
        // this.save.next({ id: this.club.id, ...this.clubForm.value });
      }
    });
  }
}
