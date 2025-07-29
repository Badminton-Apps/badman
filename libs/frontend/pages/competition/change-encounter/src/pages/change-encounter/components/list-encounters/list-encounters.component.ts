import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingBlockComponent } from '@badman/frontend-components';
import { EncounterCompetition } from '@badman/frontend-models';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { combineLatest, of } from 'rxjs';
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
  imports: [
    CommonModule,
    TranslatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatSelectModule,
    MatTooltipModule,
    MomentModule,
    LoadingBlockComponent,
  ],
})
export class ListEncountersComponent implements OnInit {
  private readonly apollo = inject(Apollo);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private readonly translate = inject(TranslateService);
  private readonly destroy$ = injectDestroy();

  controlName = input('encounter');

  group = input.required<FormGroup>();

  dependsOn = input('team');

  updateOn = input(['team', 'season']);

  updateUrl = input(false);

  showCompact = input<boolean | undefined>(false);

  control = input<FormControl<EncounterCompetition>>();
  protected internalControl!: FormControl<EncounterCompetition | null>;

  encountersSem1!: (EncounterCompetition & {
    info: {
      icon: string;
      tooltip: string;
      infoClass: string;
    };
  })[];
  encountersSem2!: (EncounterCompetition & {
    info: {
      icon: string;
      tooltip: string;
      infoClass: string;
    };
  })[];

  ngOnInit() {
    if (this.control() != undefined) {
      this.internalControl = this.control() as FormControl<EncounterCompetition>;
    }

    if (!this.internalControl && this.group()) {
      this.internalControl = this.group().get(
        this.controlName(),
      ) as FormControl<EncounterCompetition>;
    }

    if (!this.internalControl) {
      this.internalControl = new FormControl<EncounterCompetition | null>(null);
    }

    if (this.group()) {
      this.group().addControl(this.controlName(), this.internalControl);
    }
    const depends = this.group().get(this.dependsOn());
    if (!depends) {
      console.warn(`Dependency ${this.dependsOn()} not found`, depends);
    } else {
      // get all the controls that we need to update on when change
      const updateOnControls = this.updateOn()
        ?.filter((controlName) => controlName !== this.dependsOn())
        .map((controlName) => this.group().get(controlName))
        .filter((control) => control != null) as FormControl[];

      combineLatest([
        depends.valueChanges.pipe(startWith(null)),
        ...updateOnControls.map((control) =>
          control?.valueChanges?.pipe(startWith(() => control?.value)),
        ),
      ])
        .pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged(),
          map(() => depends?.value),
          pairwise(),
          switchMap(([prev, next]) => {
            if (prev != null && prev !== next) {
              // Reset the team on club change
              this.internalControl.setValue(null);
            }

            // Check if the next is a UUID
            if (next && next.length === 36) {
              return this._loadTeams(next);
            } else {
              return of([]);
            }
          }),
        )
        .subscribe((encounters) => {
          // the encoutners should be devided in 2 years,
          // semester 1 = lowest year
          // semester 2 = highest year

          // get the lowest year
          const lowestYear = Math.min(...encounters.map((r) => r.date?.getFullYear() ?? 0));

          this.encountersSem1 = encounters.filter((r) => r.date?.getFullYear() === lowestYear).map((r) => ({
            ...r,
            info: this.getInfo(r),
          }));

          this.encountersSem2 = encounters.filter((r) => r.date?.getFullYear() !== lowestYear).map((r) => ({
            ...r,
            info: this.getInfo(r),
          }));

          const params = this.activatedRoute.snapshot.queryParams;

          if (params?.[this.controlName()]) {
            const foundEncounter = encounters.find((r) => r.id == params[this.controlName()]);

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

  getInfo(encounter: EncounterCompetition) {
    let icon = 'check';
    let infoClass = 'success';
    let tooltip = [];

    // if not accepted, show info icon
    if (!(encounter.encounterChange?.accepted ?? true)) {
      icon = 'info';
      infoClass = 'warning';
      tooltip.push('all.competition.change-encounter.errors.not-accepted');
    }

    if ((encounter.validateEncounter?.warnings?.length ?? 0) > 0) {
      infoClass = 'warning';
      if (icon == 'check') {
        icon = 'warning';
      }
      tooltip = tooltip.concat(encounter.validateEncounter?.warnings.map((e) => e.message) ?? []);
    }

    if ((encounter.validateEncounter?.errors?.length ?? 0) > 0) {
      if (icon == 'check') {
        icon = 'error';
      }
      infoClass = 'error';

      tooltip = tooltip.concat(encounter.validateEncounter?.errors.map((e) => e.message) ?? []);
    }

    // translate all tooltips and join them with a \n\r
    const tooltips = tooltip.map((t) => this.translate.instant(t)).join('\n\r\n\r');

    return {
      icon,
      tooltip: tooltips,
      infoClass,
    };
  }

  selectEncounter(event: EncounterCompetition) {
    if (!event?.id) {
      throw new Error('No id');
    }
    this.internalControl.setValue(event);
    this._updateUrl(event.id);
  }

  private _updateUrl(encounterId: string) {
    if (this.updateUrl() && encounterId) {
      const queryParams: { [key: string]: string | undefined } = {
        [this.controlName()]: encounterId,
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
        encounterCompetitions: {
          rows: EncounterCompetition[];
        };
      }>({
        query: gql`
          query ListEncounterQuery(
            $where: JSONObject
            $order: [SortOrderType!]
            $validationData: EncounterValidationInput
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
                      changeCloseRequestDatePeriod1
                      changeCloseRequestDatePeriod2
                      changeCloseDatePeriod1
                      changeCloseDatePeriod2
                      season
                      visualCode
                    }
                  }
                }
                location {
                  id
                  name
                }
                validateEncounter(validationData: $validationData) {
                  errors {
                    params
                    message
                  }
                  valid
                  validators
                  warnings {
                    message
                    params
                  }
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
          validationData: {
            teamId,
            clubId: this.group().value?.club,
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
          result.data.encounterCompetitions?.rows?.map((r) => new EncounterCompetition(r)),
        ),
        map((e) =>
          e.slice().sort((a, b) => {
            if (!a.date || !b.date) {
              throw new Error('No date');
            }

            return a.date.getTime() - b.date.getTime();
          }),
        ),
        map((e) =>
          e?.map((r) => {
            r.showingForHomeTeam = r.home?.id === teamId;
            return r;
          }),
        ),
      );
  }
}
