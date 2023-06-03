import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  FormsModule,
  NgForm,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { AuthenticateService } from '@badman/frontend-auth';
import { SelectClubComponent } from '@badman/frontend-components';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, filter, pairwise, startWith, takeUntil } from 'rxjs';
import {
  CLUB,
  COMMENTS,
  EMAIL,
  EVENTS,
  LOCATIONS,
  TEAMS,
} from '../../../../../forms';

export class DirectErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched || isSubmitted)
    );
  }
}

@Component({
  selector: 'badman-club-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    MatInputModule,
    SelectClubComponent,
  ],
  templateUrl: './club.step.html',
  styleUrls: ['./club.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubStepComponent implements OnInit {
  destroy$ = new Subject<void>();
  matcher = new DirectErrorStateMatcher();

  constructor(private authenticateService: AuthenticateService) {}

  @Input()
  group!: FormGroup;

  @Input()
  // this also contains the searched text
  value?: FormControl<string | null | undefined> = new FormControl();

  @Input()
  // this contains the id of the selected club
  valueId?: FormControl<string | null>;

  @Input()
  email!: FormControl<string | null>;

  @Input()
  controlName = CLUB;

  @Input()
  controlEmailName = EMAIL;

  ngOnInit() {
    if (this.group) {
      this.valueId = this.group?.get(this.controlName) as FormControl<string>;
      this.email = this.group?.get(
        this.controlEmailName
      ) as FormControl<string>;
    }

    if (!this.valueId) {
      this.valueId = new FormControl();
    }

    const localStorageEmail = localStorage.getItem(this.controlEmailName);
    if (!this.email) {
      this.email = new FormControl(localStorageEmail, [Validators.email]);

      this.email?.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          filter((value) => value != null && this.email?.valid)
        )
        .subscribe((value) => {
          if (value != null) {
            localStorage.setItem(this.controlEmailName, value);
          }
        });
    }

    if (this.value?.value) {
      this.valueId?.setValue(this.value?.value);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.valueId);
      this.group.addControl(this.controlEmailName, this.email);
    }

    this.authenticateService.user$.subscribe(() => {
      if (this.authenticateService.user?.email && !localStorageEmail) {
        this.email?.setValue(this.authenticateService.user?.email);
      }
    });

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
