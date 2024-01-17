import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-game-score',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './game-score.component.html',
  styleUrls: ['./game-score.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameScoreComponentComponent implements OnInit {
  readonly separators = '[-_,=/]';
  readonly pattern =
    '^([1-9]|[1-2][0-9]|30)[\\s]*' +
    this.separators +
    '[\\s]*([1-9]|[1-2][0-9]|30)$';

  @Input()
  gameScoreForm?: FormGroup;

  @Input()
  label?: string;

  inputValue?: FormControl;

  ngOnInit() {
    this.inputValue = new FormControl();

    // check if the formgroup is passed as input or create a new one
    if (this.gameScoreForm) {
      const team1 = this.gameScoreForm.get('team1') as FormControl;
      const team2 = this.gameScoreForm.get('team2') as FormControl;

      // if the first or second value is not passed as input, create a new one
      if (!team1) {
        this.gameScoreForm.addControl('team1', new FormControl());
      }
      if (!team2) {
        this.gameScoreForm.addControl('team2', new FormControl());
      }
    } else {
      this.gameScoreForm = new FormGroup({
        team1: new FormControl(),
        team2: new FormControl(),
      });
    }

    // set the value of the input field
    if (
      this.gameScoreForm?.get('team1')?.value &&
      this.gameScoreForm?.get('team2')?.value
    ) {
      this.inputValue?.setValue(
        `${this.gameScoreForm?.get('team1')?.value} - ${this.gameScoreForm?.get(
          'team2',
        )?.value}`,
      );
    }
  }

  onBlur() {
    const inputValue = this.inputValue?.value;

    if (!inputValue) {
      return;
    }

    let team1;
    let team2;

    // Split the input value by the separator and trim them
    const split = inputValue
      .split(new RegExp(this.separators))
      .map((value: string) => value.trim())
      .map((value: string) => parseInt(value, 10))
      .map((value: number) => (isNaN(value) ? 0 : value))
      .map((value: number) => (value > 30 ? 30 : value));
    if (split?.[0]) {
      team1 = split[0];
    }

    if (split?.[1]) {
      team2 = split[1];
    }

    this.gameScoreForm?.get('team1')?.setValue(team1);

    if (team1 && !team2) {
      team2 = this.getSecondValue(team1);
      this.gameScoreForm?.get('team2')?.setValue(team2);
    } else {
      this.gameScoreForm?.get('team2')?.setValue(team2);
    }

    this.inputValue?.setValue(
      `${this.gameScoreForm?.get('team1')?.value} - ${this.gameScoreForm?.get(
        'team2',
      )?.value}`,
    );

    if (team1 > team2) {
      this.validateInputValue(team1, team2);
    } else {
      this.validateInputValue(team2, team1);
    }
  }

  private getSecondValue(team1: number) {
    if (team1 < 19) {
      return 21;
    } else if (team1 < 29) {
      return team1 + 2;
    } else if (team1 == 30) {
      return 29;
    } else {
      return 30;
    }
  }

  private validateInputValue(team1: number, team2: number) {
    if (
      (team1 == 21 && (team2 < 20 || team2 == 23)) ||
      (team1 > 21 && Math.abs(team1 - team2) == 2) ||
      (team1 == 30 && team2 == 29)
    ) {
      return;
    }
    this.inputValue?.setErrors({ invalid: true });
  }
}
