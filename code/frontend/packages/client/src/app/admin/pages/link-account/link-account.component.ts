// import { AdminService } from './../../services/admin.service';
// import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
// import { merge, of, Subject } from 'rxjs';
// import { startWith, switchMap, map, catchError, flatMap } from 'rxjs/operators';
// import { MatPaginator } from '@angular/material/paginator';
// import { MatSort } from '@angular/material/sort';
// import { SelectionModel } from '@angular/cdk/collections';

// @Component({
//   templateUrl: './link-account.component.html',
//   styleUrls: ['./link-account.component.scss']
// })
// export class LinkAccountComponent implements AfterViewInit {
//   displayedColumns: string[] = ['select', 'name', 'email', 'playerId'];
//   data = [];
//   selection = new SelectionModel<{ id: number; PlayerId: number }>(true, []);
//   processed = new Subject();

//   resultsLength = 0;
//   isLoadingResults = true;
//   isRateLimitReached = false;

//   @ViewChild(MatSort) sort: MatSort;

//   constructor(private adminService: AdminService) {}

//   ngAfterViewInit() {
//     // If the user changes the sort order, reset back to the first page.
//     merge(this.sort.sortChange, this.processed)
//       .pipe(
//         startWith({}),
//         switchMap(() => {
//           this.isLoadingResults = true;
//           return this.adminService.linkAccounts();
//           // return this.exampleDatabase!.getRepoIssues(
//           //   this.sort.active, this.sort.direction, this.paginator.pageIndex);
//         }),
//         map((data: any[]) => {
//           // Flip flag to show that loading has finished.
//           this.isLoadingResults = false;
//           this.isRateLimitReached = false;
//           this.resultsLength = data.length;
//           return data;
//         }),
//         catchError(() => {
//           this.isLoadingResults = false;
//           // Catch if the GitHub API has reached its rate limit. Return empty data.
//           this.isRateLimitReached = true;
//           return of([]);
//         })
//       )
//       .subscribe(data => (this.data = data));
//   }

//   /** Whether the number of selected elements matches the total number of rows. */
//   isAllSelected() {
//     const numSelected = this.selection.selected.length;
//     const numRows = this.data.length;
//     return numSelected === numRows;
//   }

//   /** Selects all rows if they are not all selected; otherwise clear selection. */
//   masterToggle() {
//     this.isAllSelected()
//       ? this.selection.clear()
//       : this.data.forEach(row => this.selection.select(row));
//   }

//   /** The label for the checkbox on the passed row */
//   checkboxLabel(row?: any): string {
//     if (!row) {
//       return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
//     }
//     return `${
//       this.selection.isSelected(row) ? 'deselect' : 'select'
//     } row ${row.position + 1}`;
//   }

//   async linkAccounts(accept: boolean) {
//     await this.adminService
//       .linkAccount(this.selection.selected.map(x => x.id).join(','), accept)
//       .toPromise();
//     this.processed.next();
//   }
// }
