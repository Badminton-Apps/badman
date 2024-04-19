import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, model } from '@angular/core';
import {
  FormControl,
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
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';

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
  email = model(this.dataService.state.email());

  constructor() {
    effect(
      () => {
        const user = this.authenticateService.user();
        if (!this.dataService.state().email && user?.email) {
          this.email.set(this.dataService.state().email || user.email);
        }

        if (user?.club) {
          this.clubId.set(user.club.id);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const email = this.email();
        if (email) {
          this.dataService.state.setEmail(email);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const club = this.clubId();
        if (club) {
          this.dataService.state.setClub(club);
        }
      },
      { allowSignalWrites: true },
    );
  }
}
