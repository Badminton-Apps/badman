import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  effect,
  inject,
  input,
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
import { IsUUID } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, distinctUntilChanged, filter, pairwise, startWith, takeUntil } from 'rxjs';
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
  private readonly authenticateService = inject(AuthenticateService);
  private readonly injector = inject(Injector);

  destroy$ = new Subject<void>();
  matcher = new DirectErrorStateMatcher();

  group = input<FormGroup>();
  controlClub = input<FormControl<string>>();
  protected internalControlClub!: FormControl<string>;

  controlEmail = input<FormControl<string>>();
  protected internalControlEmail!: FormControl<string>;

  controlName = input(CLUB);
  controlEmailName = input(EMAIL);

  user = this.authenticateService.user;

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

    effect(
      () => {
        const userEmail = this.user()?.email;
        if (!!this.controlEmail()?.value && userEmail && !localStorageEmail) {
          this.controlEmail()?.setValue(userEmail);
        }
      },
      {
        injector: this.injector,
      },
    );

    this.internalControlClub?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        filter(IsUUID),
        distinctUntilChanged(),
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
