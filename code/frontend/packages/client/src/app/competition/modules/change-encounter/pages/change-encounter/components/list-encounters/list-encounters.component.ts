import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CompetitionEncounter, Team } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import { Observable } from 'rxjs';
import { filter, map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-list-encounters',
  templateUrl: './list-encounters.component.html',
  styleUrls: ['./list-encounters.component.scss'],
})
export class ListEncountersComponent implements OnInit {
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
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.formGroup.addControl(this.controlName, this.formControl);

    const previous = this.formGroup.get(this.dependsOn);
    if (previous) {
      this.formControl.valueChanges.pipe(filter((r) => !!r)).subscribe((r) => {
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { encounter: r.id },
          queryParamsHandling: 'merge',
        });
      });

      previous.valueChanges.subscribe(async (r) => {
        this.formControl.setValue(null);
        if (r?.id != null) {
          if (!this.formControl.enabled) {
            this.formControl.enable();
          }

          this.options = (
            await this.encounterService
              .getEncounters(r.id)
              .pipe(map((c) => c.encounterCompetitions.edges.map((r) => r.node)))
              .toPromise()
          ).sort((a, b) => {
            return a.date.getTime() - b.date.getTime();
          });

          const params = this.activatedRoute.snapshot.queryParams;
          if (params && params.encounter && this.options.length > 1) {
            const foundEncounter = this.options.find((r) => r.id == params.encounter);
            this.formControl.setValue(foundEncounter);
          }
        } else {
          this.formControl.disable();
        }
      });
    } else {
      console.warn('Dependency not found', previous);
    }
  }
}
