import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CompetitionEncounter, Team } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import { lastValueFrom } from 'rxjs';
import { filter, map, startWith, switchMap, first} from 'rxjs/operators';

@Component({
  selector: 'app-list-encounters',
  templateUrl: './list-encounters.component.html',
  styleUrls: ['./list-encounters.component.scss'],
})
export class ListEncountersComponent implements OnInit {
  @Input()
  controlName = 'encounter';

  @Input()
  formGroup!: FormGroup;

  @Input()
  dependsOn: string = 'team';

  formControl = new FormControl();

  encountersSem1!: CompetitionEncounter[];
  encountersSem2!: CompetitionEncounter[];

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

      previous.valueChanges.subscribe(async (teamId) => {
        this.formControl.setValue(null);
        if (teamId != null) {
          if (!this.formControl.enabled) {
            this.formControl.enable();
          }

          const encounters = await lastValueFrom(
            this.formGroup.get('year')!.valueChanges.pipe(
              startWith(this.formGroup.get('year')!.value),
              switchMap((year) => this.encounterService.getEncounters(teamId, [`${year}-08-01`, `${year + 1}-07-01`])),
              map((c) => c.encounters.map((r) => r.node)),
              map((e) => e.sort((a, b) => a.date!.getTime() - b.date!.getTime())),
              map((e) => {
                e = e.map((r) => {
                  r.showingForHomeTeam = r.home?.id == teamId;
                  return r;
                });
                return e;
              }),
              first()
            )
          );

          this.encountersSem1 = encounters.filter((r) => [8, 9, 10, 11, 12].includes(r.date!.getMonth()));
          this.encountersSem2 = encounters.filter((r) => [0, 1, 2, 3, 4, 5].includes(r.date!.getMonth()));

          const params = this.activatedRoute.snapshot.queryParams;
          if (params && params['encounter'] && this.encountersSem1.length > 0) {
            const foundEncounter = [...this.encountersSem1, ...this.encountersSem2].find(
              (r) => r.id == params['encounter']
            );

            if (foundEncounter) {
              this.formControl.setValue(foundEncounter);
            } else {
              this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { encounter: undefined },
                queryParamsHandling: 'merge',
              });
            }
          }
        } else {
          this.formControl.disable();
        }
      });
    } else {
      console.warn(`Dependency ${this.dependsOn} not found`, previous);
    }
  }
}
