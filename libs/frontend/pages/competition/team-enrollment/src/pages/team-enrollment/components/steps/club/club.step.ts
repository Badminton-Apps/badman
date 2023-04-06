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

  ngOnInit() {
    if (this.group) {
      this.value = this.group?.get('club') as FormControl<string>;
    }

    if (!this.value) {
      this.value = new FormControl<string | undefined>(undefined);
    }

    if (this.group) {
      this.group.addControl('club', this.value);
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
