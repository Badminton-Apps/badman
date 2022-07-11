import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { Observable } from 'rxjs';
import { filter, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { CompetitionEncounter } from '../../../models';

@Component({
  selector: 'badman-select-encounter',
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
  dependsOn = 'team';

  @Output()
  encounterSelected = new EventEmitter<CompetitionEncounter>();

  formControl = new FormControl();

  encounters$?: Observable<CompetitionEncounter[]>;

  constructor(
    private apollo: Apollo,
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

          this.formControl.valueChanges
            .pipe(filter((r) => !!r))
            .subscribe((r) => {
              this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { encounter: r },
                queryParamsHandling: 'merge',
              });
            });

          this.encounters$ = this.formGroup.get('year')?.valueChanges.pipe(
            startWith(this.formGroup.get('year')?.value),
            switchMap((year) =>
              this.apollo.query<{
                encounterCompetitions: { rows: CompetitionEncounter[] };
              }>({
                query: gql`
                  query GetEncounterQuery($where: JSONObject) {
                    encounterCompetitions(where: $where) {
                      rows {
                        id
                        date
                        home {
                          id
                          name
                        }
                        away {
                          id
                          name
                        }
                        drawCompetition {
                          id
                          subeventId
                        }
                      }
                    }
                  }
                `,
                variables: {
                  where: {
                    $or: {
                      homeTeamId: teamId,
                      awayTeamId: teamId,
                    },
                    date: {
                      $between: [`${year}-08-01`, `${year + 1}-07-01`],
                    },
                  },
                },
              })
            ),
            map((result) =>
              result.data.encounterCompetitions?.rows.map(
                (r) => new CompetitionEncounter(r)
              )
            ),
            map((c) => {
              return c.map((r) => {
                if (r.home?.id === teamId) {
                  r.showingForHomeTeam = true;
                } else {
                  r.showingForHomeTeam = false;
                }
                return r;
              });
            }),
            map((e) => e.sort((a, b) => moment(a.date).diff(b.date))),
            shareReplay(1)
          );

          this.encounters$?.subscribe((encounters) => {
            let foundEncounter: CompetitionEncounter | null = null;
            const encounterId =
              this.activatedRoute.snapshot?.queryParamMap?.get('encounter');

            if (encounterId && encounters.length > 0) {
              foundEncounter =
                encounters.find((r) => r.id == encounterId) ?? null;
            }

            if (!foundEncounter) {
              const future = encounters.filter((r) =>
                moment(r.date).isSameOrAfter()
              );
              if (future.length > 0) {
                foundEncounter = future[0];
              }
            }

            if (!foundEncounter) {
              foundEncounter = encounters[encounters.length - 1];
            }

            if (foundEncounter) {
              this.encounterSelected.emit(foundEncounter);
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
