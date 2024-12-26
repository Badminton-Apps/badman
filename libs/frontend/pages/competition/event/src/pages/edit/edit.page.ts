import { CommonModule } from '@angular/common';
import { Component, Signal, TemplateRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import {
  AddRoleComponent,
  EditRoleComponent,
  HasClaimComponent,
  PageHeaderComponent,
  PlayerSearchComponent,
  SelectCountryComponent,
  SelectCountrystateComponent,
} from '@badman/frontend-components';
import { EventCompetition, Player, Role } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { LevelType, SecurityType } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { injectRouteData } from 'ngxtension/inject-route-data';
import {
  BehaviorSubject,
  Subject,
  lastValueFrom,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { EVENT_QUERY } from '../../resolvers';
import { EventCompetitionLevelFieldsComponent } from './components';

export type ExceptionType = FormGroup<{
  start: FormControl<Date | undefined>;
  end: FormControl<Date | undefined>;
  courts: FormControl<number | undefined>;
}>;

export type InfoEventType = FormGroup<{
  start: FormControl<Date | undefined>;
  end: FormControl<Date | undefined>;
  name: FormControl<string | undefined>;
  allowCompetition: FormControl<boolean | undefined>;
}>;

const roleQuery = gql`
  query GetRoles($where: JSONObject) {
    roles(where: $where) {
      id
    }
  }
`;

@Component({
    selector: 'badman-competition-edit',
    templateUrl: './edit.page.html',
    styleUrls: ['./edit.page.scss'],
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        MatIconModule,
        MatMenuModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatButtonModule,
        MatInputModule,
        MatCheckboxModule,
        ReactiveFormsModule,
        MatDatepickerModule,
        MatSnackBarModule,
        MatSlideToggleModule,
        MatOptionModule,
        MatSelectModule,
        PageHeaderComponent,
        EventCompetitionLevelFieldsComponent,
        HasClaimComponent,
        AddRoleComponent,
        EditRoleComponent,
        SelectCountryComponent,
        SelectCountrystateComponent,
        PlayerSearchComponent,
    ]
})
export class EditPageComponent {
  private readonly destroy$ = injectDestroy();
  // private readonly injector = inject(Injector);
  private readonly translateService = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly apollo = inject(Apollo);
  private readonly dialog = inject(MatDialog);

  eventCompetition = injectRouteData<EventCompetition>('eventCompetition');

  public securityTypes: typeof SecurityType = SecurityType;

  roles?: Signal<Role[] | undefined>;

  update$ = new BehaviorSubject(0);
  saved$ = new BehaviorSubject(0);

  roleChanged$ = new Subject<void>();

  formGroup: FormGroup = new FormGroup({});
  exceptions!: FormArray<ExceptionType>;
  infoEvents!: FormArray<InfoEventType>;

  // enum to array
  types = Object.keys(LevelType);

  constructor() {
    const compTitle = 'all.competition.title';

    const eventCompetition = this.eventCompetition();
    if (!eventCompetition) {
      throw new Error('Event competition not found');
    }

    this.translateService
      .get([compTitle])
      .pipe(takeUntil(this.destroy$))
      .subscribe((translations) => {
        const eventCompetitionName = `${eventCompetition.name}`;

        this.breadcrumbService.set('competition', translations[compTitle]);
        this.breadcrumbService.set('@eventCompetition', eventCompetitionName);
        this.seoService.update({
          title: eventCompetitionName,
          description: `Competition ${eventCompetitionName}`,
          type: 'website',
          keywords: ['event', 'competition', 'badminton'],
        });
      });

    this.setupFormGroup(eventCompetition);

    this.roles = toSignal(
      this.roleChanged$.pipe(
        startWith(undefined),
        switchMap(
          () =>
            this.apollo.watchQuery<{ roles: Partial<Role>[] }>({
              query: roleQuery,
              variables: {
                where: {
                  linkId: eventCompetition.id,
                  linkType: 'competition',
                },
              },
            }).valueChanges,
        ),
        shareReplay(1),
        map((result) => result.data?.roles?.map((r) => new Role(r))),
      ),
    );
  }

  private setupFormGroup(event: EventCompetition) {
    this.exceptions = new FormArray(
      event.exceptions?.map((exception) => {
        return new FormGroup({
          start: new FormControl(exception.start, Validators.required),
          end: new FormControl(exception.end, Validators.required),
          courts: new FormControl(exception.courts),
        });
      }) ?? [],
    ) as FormArray<ExceptionType>;
    this.infoEvents = new FormArray(
      event.infoEvents?.map((infoEvent) => {
        return new FormGroup({
          start: new FormControl(infoEvent.start, Validators.required),
          end: new FormControl(infoEvent.end, Validators.required),
          name: new FormControl(infoEvent.name),
          allowCompetition: new FormControl(infoEvent.allowCompetition),
        });
      }) ?? [],
    ) as FormArray<InfoEventType>;

    this.formGroup = new FormGroup({
      name: new FormControl(event.name, Validators.required),
      type: new FormControl(event.type, Validators.required),
      state: new FormControl(event.state),
      country: new FormControl(event.country, Validators.required),
      season: new FormControl(event.season, [
        Validators.required,
        Validators.min(2000),
        Validators.max(3000),
      ]),
      contactEmail: new FormControl(event.contactEmail, Validators.required),
      contactId: new FormControl(event.contactId),
      checkEncounterForFilledIn: new FormControl(event.checkEncounterForFilledIn),
      teamMatcher: new FormControl(event.teamMatcher),

      usedRankingUnit: new FormControl(event.usedRankingUnit, [Validators.required]),
      usedRankingAmount: new FormControl(event.usedRankingAmount, [
        Validators.required,
        Validators.min(1),
        Validators.max(52),
      ]),

      exceptions: this.exceptions,
      infoEvents: this.infoEvents,

      subEventCompetitions: new FormArray(
        event.subEventCompetitions?.map((subEvent) => {
          return new FormGroup({
            id: new FormControl(subEvent.id),
            name: new FormControl(subEvent.name, Validators.required),
            level: new FormControl(subEvent.level, Validators.required),
            eventType: new FormControl(subEvent.eventType, Validators.required),
            maxLevel: new FormControl(subEvent.maxLevel, Validators.required),
            minBaseIndex: new FormControl(subEvent.minBaseIndex),
            maxBaseIndex: new FormControl(subEvent.maxBaseIndex),
          });
        }) ?? [],
      ),
    });
  }

  async copy(templateRef: TemplateRef<object>) {
    this.dialog
      .open(templateRef, {
        width: '300px',
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.apollo
            .mutate<{ copyEventCompetition: Partial<EventCompetition> }>({
              mutation: gql`
                mutation CopyEventCompetition($id: ID!, $year: Int!) {
                  copyEventCompetition(id: $id, year: $year) {
                    id
                    slug
                  }
                }
              `,
              variables: {
                id: this.eventCompetition()?.id,
                year: r,
              },
            })
            .subscribe((r) => {
              this.router.navigate(['/competition', r.data?.copyEventCompetition?.slug]);
            });
        }
      });
  }

  async save() {
    const eventCompetition = new EventCompetition({
      ...this.eventCompetition(),
      ...this.formGroup.value,
    });

    const data = {
      id: eventCompetition.id,
      name: eventCompetition.name,
      season: eventCompetition.season,
      contactEmail: eventCompetition.contactEmail,
      contactId: eventCompetition.contactId,
      teamMatcher: eventCompetition.teamMatcher,
      type: eventCompetition.type,
      state: eventCompetition.state,
      country: eventCompetition.country,
      checkEncounterForFilledIn: eventCompetition.checkEncounterForFilledIn,
      exceptions: eventCompetition.exceptions?.filter((e) => e.start && e.end) ?? [],
      infoEvents: eventCompetition.infoEvents?.filter((e) => e.start && e.end) ?? [],
      subEventCompetitions:
        eventCompetition.subEventCompetitions?.map((subEvent) => ({
          id: subEvent.id,
          name: subEvent.name,
          level: subEvent.level,
          eventType: subEvent.eventType,
          maxLevel: subEvent.maxLevel,
          minBaseIndex: subEvent.minBaseIndex,
          maxBaseIndex: subEvent.maxBaseIndex,
        })) ?? [],
    } as Partial<EventCompetition>;

    await lastValueFrom(
      this.apollo.mutate<{ updateEventCompetition: Partial<EventCompetition> }>({
        mutation: gql`
          mutation UpdateEventCompetition($data: EventCompetitionUpdateInput!) {
            updateEventCompetition(data: $data) {
              id
            }
          }
        `,
        variables: {
          data,
        },
        refetchQueries: [
          {
            query: EVENT_QUERY,
            variables: {
              id: eventCompetition.id,
            },
          },
        ],
      }),
    );

    this.saved$.next(this.saved$.value + 1);
    this.snackBar.open('Saved', undefined, {
      duration: 2000,
    });
  }

  addException() {
    this.exceptions.push(
      new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
        courts: new FormControl(0),
      }) as ExceptionType,
    );
  }

  removeException(index: number) {
    this.exceptions.removeAt(index);
  }

  addInfoEvent() {
    this.infoEvents.push(
      new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
        name: new FormControl(),
        allowCompetition: new FormControl(),
      }) as InfoEventType,
    );
  }

  removeInfoEvent(index: number) {
    this.infoEvents.removeAt(index);
  }
}
