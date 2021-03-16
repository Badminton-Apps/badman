import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  ITdDataTableColumn, ITdDataTableSortChangeEvent,
  TdDataTableSortingOrder
} from '@covalent/core/data-table';
import { IPageChangeEvent, TdPagingBarComponent } from '@covalent/core/paging';
import { TranslateService } from '@ngx-translate/core';
import { SystemService, PlayerService, Player } from 'app/_shared';
import { Observable, Subject } from 'rxjs';
import { filter, flatMap, map, shareReplay, startWith } from 'rxjs/operators';

@Component({
  templateUrl: './top-players.component.html',
  styleUrls: ['./top-players.component.scss'],
})
export class TopPlayersComponent implements OnInit {
  @ViewChild(TdPagingBarComponent, { static: true })
  pagingBar: TdPagingBarComponent;
  columns: ITdDataTableColumn[];
  data$: Observable<any[]>;
  filters = new Subject<any>();

  filterTerm = '';
  totalCount = 0;
  currentPage = 1;
  pageSize = 15;
  gender = 'M';
  sortBy = 'single';
  sortOrder: TdDataTableSortingOrder = TdDataTableSortingOrder.Ascending;

  constructor(
    private systemService: SystemService,
    private playerService: PlayerService,
    private router: Router,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    const system$ = this.systemService.getPrimarySystem().pipe(
      filter((x) => !!x),
      shareReplay()
    );

    this.data$ = this.filters.pipe(
      startWith(true),
      flatMap((x) => system$),
      flatMap((x) =>
        this.playerService.getTopPlayers(
          x.id,
          this.sortBy,
          this.sortOrder,
          x.caluclationIntervalLastUpdate,
          this.pageSize,
          (this.currentPage - 1) * this.pageSize,
          this.gender
        )
      ),
      map((x: any) => {
        this.totalCount = x.total;
        return x.rankingPlaces;
      })
    );

    this.createColums();
    this.translateService.onLangChange.subscribe((_) => this.createColums());
  }

  sort(sortEvent: ITdDataTableSortChangeEvent): void {
    this.sortOrder = sortEvent.order;
    this.sortBy = sortEvent.name;
    this.filters.next(true);
  }

  changeGender() {
    this.filters.next(true);
  }

  page(pagingEvent: IPageChangeEvent): void {
    this.currentPage = pagingEvent.page;
    this.pageSize = pagingEvent.pageSize;
    this.filters.next(true);
  }

  goToPlayer(event: any) {
    this.router.navigate(['/', 'player', event.row.player.id]);
  }

  private createColums() {
    this.columns = [
      {
        name: 'player',
        label: this.translateService.instant('lists.name'),
        sortable: false,
        format: (player: Player) => player.fullName,
      },
      {
        name: 'single',
        label: this.translateService.instant('systems.single'),
        sortable: true,
        width: 85,
      },
      {
        name: 'singleRank',
        label: this.translateService.instant('systems.single-rank'),
        sortable: false,
        width: 115,
      },
      {
        name: 'double',
        label: this.translateService.instant('systems.double'),
        sortable: true,
        width: 85,
      },
      {
        name: 'doubleRank',
        label: this.translateService.instant('systems.double-rank'),
        sortable: false,
        width: 115,
      },
      {
        name: 'mix',
        label: this.translateService.instant('systems.mix'),
        sortable: true,
        width: 85,
      },
      {
        name: 'mixRank',
        label: this.translateService.instant('systems.mix-rank'),
        sortable: false,
        width: 115,
      },
    ];
  }
}
