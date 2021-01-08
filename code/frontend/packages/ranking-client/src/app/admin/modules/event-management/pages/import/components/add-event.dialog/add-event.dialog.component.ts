import { SelectionModel } from '@angular/cdk/collections';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Imported, ImporterSubEvent, RankingSystemGroup } from 'app/_shared';

@Component({
  templateUrl: './add-event.dialog.component.html',
  styleUrls: ['./add-event.dialog.component.scss'],
})
export class AddEventDialogComponent implements OnInit {
  constructor(
    private dialogRef: MatDialogRef<AddEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    private data: { imported: Imported; groups: RankingSystemGroup[] }
  ) {}

  staticColumns = ['name', 'eventType', 'drawType'];
  displayedColumns = this.staticColumns;
  selectedGroups = new FormControl([]);
  selection = new Map<string, SelectionModel<ImporterSubEvent>>();

  eventForm: FormGroup;
  subEvents: MatTableDataSource<ImporterSubEvent>;
  groups: RankingSystemGroup[];
  useSame: boolean = true;

  ngOnInit() {
    this.subEvents = new MatTableDataSource<ImporterSubEvent>(
      this.data.imported.subEvents
    );
    this.groups = this.data.groups;
    this.selectedGroups.valueChanges.subscribe((groups) => {
      const groupNames = groups.map((g) => `group-${g.name}`);

      // Delete removed
      const removed = Object.keys(this.selection).filter(
        (s) => !groupNames.includes(s)
      );
      removed.forEach((element) => {
        console.log('Removing', element);
        this.selection.delete(element);
      });

      // Initialize new
      groupNames.forEach((element) => {
        if (!this.selection.has(element)) {
          console.log('Adding', element);
          this.selection.set(
            element,
            new SelectionModel<ImporterSubEvent>(true, [])
          );
        }
      });

      this.displayedColumns = [...this.staticColumns, ...groupNames];
    });

    this.eventForm = new FormGroup({
      name: new FormControl(this.data.imported.name, Validators.required),
      // usedForRanking: new FormControl(true, Validators.required),
      dates: new FormControl(this.data.imported.dates, Validators.required),
      firstDay: new FormControl(
        this.data.imported.firstDay,
        Validators.required
      ),
      type: new FormControl(this.data.imported.type, Validators.required),
      uniCode: new FormControl(this.data.imported.uniCode, Validators.required),
      toernamentNumber: new FormControl(this.data.imported.toernamentNumber),
    });
  }

  async save() {
    if (this.eventForm.valid) {
      this.dialogRef.close({
        ...this.eventForm.value,
        dates: this.eventForm.value.dates.join(','),
        subEvents: this.subEvents.data.map((subEvent, index) => {
          const groups = [];
          for (let [key, value] of this.selection) {
            if (value.isSelected(subEvent)) {
              const g = this.selectedGroups.value.find(
                (r) => r.name == key.replace('group-', '')
              );
              groups.push({
                id: g.id,
                name: g.name,
              });
            }
          }

          return {
            ...subEvent,
            groups,
          };
        }),
      });
    }
  }

  // addColumn() {
  //   var newRow = { id: 1, name: 'test-' + Math.random() * 10 }
  //   this.selectedGroups.push(newRow);
  //   this.displayedColumns.push(newRow.name);
  // }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(group: string) {
    const numSelected = this.selection.get(group).selected.length;
    const numRows = this.subEvents.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(group: string) {
    this.isAllSelected(group)
      ? this.selection.get(group).clear()
      : this.subEvents.data.forEach((row) =>
          this.selection.get(group).select(row)
        );
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(group: string, row?: ImporterSubEvent): string {
    if (!row) {
      return `${this.isAllSelected(group) ? 'select' : 'deselect'} all`;
    }
    return `${
      this.selection.get(group).isSelected(row) ? 'deselect' : 'select'
    } row ${row.name}`;
  }
}
