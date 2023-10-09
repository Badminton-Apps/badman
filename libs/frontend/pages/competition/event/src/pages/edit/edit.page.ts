import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  OnInit,
  Signal,
  TemplateRef,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AddRoleComponent,
  EditRoleComponent,
  HasClaimComponent,
  PageHeaderComponent,
} from '@badman/frontend-components';
import { EventCompetition, Role } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { SecurityType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, map, shareReplay, lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { EventCompetitionLevelFieldsComponent } from './components';
import { EVENT_QUERY } from '../../resolvers';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export type ExceptionType = FormGroup<{
  start: FormControl<Date | undefined>;
  end: FormControl<Date | undefined>;
  courts: FormControl<number | undefined>;
}>;

export type InfoEventType = FormGroup<{
  start: FormControl<Date | undefined>;
  end: FormControl<Date | undefined>;
  name: FormControl<string | undefined>;
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
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,
    TranslateModule,

    // Material Modules
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatSnackBarModule,
    MatSlideToggleModule,

    // Own modules
    PageHeaderComponent,
    EventCompetitionLevelFieldsComponent,
    HasClaimComponent,
    AddRoleComponent,
    EditRoleComponent,
  ],
})
export class EditPageComponent implements OnInit {
  private injector = inject(Injector);
  private snackBar = inject(MatSnackBar);
  public securityTypes: typeof SecurityType = SecurityType;

  roles?: Signal<Role[] | undefined>;

  eventCompetition!: EventCompetition;

  update$ = new BehaviorSubject(0);
  saved$ = new BehaviorSubject(0);

  formGroup: FormGroup = new FormGroup({});
  exceptions!: FormArray<ExceptionType>;
  infoEvents!: FormArray<InfoEventType>;

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.eventCompetition = data['eventCompetition'];

      const eventCompetitionName = `${this.eventCompetition.name}`;

      this.seoService.update({
        title: eventCompetitionName,
        description: `Competition ${eventCompetitionName}`,
        type: 'website',
        keywords: ['event', 'competition', 'badminton'],
      });
      this.breadcrumbsService.set('@eventCompetition', eventCompetitionName);

      this.setupFormGroup(this.eventCompetition);

      this.roles = toSignal(
        this.apollo
          .watchQuery<{ roles: Partial<Role>[] }>({
            query: roleQuery,
            variables: {
              where: {
                linkId: this.eventCompetition.id,
                linkType: 'competition',
              },
            },
          })
          .valueChanges.pipe(
            shareReplay(1),
            map((result) => result.data?.roles?.map((r) => new Role(r)))
          ),
        { injector: this.injector }
      );
    });
  }

  private setupFormGroup(event: EventCompetition) {
    this.exceptions = new FormArray(
      event.exceptions?.map((exception) => {
        return new FormGroup({
          start: new FormControl(exception.start, Validators.required),
          end: new FormControl(exception.end, Validators.required),
          courts: new FormControl(exception.courts),
        });
      }) ?? []
    ) as FormArray<ExceptionType>;
    this.infoEvents = new FormArray(
      event.infoEvents?.map((infoEvent) => {
        return new FormGroup({
          start: new FormControl(infoEvent.start, Validators.required),
          end: new FormControl(infoEvent.end, Validators.required),
          name: new FormControl(infoEvent.name),
        });
      }) ?? []
    ) as FormArray<InfoEventType>;

    this.formGroup = new FormGroup({
      name: new FormControl(event.name, Validators.required),
      type: new FormControl(event.type, Validators.required),
      season: new FormControl(event.season, [
        Validators.required,
        Validators.min(2000),
        Validators.max(3000),
      ]),
      contactEmail: new FormControl(event.contactEmail, Validators.required),
      checkEncounterForFilledIn: new FormControl(
        event.checkEncounterForFilledIn
      ),
      teamMatcher: new FormControl(event.teamMatcher),

      usedRankingUnit: new FormControl(event.usedRankingUnit, [
        Validators.required,
      ]),
      usedRankingAmount: new FormControl(event.usedRankingAmount, [
        Validators.required,
        Validators.min(1),
        Validators.max(52),
      ]),

      exceptions: this.exceptions,
      infoEvents: this.infoEvents,

      subEvents: new FormArray(
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
        }) ?? []
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
                id: this.eventCompetition.id,
                year: r,
              },
            })
            .subscribe((r) => {
              this.router.navigate([
                '/competition',
                r.data?.copyEventCompetition?.slug,
              ]);
            });
        }
      });
  }

  async save() {
    const eventCompetition = new EventCompetition({
      ...this.eventCompetition,
      ...this.formGroup.value,
    });

    await lastValueFrom(
      this.apollo.mutate<{ updateEventCompetition: Partial<EventCompetition> }>(
        {
          mutation: gql`
            mutation UpdateEventCompetition(
              $data: EventCompetitionUpdateInput!
            ) {
              updateEventCompetition(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              id: eventCompetition.id,
              name: eventCompetition.name,
              season: eventCompetition.season,
              contactEmail: eventCompetition.contactEmail,
              teamMatcher: eventCompetition.teamMatcher,
              checkEncounterForFilledIn: eventCompetition.checkEncounterForFilledIn,
              exceptions:
                eventCompetition.exceptions?.filter((e) => e.start && e.end) ??
                [],
              infoEvents:
                eventCompetition.infoEvents?.filter((e) => e.start && e.end) ??
                [],
            },
          },
          refetchQueries: [
            {
              query: EVENT_QUERY,
              variables: {
                id: eventCompetition.id,
              },
            },
          ],
        }
      )
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
      }) as ExceptionType
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
      }) as InfoEventType
    );
  }

  removeInfoEvent(index: number) {
    this.infoEvents.removeAt(index);
  }
}
