import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  Input,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import {
  LoadingBlockComponent,
  SelectTeamComponent,
} from '@badman/frontend-components';
import { EncounterCompetition } from '@badman/frontend-models';
import { getCurrentSeason, sortEncounters } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'badman-club-encounters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectTeamComponent,
    LoadingBlockComponent,
    RouterModule,
    TranslateModule,
    MomentModule,

    MatSlideToggleModule,
    MatListModule,
    MatProgressBarModule,
  ],
  templateUrl: './club-encounters.component.html',
  styleUrls: ['./club-encounters.component.scss'],
})
export class ClubEncountersComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);

  // signals
  encounters = signal<EncounterCompetition[]>([]);
  loading = signal(true);

  // Inputs
  @Input({ required: true }) clubId!: Signal<string>;

  @Input() filter!: FormGroup;

  ngOnInit(): void {
    this._setupFilter();

    this.filter?.valueChanges
      .pipe(
        startWith(this.filter.value ?? {}),
        tap(() => {
          this.loading.set(true);
        }),
        switchMap((filter) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const where: Record<string, any> = {
            $or: [
              {
                homeTeamId: {
                  $in: filter.teams,
                },
              },
            ],
          };

          if (!filter.onlyHomeGames) {
            where['$or'].push({
              awayTeamId: {
                $in: filter.teams,
              },
            });
          }

          if (filter.changedDate) {
            where['originalDate'] = { $ne: null };
          }

          if (filter.changedLocation) {
            where['originalLocationId'] = { $ne: null };
          }

          return this.apollo.watchQuery<{
            encounterCompetitions: {
              count: number;
              rows: Partial<EncounterCompetition>[];
            };
          }>({
            query: gql`
              query GetTeamEncounters($where: JSONObject) {
                encounterCompetitions(where: $where) {
                  count
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
                    homeScore
                    awayScore
                    drawCompetition {
                      id
                      subEventCompetition {
                        id
                        eventType
                        eventId
                      }
                    }
                    encounterChange {
                      id
                      accepted
                    }
                  }
                }
              }
            `,
            variables: {
              where,
            },
          }).valueChanges;
        }),
        map((result) => {
          return result?.data?.encounterCompetitions.rows;
        }),
        map(
          (encounters) =>
            encounters?.map((encounter) => new EncounterCompetition(encounter)),
        ),
        map((encounters) => encounters?.sort(sortEncounters)),
        map(
          (encounters) =>
            // if the change is not null and not accepted
            encounters?.filter((encounter) =>
              this.filter?.value?.openEncounters ?? false
                ? encounter.encounterChange?.id != null &&
                  !encounter.encounterChange?.accepted
                : true,
            ),
        ),
        tap(() => {
          this.loading.set(false);
        }),
      )
      .subscribe((encounters) => {
        this.encounters?.set(encounters);
      });
  }

  private _setupFilter() {
    if (!this.filter) {
      this.filter = new FormGroup({
        club: new FormControl(this.clubId()),
        season: new FormControl(getCurrentSeason()),
        teams: new FormControl(),
        onlyHomeGames: new FormControl(true),
        changedDate: new FormControl(false),
        changedLocation: new FormControl(false),
        openEncounters: new FormControl(false),
      });
    }
    if (
      (this.filter.get('club')?.value?.id ?? this.filter.get('club')?.value) !==
      this.clubId()
    ) {
      this.filter.get('club')?.setValue({ id: this.clubId() });
    }

    if (!this.filter.get('teams')?.value) {
      this.filter.addControl('teams', new FormControl([]));
    }

    if (!this.filter.get('season')?.value) {
      this.filter.addControl('season', new FormControl(getCurrentSeason()));
    }

    if (!this.filter.get('changedDate')?.value) {
      this.filter.addControl('changedDate', new FormControl(false));
    }

    if (!this.filter.get('changedLocation')?.value) {
      this.filter.addControl('changedLocation', new FormControl(false));
    }

    if (!this.filter.get('onlyHomeGames')?.value) {
      this.filter.addControl('onlyHomeGames', new FormControl(true));
    }

    if (!this.filter.get('openEncounters')?.value) {
      this.filter.addControl('openEncounters', new FormControl(false));
    }
  }
}
