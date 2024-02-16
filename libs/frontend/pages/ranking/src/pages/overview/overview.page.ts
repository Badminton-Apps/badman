import { CommonModule } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  TemplateRef,
  TransferState,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { HasClaimComponent, PageHeaderComponent } from '@badman/frontend-components';
import { RankingSystemService } from '@badman/frontend-graphql';
import { RankingSystem } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { catchError, filter, map, of, startWith, switchMap, takeUntil, tap } from 'rxjs';

const FETCH_SYSTEMS = gql`
  query GetSystemsQuery($order: [SortOrderType!], $skip: Int, $take: Int) {
    rankingSystems(order: $order, skip: $skip, take: $take) {
      id
      primary
      runCurrently
      calculateUpdates
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
    CommonModule,
    RouterModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MomentModule,
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
    MatSelectModule,
    PageHeaderComponent,
    HasClaimComponent,
  ],
})
export class OverviewPageComponent {
  // injects
  private apollo = inject(Apollo);
  private systemService = inject(RankingSystemService);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroy$ = injectDestroy();

  // signals
  systems = signal<RankingSystem[]>([]);
  loading = signal(true);

  copyingSystem = signal(false);
  copyingPoints = signal(false);

  displayedColumns: string[] = [
    'running',
    'primary',
    'name',
    'procentWinning',
    'procentLosing',
    'latestXGamesToUse',
    'calculateUpdates',
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

  @ViewChild('copyPoints')
  copyPointsTemplateRef?: TemplateRef<HTMLElement>;
  copyPointsFormGroup = new FormGroup({
    source: new FormControl<string | null>(null),
    start: new FormControl<Date | null>(new Date('2020-09-01')),
    end: new FormControl<Date | null>(new Date()),
  });

  constructor() {
    effect(() => {
      this._loadSystems();
    });
  }
  _loadSystems() {
    this.filter?.valueChanges
      ?.pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.loading.set(true);
        }),
        startWith(this.filter.value ?? {}),
        switchMap(() => {
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
          return result.data.rankingSystems
            .map((system) => new RankingSystem(system))
            ?.sort((a, b) => {
              // by name
              if (`${a.name}` > `${b.name}`) {
                return 1;
              } else if (`${a.name}` < `${b.name}`) {
                return -1;
              }

              return 0;
            });
        }),
        tap(() => {
          this.loading.set(false);
        }),
      )
      .subscribe((systems) => {
        this.systems.set(systems);
      });
  }

  watchSystem(system: RankingSystem) {
    if (!system.id) {
      console.warn('No system id');
      return;
    }

    this.systemService.state.watchSystem(system.id);
  }

  deleteSystem(system: RankingSystem) {
    if (!system.id) {
      console.warn('No system id');
      return;
    }

    this.systemService.state.deleteSystem(system.id);
  }

  cloneSystem(system: RankingSystem) {
    if (!this.copySystemTemplateRef) {
      return;
    }

    const dialogRef = this.dialog.open(this.copySystemTemplateRef);
    dialogRef
      .afterClosed()
      .pipe(
        filter((result) => !!result),
        switchMap(() => {
          this.copyingSystem.set(true);
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
              copyToEndDate: this.showDatePicker ? this.copySystemFormGroup.value.end : undefined,
            },
            refetchQueries: [
              {
                query: FETCH_SYSTEMS,
                variables: {},
              },
            ],
          });
        }),

        catchError((err) => {
          this.snackBar.open(err.message, undefined, {
            duration: 1000,
            panelClass: 'error',
          });
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.copyingSystem.set(false);
        if (!result) {
          return;
        }
        this.snackBar.open('System copied', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }

  clonePoints(system: RankingSystem) {
    if (!this.copyPointsTemplateRef) {
      return;
    }

    const dialogRef = this.dialog.open(this.copyPointsTemplateRef);
    dialogRef
      .afterClosed()
      .pipe(
        filter((result) => !!result),
        switchMap(() => {
          this.copyingPoints.set(true);
          return this.apollo.mutate({
            mutation: gql`
              mutation CopyPlacesPoints(
                $source: ID!
                $destination: ID!
                $copyFromStartDate: DateTime
                $copyToEndDate: DateTime
              ) {
                copyPlacesPoints(
                  source: $source
                  destination: $destination
                  copyFromStartDate: $copyFromStartDate
                  copyToEndDate: $copyToEndDate
                ) {
                  id
                }
              }
            `,
            variables: {
              source: this.copyPointsFormGroup.value.source,
              destination: system.id,
              copyFromStartDate: this.copyPointsFormGroup.value.start,
              copyToEndDate: this.copyPointsFormGroup.value.end,
            },

            refetchQueries: [
              {
                query: FETCH_SYSTEMS,
                variables: {},
              },
            ],
          });
        }),
        catchError((err) => {
          this.snackBar.open(err.message, undefined, {
            duration: 1000,
            panelClass: 'error',
          });
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.copyingPoints.set(false);
        if (!result) {
          return;
        }
        this.snackBar.open('System copied', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }
}
