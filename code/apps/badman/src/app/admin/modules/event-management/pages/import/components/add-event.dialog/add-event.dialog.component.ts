import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Imported, RankingSystemGroup } from '../../../../../../../_shared';

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

  eventForm!: FormGroup;

  ngOnInit() {
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
      tournamentNumber: new FormControl(this.data.imported.tournamentNumber),
    });
  }

  async save() {
    if (this.eventForm.valid) {
      // this.dialogRef.close({
      //   ...this.eventForm.value,
      //   dates: this.eventForm.value.dates.join(','),
      //   subEvents: this.subEvents.data.map((subEvent, index) => {
      //     let groups = [];
      //     if (this.useSame) {
      //       groups = this.selectedGroups.value.map((g: any) => {
      //         return { id: g.id, name: g.name };
      //       });
      //     } else {
      //       for (let [key, value] of this.selection) {
      //         if (value.isSelected(subEvent)) {
      //           const g = this.selectedGroups.value.find((r: any) => r.name == key.replace('group-', ''));
      //           groups.push({
      //             id: g.id,
      //             name: g.name,
      //           });
      //         }
      //       }
      //     }
      //     return {
      //       ...subEvent,
      //       groups,
      //     };
      //   }),
      // });
    }
  }
}
