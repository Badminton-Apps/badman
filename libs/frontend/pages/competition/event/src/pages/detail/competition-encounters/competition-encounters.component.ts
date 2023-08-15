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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { RouterModule } from '@angular/router';
import {
  LoadingBlockComponent,
  SelectTeamComponent,
} from '@badman/frontend-components';
import {
  EncounterCompetition,
  EventCompetition,
} from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'badman-competition-encounters',
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
  templateUrl: './competition-encounters.component.html',
  styleUrls: ['./competition-encounters.component.scss'],
})
export class CompetitionEncountersComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);

  // signals
  encounters?: Signal<EncounterCompetition[] | undefined>;
  awayEncounters?: Signal<EncounterCompetition[] | undefined>;
  loading = signal(true);

  // Inputs
  @Input({ required: true }) eventId?: string;

  @Input() filter!: FormGroup;

  ngOnInit(): void {
    this._setupFilter();

    this.encounters = toSignal(
      this.filter?.valueChanges?.pipe(
        tap(() => {
          this.loading.set(true);
        }),
        startWith(this.filter.value ?? {}),
        switchMap((filter) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const where: Record<string, any> = {};

          if (filter.changedDate) {
            where['originalDate'] = { $ne: null };
          }

          if (filter.changedLocation) {
            where['originalLocationId'] = { $ne: null };
          }

          return this.apollo.watchQuery<{
            eventCompetition: Partial<EventCompetition>;
          }>({
            query: gql`
              query GetEventEncounters($id: ID!, $where: JSONObject) {
                eventCompetition(id: $id) {
                  id
                  subEventCompetitions {
                    id
                    drawCompetitions {
                      id
                      encounterCompetitions(where: $where) {
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
                        encounterChange {
                          id
                          accepted
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              id: this.eventId,
              where,
            },
          }).valueChanges;
        }),
        map((result) => new EventCompetition(result?.data?.eventCompetition)),
        map(
          (event) =>
            event.subEventCompetitions
              ?.map((s) => s.drawCompetitions ?? [])
              ?.map((d) => d?.map((d) => d.encounterCompetitions ?? []))
              ?.flat(2)
              ?.filter((e) => !!e) ?? []
        ),
        map((encounters) =>
          // if the change is not null and not accepted
          encounters?.filter((encounter) =>
            this.filter?.value?.openEncounters ?? false
              ? encounter.encounterChange?.id != null &&
                !encounter.encounterChange?.accepted
              : true
          )
        ),
        tap(() => {
          this.loading.set(false);
        })
      ),
      { injector: this.injector }
    );
  }

  private _setupFilter() {
    if (!this.filter) {
      this.filter = new FormGroup({
        event: new FormControl(this.eventId),
        changedDate: new FormControl(false),
        changedLocation: new FormControl(false),
      });
    }
    if (this.filter.get('event')?.value !== this.eventId) {
      this.filter.get('event')?.setValue(this.eventId);
    }

    if (!this.filter.get('changedDate')?.value) {
      this.filter.addControl('changedDate', new FormControl(false));
    }

    if (!this.filter.get('changedLocation')?.value) {
      this.filter.addControl('changedLocation', new FormControl(false));
    }

    if (!this.filter.get('openEncounters')?.value) {
      this.filter.addControl('openEncounters', new FormControl(false));
    }
  }
}
