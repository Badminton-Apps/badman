import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Encounter } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-select-game',
  templateUrl: './select-game.component.html',
  styleUrls: ['./select-game.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectGameComponent implements OnInit {
  @Input()
  formGroup: FormGroup;
  @Input()
  dependsOn: string = 'team';

  formControl = new FormControl();
  options: Encounter[];
  filteredOptions: Observable<Encounter[]>;

  constructor(private encounterService: EncounterService) {}

  async ngOnInit() {
    this.formControl.disable();
    this.formGroup.addControl('game', this.formControl);

    const previous = this.formGroup.get(this.dependsOn);

    if (previous) {
      previous.valueChanges.subscribe(async (r) => {
        this.formControl.setValue(null);

        if (r?.id != null) {
          if (!this.formControl.enabled) {
            this.formControl.enable();
          }
          // TODO: Convert to observable way
          this.options = await this.encounterService
            .getEncounters(r.id)
            .toPromise();
          if (this.options && this.options.length > 0) {
            this.formControl.setValue(this.options[0]);
          }
          this.filteredOptions = this.formControl.valueChanges.pipe(
            startWith(null),
            map((value) => this._filter(value))
          );
        } else {
          this.formControl.disable();
        }
      });
    } else {
      console.warn('Dependency not found', previous);
    }
  }

  private _filter(value?: Encounter): Encounter[] {
    console.log('options:', this.options);
    console.log('value:', value);

    if (value == null) {
      return this.options;
    }
    return this.options.filter(
      (option) => option?.date.toISOString() == value?.date.toISOString()
    );
  }

  getOptionText(option) {
    return option?.name;
  }
}
