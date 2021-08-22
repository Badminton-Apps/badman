import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompetitionEncounter } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import * as moment from 'moment';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

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

  constructor(
    private encounterService: EncounterService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {}

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
          this.options = (
            await this.encounterService
              .getEncounters(r.id)
              .pipe(map((c) => c.encounterCompetitions.edges.map((r) => r.node)))
              .toPromise()
          ).sort((a, b) => moment(a.date).diff(b.date));
        } else {
          this.formControl.disable();
        }

        this.formControl.valueChanges.pipe(filter((r) => !!r)).subscribe((r) => {
          this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { encounter: r.id },
            queryParamsHandling: 'merge',
          });
        });

        const params = this.activatedRoute.snapshot.queryParams;
        let foundEncounter = null;

        if (params && params.encounter && this.options?.length > 0) {
          foundEncounter = this.options.find((r) => r.id == params.encounter);
        }

        if (foundEncounter) {
          this.formControl.setValue(foundEncounter);
        } else {
          this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { encounter: undefined },
            queryParamsHandling: 'merge',
          });
        }

        if (this.formControl.value == null && this.options && this.options.length > 0) {
          const future = this.options.filter((r) => moment(r.date).isAfter());

          if (future.length > 0) {
            this.formControl.setValue(future[0]);
          }
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
