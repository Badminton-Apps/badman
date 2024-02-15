import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input } from '@angular/core';
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
import { CLUB, COMMENTS, EMAIL, EVENTS, LOCATIONS, TEAMS } from '../../../../../forms';

export class DirectErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
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
  private authenticateService = inject(AuthenticateService);

  destroy$ = new Subject<void>();
  matcher = new DirectErrorStateMatcher();

  group = input<FormGroup>();
  controlClub = input<FormControl<string>>(new FormControl());
  protected internalControlClub!: FormControl<string>;

  controlEmail = input<FormControl<string>>();
  protected internalControlEmail!: FormControl<string>;

  controlName = input(CLUB);
  controlEmailName = input(EMAIL);

  user = this.authenticateService.userSignal;

  ngOnInit() {
    if (this.controlClub() != undefined) {
      this.internalControlClub = this.controlClub() as FormControl<string>;
    }

    if (this.controlEmail() != undefined) {
      this.internalControlEmail = this.controlEmail() as FormControl<string>;
    }

    if (!this.internalControlEmail && this.group()) {
      this.internalControlEmail = this.group()?.get(this.controlEmailName()) as FormControl<string>;
    }

    if (!this.internalControlClub && this.group()) {
      this.internalControlClub = this.group()?.get(this.controlName()) as FormControl<string>;
    }

    if (!this.internalControlClub) {
      this.internalControlClub = new FormControl();
    }

    const localStorageEmail = localStorage.getItem(this.controlEmailName());
    if (!this.internalControlEmail) {
      this.internalControlEmail = new FormControl(localStorageEmail, [
        Validators.email,
      ]) as FormControl<string>;

      this.internalControlEmail?.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          filter((value) => value != null && this.internalControlEmail?.valid),
        )
        .subscribe((value) => {
          if (value != null) {
            localStorage.setItem(this.controlEmailName(), value);
          }
        });
    }

    if (this.group()) {
      this.group()?.addControl(this.controlName(), this.internalControlClub);
      this.group()?.addControl(this.controlEmailName(), this.internalControlEmail);
    }

    effect(() => {
      const userEmail = this.user()?.email;
      if (!!this.controlEmail()?.value && userEmail && !localStorageEmail) {
        this.controlEmail()?.setValue(userEmail);
      }
    });

    this.internalControlClub?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        filter(
          (value) =>
            value?.length === 36 &&
            value[8] === '-' &&
            value[13] === '-' &&
            value[18] === '-' &&
            value[23] === '-',
        ),
        startWith(this.group()?.value?.[this.controlName()]),
        pairwise(),
      )
      .subscribe(([prev, next]) => {
        // clear all other values of groupw
        if (this.group() && prev !== next && next) {
          this.group()?.get(TEAMS)?.reset();
          this.group()?.get(EVENTS)?.reset();
          this.group()?.get(LOCATIONS)?.reset();
          this.group()?.get(COMMENTS)?.reset();

          this.internalControlClub.setValue(next);
        }
      });
  }
}
