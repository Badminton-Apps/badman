import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { SelectEventComponent } from '@badman/frontend-components';
import { EventCompetition } from '@badman/frontend-models';
import { LevelType, SubEventType, levelTypeSort } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { lastValueFrom } from 'rxjs';
import { distinctUntilChanged, pairwise, startWith, takeUntil } from 'rxjs/operators';
import { EVENTS, SEASON, TEAMS } from '../../../../../forms';
import { TeamForm } from '../teams-transfer';

@Component({
  selector: 'badman-events-step',
  standalone: true,
  imports: [CommonModule, TranslateModule, SelectEventComponent, ReactiveFormsModule, MatCheckboxModule],
  templateUrl: './events.step.html',
  styleUrls: ['./events.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsStepComponent implements OnInit {
  private destroy$ = injectDestroy();

  provWhere = {
    openDate: { $lte: new Date().toISOString() },
    closeDate: { $gte: new Date().toISOString() },
    type: LevelType.PROV,
  };

  levelTypes = Object.values(LevelType).sort(levelTypeSort);

  @Input()
  group!: FormGroup;

  @Input()
  control?: FormControl<{ name: LevelType; id: string }[] | null>;

  @Input()
  controlName = EVENTS;

  @Input()
  teamsControlName = TEAMS;

  @Input()
  seasonControlName = SEASON;

  provFormControl = new FormControl<EventCompetition | null>(null, [Validators.required]);
  provInitialId?: string;

  checkboxes: {
    [key in LevelType]: boolean;
  } = {
    PROV: false,
    LIGA: false,
    NATIONAL: false,
  };

  constructor(
    private apollo: Apollo,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormControl<{ name: LevelType; id: string }[]>;
    }

    if (!this.control) {
      this.control = new FormControl<{ name: LevelType; id: string }[]>([]);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }

    this.provFormControl.valueChanges
      .pipe(takeUntil(this.destroy$), startWith(null), pairwise())
      .subscribe(([old, event]) => {
        // there was an old event, we need to remove it from the control
        if (old?.id) {
          this.control?.setValue(this.control?.value?.filter((value) => value.name != LevelType.PROV) ?? []);
        }

        // there is a new event, we need to add it to the control
        if (event?.id) {
          this.control?.setValue([
            ...(this.control?.value?.filter((value) => value.name != LevelType.PROV) ?? []),
            {
              name: LevelType.PROV,
              id: event?.id,
            },
          ]);
        }
      });

    this._loadInitialEvents();
  }

  async select(event: MatCheckboxChange, name: LevelType) {
    // If the checkbox is already checked, we don't need to do anything
    if (this.checkboxes[name] == event.checked) {
      return;
    }

    this.checkboxes[name] = event.checked;
    if (name == LevelType.PROV) {
      // we handle this in the provFormControl
      return;
    }

    if (!event.checked) {
      this.control?.setValue(this.control?.value?.filter((value) => value.name != name) ?? []);
      return;
    }

    const result = await lastValueFrom(
      this.apollo.query<{
        eventCompetitions: {
          count: number;
          rows: Partial<EventCompetition>[];
        };
      }>({
        query: gql`
          query EventCompetitions($where: JSONObject) {
            eventCompetitions(where: $where) {
              count
              rows {
                id
              }
            }
          }
        `,
        variables: {
          where: {
            openDate: { $lte: new Date().toISOString() },
            closeDate: { $gte: new Date().toISOString() },
            type: name,
          },
        },
      }),
    );

    const resultEvent = result.data?.eventCompetitions?.rows?.[0]?.id;
    if (!resultEvent) {
      return;
    }

    // if the checkbox is checked, we need to add the event to the control
    this.control?.setValue([
      ...(this.control?.value?.filter((value) => value.name != name) ?? []),
      {
        name,
        id: resultEvent,
      },
    ]);
  }

  private _loadInitialEvents() {
    const teams = this.group.get(this.teamsControlName) as FormGroup<{
      [key in SubEventType]: FormArray<TeamForm>;
    }>;

    teams?.valueChanges
      .pipe(
        startWith(teams.value),
        takeUntil(this.destroy$),
        // we only need to check the initial events if ther are any new teams
        distinctUntilChanged(
          (a, b) =>
            a.F?.length == b.F?.length &&
            a.M?.length == b.M?.length &&
            a.MX?.length == b.MX?.length &&
            a.NATIONAL?.length == b.NATIONAL?.length,
        ),
      )
      .subscribe((teams) => {
        // reset checkboxes
        this.checkboxes = {
          PROV: false,
          LIGA: false,
          NATIONAL: false,
        };
        this.provFormControl.reset();

        // find if any team was selected previous year or if current year is already present select those
        const competitions: EventCompetition[] = [];

        [...(teams.F ?? []), ...(teams.M ?? []), ...(teams.MX ?? []), ...(teams.NATIONAL ?? [])].forEach((t) => {
          if (t.team?.entry?.subEventCompetition?.eventCompetition) {
            if (!competitions.find((c) => c.id == (t.team?.entry?.subEventCompetition?.eventCompetition?.id ?? ''))) {
              competitions.push(t.team?.entry.subEventCompetition.eventCompetition);
            }
          }
        });

        if (competitions.length > 0) {
          const prov = competitions.find((c) => c.type == 'PROV');
          if (prov) {
            this.apollo
              .query<{
                eventCompetitions: {
                  count: number;
                  rows: Partial<EventCompetition>[];
                };
              }>({
                query: gql`
                  query EventCompetitions($where: JSONObject) {
                    eventCompetitions(where: $where) {
                      count
                      rows {
                        id
                        name
                        type
                      }
                    }
                  }
                `,
                variables: {
                  where: {
                    ...this.provWhere,
                  },
                },
              })
              .subscribe((result) => {
                // strip years from event name (PBO competitie 2023-2024)
                const nameWithoutYears = prov.name?.replace(/\d{4}-\d{4}/, '') ?? '';

                const find = result.data?.eventCompetitions?.rows?.find(
                  (c) => (c.name?.indexOf(nameWithoutYears) ?? -1) > -1,
                );

                if (find) {
                  this.provInitialId = find.id;
                }

                this.select({ checked: true } as MatCheckboxChange, LevelType.PROV);
                this.cdr.markForCheck();
              });
          }

          if (competitions?.some((c) => c.type == 'LIGA')) {
            this.select({ checked: true } as MatCheckboxChange, LevelType.LIGA);
          }

          if (competitions?.some((c) => c.type == 'NATIONAL')) {
            this.select({ checked: true } as MatCheckboxChange, LevelType.NATIONAL);
          }
        }
        this.cdr.detectChanges();
      });
  }
}
