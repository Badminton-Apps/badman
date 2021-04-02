import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import {
  CompetitionEvent,
  ConfirmDialogModel,
  Event,
  EventService,
  EventType,
  Imported,
  RankingSystemGroup,
  SystemService,
  TournamentEvent,
} from 'app/_shared';
import { ConfirmationDialogComponent } from 'app/_shared/components/confirmation-dialog/confirmation-dialog.component';
import { BehaviorSubject, combineLatest, of, Subject, timer } from 'rxjs';
import {
  catchError,
  debounceTime,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { AddEventDialogComponent } from './components/add-event.dialog/add-event.dialog.component';

@Component({
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss'],
})
export class ImportComponent implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<Imported>();
  lastIds: string;
  displayedColumns: string[] = ['dates', 'name', 'event', 'import', 'delete'];

  resultsLength$ = new BehaviorSubject(0);
  pageIndex$ = new BehaviorSubject(0);
  pageSize$ = new BehaviorSubject(10);
  filterChange$ = new BehaviorSubject<{ query: string; eventType: EventType }>({
    eventType: undefined,
    query: undefined,
  });
  destroyed$ = new Subject();
  onPaginateChange = new EventEmitter<PageEvent>();

  checkForUpdates = timer(0, 3000);

  eventTypes = EventType;

  totalItems: number;
  isLoadingResults = true;
  cursor: string;
  prevCursor: string;
  nextCursor: string;

  defaultEvent: TournamentEvent | CompetitionEvent = { id: '-1' } as
    | TournamentEvent
    | CompetitionEvent;

  @ViewChild(MatSort) sort: MatSort;

  rankingGroups: RankingSystemGroup[];

  constructor(
    public eventService: EventService,
    private dialog: MatDialog,
    private systemsService: SystemService
  ) {}

  async ngOnInit() {
    this.rankingGroups = await this.systemsService
      .getSystemsGroups()
      .toPromise();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.sort.sortChange.pipe(takeUntil(this.destroyed$)).subscribe(() => {
      this.pageIndex$.next(0);
      this.cursor = null;
    });

    this.filterChange$.pipe(takeUntil(this.destroyed$)).subscribe(() => {
      this.pageIndex$.next(0);
      this.cursor = null;
    });

    this.onPaginateChange
      .pipe(takeUntil(this.destroyed$))
      .subscribe((newPage: PageEvent) => {
        this.pageSize$.next(newPage.pageSize);

        if (newPage.previousPageIndex < newPage.pageIndex) {
          // We are going to the next page
          this.prevCursor = this.cursor;
          this.cursor = this.nextCursor;
        } else if (newPage.previousPageIndex > newPage.pageIndex) {
          // We are going to the prev page
          this.cursor = this.prevCursor;
        }
      });

    combineLatest([
      this.filterChange$,
      this.sort.sortChange.pipe(startWith({})),
      this.onPaginateChange.pipe(startWith({})),
      this.checkForUpdates,
    ])
      .pipe(
        takeUntil(this.destroyed$),
        debounceTime(300),
        switchMap(([filterChange, sortChange, pageChange, update]) => {
          this.isLoadingResults = true;

          return this.eventService.getImported(
            this.sort.direction
              ? `DATE_${this.sort.direction.toUpperCase()}`
              : 'DATE_ASC',
            this.pageSize$.value,
            this.cursor
          );
        }),
        map((data) => {
          const count = data.imported?.total || 0;
          this.isLoadingResults = false;
          this.resultsLength$.next(count);
          if (count) {
            this.nextCursor =
              data.imported.edges[data.imported.edges.length - 1].cursor;

            return data.imported.edges.map((x) => x.node);
          } else {
            return [];
          }
        }),
        catchError((error) => {
          this.isLoadingResults = false;
          console.error(error);
          return of([]);
        }),
        // Check if there is new data
        filter((data: Imported[]) => {
          return this.lastIds !== JSON.stringify(data.map((x) => x.id));
        }),
        // We've got new data so update our last id's
        tap((data: Imported[]) => {
          this.lastIds = JSON.stringify(data.map((x) => x.id));
        })
      )
      .subscribe(async (data: Imported[]) => {
        // TODO: move this on dropdown open

        // only update if all id's are different
        for (let index = 0; index < data.length; index++) {
          data[index].event = this.defaultEvent;

          // data[index].suggestions = await this.eventService
          //   .findEvent(element.name, element.uniCode, data[index].type)
          //   .toPromise();

          // data[index].event =
          //   data[index].suggestions?.length > 0
          //     ? data[index]?.suggestions[0]
          //     : ({ id: undefined } as TournamentEvent | CompetitionEvent);
        }

        this.dataSource.data = data;
      });
  }

  async import(imported: Imported) {
    let dsId = this.dataSource.data.findIndex((r) => r.id == imported.id);
    this.dataSource.data[dsId].importing = true;

    if (imported.event == this.defaultEvent) {
      imported.event = null;
    }

    await this.eventService.startImport(imported).toPromise();
  }

  async changedEvent(event, imported: Imported) {
    let dsId = this.dataSource.data.findIndex((r) => r.id == imported.id);
    if (event.value.id != -1) {
      this.dataSource.data[dsId].event = event.value;
    } else {
      this.dataSource.data[dsId].event = this.defaultEvent;

      // this.dialog
      //   .open(AddEventDialogComponent, {
      //     minWidth: '60vw',
      //     maxHeight: '80vh',
      //     data: { imported, groups: this.rankingGroups },
      //   })
      //   .afterClosed()
      //   .pipe(takeUntil(this.destroyed$))
      //   .subscribe(async (result) => {
      //     if (result) {
      //       let addedEvent = await this.eventService
      //         .addEvent(result)
      //         .toPromise();
      //       this.dataSource.data[dsId].event = addedEvent;
      //       this.dataSource.data[dsId].suggestions.push(addedEvent);
      //     }
      //   });
    }
  }

  async fileAdded(fileInputEvent: any) {
    await this.eventService.upload(fileInputEvent).toPromise();
    this.filterChange$.next(this.filterChange$.value);
  }

  deleteImportedEvent(event: Imported) {
    const dialogData = new ConfirmDialogModel(
      'Confirm Action',
      'Are you sure you want to delete this?'
    );

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe(async (r) => {
      if (r) {
        await this.eventService
          .deleteImportedEvent({ id: event.id })
          .toPromise();
        this.filterChange$.next(this.filterChange$.value);
      }
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
