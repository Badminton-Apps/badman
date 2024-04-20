import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  FormsModule,
  NgForm,
  ReactiveFormsModule,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { AuthenticateService } from '@badman/frontend-auth';
import { SelectClubSignalsComponent } from '@badman/frontend-components';
import { TranslateModule } from '@ngx-translate/core';
import { CLUB, EMAIL } from '../../../../../forms';
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';

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
    MatProgressBarModule,
    SelectClubSignalsComponent,
  ],
  templateUrl: './club.step.html',
  styleUrls: ['./club.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubStepComponent {
  private readonly authenticateService = inject(AuthenticateService);
  private readonly dataService = inject(TeamEnrollmentDataService);

  clubId = model<string>('');

  formGroup = input.required<FormGroup>();
  clubControl = computed(() => this.formGroup().get(CLUB) as FormControl<string>);
  emailControl = computed(() => this.formGroup().get(EMAIL) as FormControl<string>);

  constructor() {
    // inital loading
    effect(
      () => {
        const user = this.authenticateService.user();

        untracked(() => {
          if (user?.club) {
            // user.club.id = '3fafc8f9-7d97-4af8-8b44-adf5f9c4c26e';
            this.clubId.set(user.club.id);
            this.clubControl().setValue(user.club.id);
          }

          if (user?.email) {
            this.emailControl().setValue(user.email);
          }
        });
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const clubId = this.clubId();

        if (!clubId) {
          return;
        }
        untracked(() => {
          this.clubControl().setValue(clubId);
          this.dataService.state.setClub(clubId);
        });
      },
      { allowSignalWrites: true },
    );
  }
}
