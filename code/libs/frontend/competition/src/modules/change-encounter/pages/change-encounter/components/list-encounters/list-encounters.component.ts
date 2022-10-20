import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { filter, first, map, startWith, switchMap } from 'rxjs/operators';
import { EncounterCompetition } from '@badman/frontend-models';
import { compPeriod } from '@badman/frontend-shared';

@Component({
  selector: 'badman-list-encounters',
  templateUrl: './list-encounters.component.html',
  styleUrls: ['./list-encounters.component.scss'],
})
export class ListEncountersComponent implements OnInit {
  @Input()
  controlName = 'encounter';

  @Input()
  formGroup!: FormGroup;

  @Input()
  dependsOn = 'team';

  formControl = new FormControl();

  encountersSem1!: EncounterCompetition[];
  encountersSem2!: EncounterCompetition[];

  constructor(
    private apollo: Apollo,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
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

          const contrl = this.formGroup.get('year');
          if (!contrl) {
            throw new Error('year is not in formGroup');
          }

          const encounters = await lastValueFrom(
            contrl.valueChanges.pipe(
              startWith(contrl.value),
              switchMap((year) =>
                this.apollo.query<{
                  encounterCompetitions: { rows: EncounterCompetition[] };
                }>({
                  query: gql`
                    query GetEncounterQuery($where: JSONObject) {
                      encounterCompetitions(where: $where) {
                        rows {
                          id
                          date
                          originalDate
                          home {
                            id
                            name
                            clubId
                          }
                          away {
                            id
                            name
                            clubId
                          }
                          encounterChange {
                            id
                            accepted
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
                        $between: compPeriod(year),
                      },
                    },
                  },
                })
              ),
              map((result) =>
                result.data.encounterCompetitions?.rows.map(
                  (r) => new EncounterCompetition(r)
                )
              ),
              map((e) =>
                e.sort((a, b) => {
                  if (!a.date || !b.date) {
                    throw new Error('No date');
                  }

                  return a.date.getTime() - b.date.getTime();
                })
              ),
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

          this.encountersSem1 = encounters.filter((r) => {
            if (!r.date) {
              throw new Error('No date');
            }
            return [8, 9, 10, 11, 12].includes(r.date.getMonth());
          });
          this.encountersSem2 = encounters.filter((r) => {
            if (!r.date) {
              throw new Error('No date');
            }

            return [0, 1, 2, 3, 4, 5].includes(r.date.getMonth());
          });

          const params = this.activatedRoute.snapshot.queryParams;
          if (params && params['encounter'] && this.encountersSem1.length > 0) {
            const foundEncounter = [
              ...this.encountersSem1,
              ...this.encountersSem2,
            ].find((r) => r.id == params['encounter']);

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
