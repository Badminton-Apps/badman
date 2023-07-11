import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingBlockComponent } from '@badman/frontend-components';
import { EncounterCompetition } from '@badman/frontend-models';
import { getCurrentSeasonPeriod } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { Subject, lastValueFrom } from 'rxjs';
import {
  filter,
  first,
  map,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs/operators';

@Component({
  selector: 'badman-list-encounters',
  templateUrl: './list-encounters.component.html',
  styleUrls: ['./list-encounters.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,

    // Material
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatSelectModule,

    MomentModule,

    LoadingBlockComponent,
  ],
})
export class ListEncountersComponent implements OnInit, OnDestroy {
  breakpointObserver = inject(BreakpointObserver);
  isHandset = toSignal(
    this.breakpointObserver
      .observe(Breakpoints.Handset)
      .pipe(map((result) => result.matches))
  );

  destroy$ = new Subject<void>();

  @Input()
  controlName = 'encounter';

  @Input()
  group!: FormGroup;

  @Input()
  dependsOn = 'team';

  formControl!: FormControl<EncounterCompetition | null>;

  encountersSem1!: EncounterCompetition[];
  encountersSem2!: EncounterCompetition[];

  constructor(
    private apollo: Apollo,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.formControl = this.group.get(
      this.controlName
    ) as FormControl<EncounterCompetition>;

    if (!this.formControl) {
      this.group.addControl(this.controlName, new FormControl(null));
    }

    const previous = this.group.get(this.dependsOn);
    if (previous) {
      this.formControl.valueChanges
        .pipe(
          filter((r) => !!r),
          takeUntil(this.destroy$)
        )
        .subscribe((r) => {
          this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { encounter: r?.id },
            queryParamsHandling: 'merge',
          });
        });

      previous.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (teamId) => {
          this.formControl?.reset();
          if (teamId != null) {
            if (!this.formControl?.enabled) {
              this.formControl?.enable();
            }

            const contrl = this.group.get('season');
            if (!contrl) {
              throw new Error('season is not in formGroup');
            }

            const encounters = await lastValueFrom(
              contrl.valueChanges.pipe(
                startWith(contrl.value),
                switchMap((season) =>
                  this.apollo.query<{
                    encounterCompetitions: { rows: EncounterCompetition[] };
                  }>({
                    query: gql`
                      query ListEncounterQuery(
                        $where: JSONObject
                        $order: [SortOrderType!]
                      ) {
                        encounterCompetitions(where: $where, order: $order) {
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
                            location {
                              id
                              name
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
                          $between: getCurrentSeasonPeriod(season),
                        },
                      },
                      // For easy viewing in network tab
                      order: [
                        {
                          field: 'date',
                          direction: 'desc',
                        },
                      ],
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

            if (params && params['encounter']) {
              const foundEncounter = [
                ...this.encountersSem1,
                ...this.encountersSem2,
              ].find((r) => r.id == params['encounter']);

              if (foundEncounter) {
                this.formControl?.setValue(foundEncounter);
              } else {
                this.router.navigate([], {
                  relativeTo: this.activatedRoute,
                  queryParams: { encounter: undefined },
                  queryParamsHandling: 'merge',
                });
              }
            }

            this.changeDetectorRef.detectChanges();
          } else {
            this.formControl?.disable();
          }
        });
    } else {
      console.warn(`Dependency ${this.dependsOn} not found`, previous);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
