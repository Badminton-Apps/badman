import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectClubComponent } from '@badman/frontend-components';
import { Subject, filter, pairwise, startWith, takeUntil } from 'rxjs';
import { CLUB, COMMENTS, EVENTS, LOCATIONS, TEAMS } from '../../../../../forms';

@Component({
  selector: 'badman-club-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectClubComponent],
  templateUrl: './club.step.html',
  styleUrls: ['./club.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubStepComponent implements OnInit {
  destroy$ = new Subject<void>();

  @Input()
  group!: FormGroup;

  @Input()
  // this also contains the searched text
  value?: FormControl<string | null | undefined> = new FormControl();

  @Input()
  // this contains the id of the selected club
  valueId?: FormControl<string | null>;

  @Input()
  controlName = CLUB;

  ngOnInit() {
    if (this.group) {
      this.valueId = this.group?.get(this.controlName) as FormControl<string>;
    }

    if (!this.valueId) {
      this.valueId = new FormControl();
    }

    if (this.value?.value) {
      this.valueId?.setValue(this.value?.value);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.valueId);
    }

    this.value?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        filter(
          (value) =>
            value?.length === 36 &&
            value[8] === '-' &&
            value[13] === '-' &&
            value[18] === '-' &&
            value[23] === '-'
        ),
        startWith(this.group.value?.[this.controlName]),
        pairwise()
      )
      .subscribe(([prev, next]) => {
        // clear all other values of groupw
        if (this.group && prev !== next && next) {
          this.group.get(TEAMS)?.reset();
          this.group.get(EVENTS)?.reset();
          this.group.get(LOCATIONS)?.reset();
          this.group.get(COMMENTS)?.reset();

          this.valueId?.setValue(next);
        }
      });
  }
}
