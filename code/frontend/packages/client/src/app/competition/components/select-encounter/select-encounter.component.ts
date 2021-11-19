import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompetitionEncounter } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import * as moment from 'moment';
import { combineLatest, Observable } from 'rxjs';
import { shareReplay, filter, map, switchMap, startWith } from 'rxjs/operators';

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
  formGroup!: FormGroup;

  @Input()
  dependsOn: string = 'team';

  formControl = new FormControl();

  encounters$?: Observable<CompetitionEncounter[]>;

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
      previous.valueChanges.subscribe(async (teamId: string) => {
        this.formControl.setValue(null);

        if (teamId != null) {
          if (!this.formControl.enabled) {
            this.formControl.enable();
          }

          this.formControl.valueChanges.pipe(filter((r) => !!r)).subscribe((r) => {
            this.router.navigate([], {
              relativeTo: this.activatedRoute,
              queryParams: { encounter: r },
              queryParamsHandling: 'merge',
            });
          });

          this.encounters$ = this.formGroup.get('year')!.valueChanges.pipe(
            startWith(this.formGroup.get('year')!.value),
            switchMap((year) => this.encounterService.getEncounters(teamId, [`${year}-08-01`, `${year + 1}-07-01`])),
            map((c) => c.encounters.map((r) => r.node)),
            map((e) => e.sort((a, b) => moment(a.date).diff(b.date))),
            shareReplay(1)
          );

          this.encounters$.subscribe((encoutners) => {
            let foundEncounter = null;
            let encounterId = this.activatedRoute.snapshot?.queryParamMap?.get('encounter');

            if (encounterId && encoutners.length > 0) {
              foundEncounter = encoutners.find((r) => r.id == encounterId);
            }

            if (!foundEncounter) {
              const future = encoutners.filter((r) => moment(r.date).isAfter());
              if (future.length > 0) {
                foundEncounter = future[0];
              }
            }
            if (foundEncounter) {
              this.formControl.setValue(foundEncounter.id, { onlySelf: true });
            } else {
              this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { team: undefined, encounter: undefined },
                queryParamsHandling: 'merge',
              });
            }
          });
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
