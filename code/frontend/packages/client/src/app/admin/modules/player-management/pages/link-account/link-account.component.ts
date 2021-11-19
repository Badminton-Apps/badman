import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { merge, of, Subject } from 'rxjs';
import { startWith, switchMap, map, catchError } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { AdminService } from 'app/admin/services';

@Component({
  templateUrl: './link-account.component.html',
  styleUrls: ['./link-account.component.scss'],
})
export class LinkAccountComponent implements AfterViewInit {
  displayedColumns: string[] = ['select', 'name', 'email', 'playerId'];
  data = [];
  selection = new SelectionModel<{ id: number; playerId: number }>(true, []);
  processed = new Subject();

  resultsLength = 0;
  isLoadingResults = true;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private adminService: AdminService) {}

  ngAfterViewInit() {
    merge(this.sort.sortChange, this.processed)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.adminService.linkAccounts();
        }),
        map((data: any) => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.resultsLength = data.length;
          return data;
        }),
        catchError(() => {
          this.isLoadingResults = false;
          return of([]);
        })
      )
      .subscribe((data) => (this.data = data));
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ? this.selection.clear() : this.data.forEach((row) => this.selection.select(row));
  }

  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  async linkAccounts(accept: boolean) {
    await this.adminService.linkAccount(this.selection.selected.map((x) => x.id).join(','), accept).toPromise();
    this.processed.next(null);
  }
}
