
import { Component, inject, Signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubEventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';
import { EventCompetitionLevelFieldsComponent } from '../../pages/edit/components';
import { EVENT_QUERY } from '../../queries';
import { injectParams } from 'ngxtension/inject-params';

const UPDATE_SUBEVENT_COMPETITION = gql`
  mutation UpdateSubEventCompetition($data: SubEventCompetitionUpdateInput!) {
    updateSubEventCompetition(data: $data) {
      id
      name
      eventType
      level
      maxLevel
      minBaseIndex
      maxBaseIndex
    }
  }
`;

@Component({
  selector: 'badman-edit-subevent-dialog',
  templateUrl: './edit-subevent-dialog.component.html',
  styleUrls: ['./edit-subevent-dialog.component.scss'],
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EventCompetitionLevelFieldsComponent
],
})
export class EditSubeventDialogComponent {
  private dialogRef = inject(MatDialogRef<EditSubeventDialogComponent>);
  public data = inject<{ subEvent: SubEventCompetition }>(MAT_DIALOG_DATA);
  private apollo = inject(Apollo);
  private snackBar = inject(MatSnackBar);

  form = new FormGroup({
    name: new FormControl(this.data.subEvent.name, [Validators.required]),
    eventType: new FormControl(this.data.subEvent.eventType, [Validators.required]),
    level: new FormControl(this.data.subEvent.level),
    maxLevel: new FormControl(this.data.subEvent.maxLevel),
    minBaseIndex: new FormControl(this.data.subEvent.minBaseIndex),
    maxBaseIndex: new FormControl(this.data.subEvent.maxBaseIndex),
  });

  constructor(){
    console.log(this.data)
  }

  loading = false;

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const formValue = this.form.value;
      await lastValueFrom(
        this.apollo.mutate({
          mutation: UPDATE_SUBEVENT_COMPETITION,
          variables: {
            data: {
              id: this.data.subEvent.id,
              name: formValue.name,
              eventType: formValue.eventType,
              level: formValue.level,
              maxLevel: formValue.maxLevel,
              minBaseIndex: formValue.minBaseIndex,
              maxBaseIndex: formValue.maxBaseIndex,
            },
          },
          refetchQueries: [
            {
              query: EVENT_QUERY,
              variables: {
                id: this.data.subEvent.eventId,
              },
            },
          ],
        }),
      );

      this.snackBar.open('SubEvent updated successfully', 'Close', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error updating subevent:', error);
      this.snackBar.open('Error updating subevent', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
