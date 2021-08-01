import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEncounter } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-select-encounter',
  templateUrl: './select-encounter.component.html',
  styleUrls: ['./select-encounter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectEncounterComponent implements OnInit, OnDestroy {
  @Input()
  controlName = 'encounter';

  @Input()
  formGroup: FormGroup;

  @Input()
  dependsOn: string = 'team';

  formControl = new FormControl();
  options: CompetitionEncounter[];

  constructor(private encounterService: EncounterService) {}

  async ngOnInit() {
    this.formControl.disable();
    this.formGroup.addControl(this.controlName, this.formControl);

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
            .pipe(map((c) => c.encounterCompetitions.edges.map((r) => r.node)))
            .toPromise();
          if (this.options && this.options.length > 0) {
            this.formControl.setValue(this.options[0]);
          }
        } else {
          this.formControl.disable();
        }
      });
    } else {
      console.warn(`Dependency ${this.dependsOn} not found`, previous);
    }
  }

  ngOnDestroy() {
    this.formGroup.removeControl(this.controlName);
  }
}