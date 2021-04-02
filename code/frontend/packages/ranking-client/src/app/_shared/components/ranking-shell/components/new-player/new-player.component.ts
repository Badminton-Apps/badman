import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Player } from 'app/_shared';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';

@Component({
  templateUrl: './new-player.component.html',
  styleUrls: ['./new-player.component.scss'],
})
export class NewPlayerComponent implements OnInit {
  playerForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<NewPlayerComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { input: string }
  ) {}

  ngOnInit() {
    let firstName = null;
    let lastName = null;
    if (this.data?.input != null) {
      const spaced = this.data.input.indexOf(' ');
      if (spaced != -1){
        firstName = this.data.input.slice(spaced);
        lastName = this.data.input.substr(0, spaced);
      } else {
        firstName = this.data.input;
      }
    }

    const firstNameControl = new FormControl(firstName, Validators.required);
    const lastNameControl = new FormControl(lastName, Validators.required);
    const genderControl = new FormControl(null, Validators.required);
    const memberIdControl = new FormControl(null, Validators.required);

    this.playerForm = new FormGroup({
      firstName: firstNameControl,
      lastName: lastNameControl,
      gender: genderControl,
      memberId: memberIdControl
    });
  }

  submit() {
    if (this.playerForm.valid) {
      this.dialogRef.close(new Player(this.playerForm.value));
    }
  }
}
