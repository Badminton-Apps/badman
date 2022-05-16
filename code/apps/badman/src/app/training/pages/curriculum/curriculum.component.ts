import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { combineLatest, filter } from 'rxjs';

@Component({
  templateUrl: './curriculum.component.html',
  styleUrls: ['./curriculum.component.scss'],
})
export class CurriculumComponent implements OnInit {
  @ViewChild('stepper') private _stepper!: MatStepper;

  tssGroup!: FormGroup;

  gameTypeControl!: FormControl;
  offenseTypeControl!: FormControl;
  placeControl!: FormControl;
  actionControl!: FormControl;

  gameTypes = ['Enkel', 'Dubbel'];
  offenseTypes = ['Initiatief', 'Neutraal', 'Verdediging / Neutraliseren'];
  placeTypes = ['Voorveld', 'Midcourt', 'Achterveld'];
  actions: string[] = [];
  suggestions: string[] = [];

  constructor(private _formBuilder: FormBuilder) {}

  ngOnInit() {
    this.gameTypeControl = this._formBuilder.control('', [Validators.required]);
    this.offenseTypeControl = this._formBuilder.control('', [
      Validators.required,
    ]);
    this.placeControl = this._formBuilder.control('', [Validators.required]);
    this.actionControl = this._formBuilder.control('', [Validators.required]);

    this.tssGroup = this._formBuilder.group({
      gameType: this.gameTypeControl,
      offenseType: this.offenseTypeControl,
      place: this.placeControl,
      action: this.actionControl,
    });

    combineLatest([
      this.gameTypeControl.valueChanges,
      this.offenseTypeControl.valueChanges,
      this.placeControl.valueChanges,
    ])
      .pipe(
        filter(
          ([gameType, offenseType, place]) =>
            !!gameType && !!offenseType && !!place
        )
      )
      .subscribe(([gameType, offenseType, place]) => {
        this.actions = [
          'Aanvallende lift rechtdoor en cross',
          gameType,
          offenseType,
          place,
        ];
      });

    combineLatest([
      this.gameTypeControl.valueChanges,
      this.offenseTypeControl.valueChanges,
      this.placeControl.valueChanges,
      this.actionControl.valueChanges,
    ])
      .pipe(
        filter(
          ([gameType, offenseType, place, action]) =>
            !!gameType && !!offenseType && !!place && !!action
        )
      )
      .subscribe(() => {
        //gameType, offenseType, place, action
        this.suggestions = ['...'];
      });
  }

  selectOption(control: FormControl, value: unknown) {
    control.setValue(value);
    this._stepper.next();
  }
}
