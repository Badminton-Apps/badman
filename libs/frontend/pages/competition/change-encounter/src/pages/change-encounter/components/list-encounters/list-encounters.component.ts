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
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { Subject, combineLatest, of } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  pairwise,
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

  @Input()
  updateOn = ['team', 'season'];

  @Input()
  updateUrl = false;

  control!: FormControl<EncounterCompetition | null>;

  encountersSem1!: EncounterCompetition[];
  encountersSem2!: EncounterCompetition[];

  constructor(
    private apollo: Apollo,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(
        this.controlName
      ) as FormControl<EncounterCompetition>;
    }

    if (!this.control) {
      this.control = new FormControl<EncounterCompetition | null>(null);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }
    const previous = this.group?.get(this.dependsOn);
    if (!previous) {
      console.warn(`Dependency ${this.dependsOn} not found`, previous);
    } else {
      // get all the controls that we need to update on when change
      const updateOnControls = this.updateOn
        ?.filter((controlName) => controlName !== this.dependsOn)
        .map((controlName) => this.group?.get(controlName))
        .filter((control) => control != null) as FormControl[];

      combineLatest([
        previous.valueChanges.pipe(startWith(null)),
        ...updateOnControls.map((control) =>
          control?.valueChanges?.pipe(startWith(() => control?.value))
        ),
      ])
        .pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged(),
          map(() => previous?.value),
          pairwise(),
          switchMap(([prev, next]) => {
            if (prev != null && prev !== next) {
              // Reset the team on club change
              this.control.setValue(null);
            }

            // Check if the next is a UUID
            if (next && next.length === 36) {
              return this._loadTeams(next);
            } else {
              return of([]);
            }
          })
        )
        .subscribe((encounters) => {
          // the encoutners should be devided in 2 years,
          // semester 1 = lowest year
          // semester 2 = highest year

          // get the lowest year
          const lowestYear = Math.min(
            ...encounters.map((r) => r.date?.getFullYear() || 0)
          );

          this.encountersSem1 = encounters.filter(
            (r) => r.date?.getFullYear() === lowestYear
          );

          this.encountersSem2 = encounters.filter(
            (r) => r.date?.getFullYear() !== lowestYear
          );

          const params = this.activatedRoute.snapshot.queryParams;

          if (params && params[this.controlName]) {
            const foundEncounter = encounters.find(
              (r) => r.id == params[this.controlName]
            );

            if (foundEncounter) {
              this.selectEncounter(foundEncounter);
            } else {
              this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { encounter: undefined },
                queryParamsHandling: 'merge',
              });
            }
          }

          this.changeDetectorRef.detectChanges();
        });
    }
  }

  selectEncounter(event: EncounterCompetition) {
    if (!event?.id) {
      throw new Error('No id');
    }
    this.control.setValue(event);
    this._updateUrl(event.id);
  }

  private _updateUrl(encounterId: string) {
    if (this.updateUrl && encounterId) {
      const queryParams: { [key: string]: string | undefined } = {
        [this.controlName]: encounterId,
      };

      // check if the current url is the same as the new url
      // if so, don't navigate
      const currentUrl = this.router.url;
      const newUrl = this.router
        .createUrlTree([], {
          relativeTo: this.activatedRoute,
          queryParams,
          queryParamsHandling: 'merge',
        })
        .toString();

      if (currentUrl == newUrl) {
        return;
      }

      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams,
        queryParamsHandling: 'merge',
      });
    }
  }

  private _loadTeams(teamId: string) {
    return this.apollo
      .query<{
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
                visualCode
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
                  visualCode
                  subEventCompetition {
                    id
                    eventCompetition {
                      id
                      changeCloseRequestDate
                      changeCloseDate
                      visualCode
                    }
                  }
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
      .pipe(
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
          return e?.map((r) => {
            r.showingForHomeTeam = r.home?.id === teamId;
            return r;
          });
        })
      );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
