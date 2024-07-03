import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  PLATFORM_ID,
  TransferState,
  input,
  inject,
  output,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { EncounterCompetition } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import {
  Observable,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  pairwise,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs';

@Component({
  selector: 'badman-select-encounter',
  standalone: true,
  imports: [
    CommonModule,
    MomentModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
  ],
  templateUrl: './select-encounter.component.html',
  styleUrls: ['./select-encounter.component.scss'],
})
export class SelectEncounterComponent implements OnInit {
  private apollo = inject(Apollo);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private transferState = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);
  private destroy$ = injectDestroy();

  controlName = input('encounter');

  group = input.required<FormGroup>();

  dependsOn = input('team');

  required = input(false);

  updateOn = input(['team']);

  updateUrl = input(false);

  control = input<FormControl<string | null>>();
  protected internalControl!: FormControl<string | null>;

  encounterSelected = output<EncounterCompetition>();

  encounters$?: Observable<EncounterCompetition[]>;

  ngOnInit() {
    if (this.control()) {
      this.internalControl = this.control() as FormControl<string | null>;
    }

    if (!this.internalControl && this.group()) {
      this.internalControl = this.group().get(this.controlName()) as FormControl<string | null>;
    }

    if (!this.internalControl) {
      this.internalControl = new FormControl<string | null>(null) as FormControl<string | null>;
    }

    if (this.group()) {
      this.group().addControl(this.controlName(), this.internalControl);
    }

    const previous = this.group().get(this.dependsOn());

    if (!previous) {
      console.warn(`Dependency ${this.dependsOn()} not found`, previous);
    } else {
      // get all the controls that we need to update on when change
      const updateOnControls = this.updateOn()
        ?.filter((controlName) => controlName !== this.dependsOn())
        .map((controlName) => this.group().get(controlName))
        .filter((control) => control != null) as FormControl[];

      this.encounters$ = combineLatest([
        previous.valueChanges.pipe(startWith(null)),
        ...updateOnControls.map((control) =>
          control?.valueChanges?.pipe(startWith(() => control?.value)),
        ),
      ]).pipe(
        takeUntil(this.destroy$),
        startWith(null),
        distinctUntilChanged(),
        map(() => previous?.value),
        pairwise(),
        switchMap(([prev, next]) => {
          if (prev != null && prev !== next) {
            // Reset the team on club change
            this.internalControl.setValue(null);
          }

          if (next !== null) {
            return (
              this.group()
                .get('season')
                ?.valueChanges.pipe(
                  startWith(this.group().get('season')?.value),
                  switchMap((year) => this._loadEncounters(year, next)),
                ) ?? of([])
            );
          }

          return of([]);
        }),
        shareReplay(1),
      );

      this.encounters$.subscribe((encounters) => {
        let foundEncounter: EncounterCompetition | null = null;
        const encounterId = this.route.snapshot?.queryParamMap?.get('encounter');

        if (encounterId && encounters.length > 0) {
          foundEncounter = encounters.find((r) => r.id == encounterId) ?? null;
        }

        if (!foundEncounter) {
          const future = encounters.filter((r) => moment(r.date).isSameOrAfter());
          if (future.length > 0) {
            foundEncounter = future[0];
          }
        }

        if (!foundEncounter) {
          foundEncounter = encounters[encounters.length - 1];
        }

        if (foundEncounter && foundEncounter.id) {
          this.encounterSelected.emit(foundEncounter);
          this.internalControl.setValue(foundEncounter.id, { onlySelf: true });
          this._updateUrl(foundEncounter.id);
        }
      });
    }
  }

  selectEncounter(event: MatAutocompleteSelectedEvent | MatSelectChange) {
    let id: string;

    if (event instanceof MatAutocompleteSelectedEvent) {
      id = event.option.value;
    } else if (event instanceof MatSelectChange) {
      id = event.value;
    } else {
      return;
    }

    this._updateUrl(id, true);
  }

  private _updateUrl(encounterId: string, removeOtherParams = false) {
    if (this.updateUrl() && encounterId) {
      const queryParams: { [key: string]: string | undefined } = {
        encounter: encounterId,
      };

      if (removeOtherParams) {
        // queryParams['encounter'] = undefined;
      }

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
      });
    }
  }

  private _loadEncounters(year: string, teamId: string) {
    return this.apollo
      .query<{
        encounterCompetitions: { rows: EncounterCompetition[] };
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
      .pipe(
        transferState(`teamEncounterKey-${teamId}`, this.transferState, this.platformId),
        map(
          (result) =>
            result?.data.encounterCompetitions?.rows.map((r) => new EncounterCompetition(r)) ?? [],
        ),
        map((c) => {
          return c?.map((r) => {
            if (r.home?.id === teamId) {
              r.showingForHomeTeam = true;
            } else {
              r.showingForHomeTeam = false;
            }
            return r;
          });
        }),
        map((e) => e?.sort((a, b) => moment(a.date).diff(b.date))),
      );
  }
}
