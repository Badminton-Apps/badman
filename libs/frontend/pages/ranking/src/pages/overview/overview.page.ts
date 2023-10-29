import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  OnInit,
  PLATFORM_ID,
  Signal,
  TemplateRef,
  TransferState,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@badman/frontend-components';
import { RankingSystemService } from '@badman/frontend-graphql';
import { RankingSystem, Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { tap, startWith, switchMap, map, of } from 'rxjs';

const FETCH_SYSTEMS = gql`
  query GetSystemsQuery($order: [SortOrderType!], $skip: Int, $take: Int) {
    rankingSystems(order: $order, skip: $skip, take: $take) {
      id
      primary
      runCurrently
      name
      procentWinning
      procentLosing
      latestXGamesToUse
      rankingSystem
    }
  }
`;

@Component({
  selector: 'badman-ranking-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,

    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MomentModule,

    // Material Modules
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatDatepickerModule,

    // Own Module
    PageHeaderComponent,
  ],
})
export class OverviewPageComponent {
  // injects
  private apollo = inject(Apollo);
  private systemService = inject(RankingSystemService);
  private injector = inject(Injector);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // signals
  systems?: Signal<RankingSystem[]>;
  loading = signal(true);

  displayedColumns: string[] = [
    'running',
    'primary',
    'name',
    'procentWinning',
    'procentLosing',
    'latestXGamesToUse',
    'options',
  ];
  filter = new FormGroup({});
  @ViewChild('copySystem')
  copySystemTemplateRef?: TemplateRef<HTMLElement>;
  copySystemFormGroup = new FormGroup({
    start: new FormControl<Date | null>(new Date('2020-09-01')),
    end: new FormControl<Date | null>(new Date()),
  });
  showDatePicker = true;

  constructor() {
    effect(() => {
      this.systems = this._loadSystems();
    });
  }

  _loadSystems() {
    return toSignal(
      this.filter?.valueChanges?.pipe(
        tap(() => {
          this.loading.set(true);
        }),
        startWith(this.filter.value ?? {}),
        switchMap((filter) => {
          return this.apollo.watchQuery<{
            rankingSystems: Partial<RankingSystem>[];
          }>({
            query: FETCH_SYSTEMS,
            variables: {},
          }).valueChanges;
        }),
        transferState(`systens`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.rankingSystems) {
            throw new Error('No Systems');
          }
          return result.data.rankingSystems.map(
            (system) => new RankingSystem(system),
          );
        }),
        tap(() => {
          this.loading.set(false);
        }),
      ) ?? of([] as RankingSystem[]),
      { injector: this.injector },
    ) as Signal<RankingSystem[]>;
  }

  watchSystem(system: RankingSystem) {
    this.systemService.watchSystem(system);
  }

  cloneSystem(system: RankingSystem) {
    if (!this.copySystemTemplateRef) {
      return;
    }

    const dialogRef = this.dialog.open(this.copySystemTemplateRef);
    dialogRef
      .afterClosed()
      .pipe(
        switchMap(() => {
          return this.apollo.mutate({
            mutation: gql`
              mutation CopyRankingSystem(
                $id: ID!
                $copyFromStartDate: DateTime
                $copyToEndDate: DateTime
              ) {
                copyRankingSystem(
                  id: $id
                  copyFromStartDate: $copyFromStartDate
                  copyToEndDate: $copyToEndDate
                ) {
                  id
                }
              }
            `,
            variables: {
              id: system.id,
              copyFromStartDate: this.showDatePicker
                ? this.copySystemFormGroup.value.start
                : undefined,
              copyToEndDate: this.showDatePicker
                ? this.copySystemFormGroup.value.end
                : undefined,
            },
            refetchQueries: [
              {
                query: FETCH_SYSTEMS,
                variables: {},
              },
            ],
          });
        }),
      )
      .subscribe(() => {
        this.snackBar.open(
          'Copy has started, give it some time before all places are copied',
          undefined,
          {
            duration: 1000,
            panelClass: 'success',
          },
        );
      });
  }

  deleteSystem(system: RankingSystem) {
    this.apollo
      .mutate({
        mutation: gql`
          mutation RemoveRankingSystem($id: ID!) {
            removeRankingSystem(id: $id)
          }
        `,
        variables: {
          id: system.id,
        },
        refetchQueries: [
          {
            query: FETCH_SYSTEMS,
            variables: {},
          },
        ],
      })
      .subscribe();
  }
}
