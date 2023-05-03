import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectClubComponent } from '@badman/frontend-components';
import { debounceTime, pairwise } from 'rxjs';
import { CLUB } from '../../../../../forms';

@Component({
  selector: 'badman-club-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectClubComponent],
  templateUrl: './club.step.html',
  styleUrls: ['./club.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubStepComponent implements OnInit {
  @Input()
  group!: FormGroup;

  @Input()
  value?: FormControl<string | null | undefined>;

  @Input()
  controlName = CLUB;

  ngOnInit() {
    if (this.group) {
      this.value = this.group?.get(this.controlName) as FormControl<string>;
    }

    if (!this.value) {
      this.value = new FormControl<string | undefined>(undefined);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.value);
    }

    this.value?.valueChanges
      .pipe(pairwise(), debounceTime(600))
      .subscribe(([prev, next]) => {
        // clear all other values of group
        if (this.group && prev !== next && next) {
          this.group.patchValue({
            club: next,
            teams: {
              M: [],
              F: [],
              MX: [],
              NATIONAL: [],
            },
            events: [],
          });
        }
      });
  }
}
