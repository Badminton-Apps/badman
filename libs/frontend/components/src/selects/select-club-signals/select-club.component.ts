import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthenticateService, ClaimService } from '@badman/frontend-auth';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { TranslateModule } from '@ngx-translate/core';
import { SelectClubsService } from './select-club.service';

@Component({
  selector: 'badman-select-club',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    // MatInputModule,
    // MatAutocompleteModule,
    // MatSelectModule,
    MtxSelectModule,
  ],
  templateUrl: './select-club.component.html',
  styleUrls: ['./select-club.component.scss'],
})
export class SelectClubSignalsComponent {
  private readonly claimSerice = inject(ClaimService);
  private readonly dataService = inject(SelectClubsService);
  private readonly authService = inject(AuthenticateService);

  // Permissions
  singleClubPermission = input<string>('');
  allClubPermission = input<string>('');
  needsPermission = input(false);
  hasSingleClub = computed(() =>
    this.claimSerice.hasAllClaims([`*_${this.singleClubPermission()}`]),
  );
  hasAllClubs = computed(() => this.claimSerice.hasAllClaims([`${this.allClubPermission()}`]));
  user = this.authService.user;

  country = signal<string>('be');

  // clubs filtered by permissions
  possibleClubs = computed(() => {
    if (this.needsPermission()) {
      if (this.hasAllClubs()) {
        return this.dataService.clubs();
      }

      if (this.hasSingleClub()) {
        return this.dataService
          .clubs()
          .filter((club) =>
            this.claimSerice.hasAllClaims([`${club.id}_${this.singleClubPermission()}`]),
          );
      }

      return [];
    }
    return this.dataService.clubs();
  });

  // selections
  club = model<string | null>(null);

  // not sure if this is the right way to do this, otherwise it's just the same as unused private variable
  constructor() {
    effect(() => {
      this.dataService.filter.patchValue({
        country: this.country(),
      });
    });

    effect(
      () => {
        if (
          !this.club() &&
          this.dataService.filter.get('country')?.value != null &&
          this.possibleClubs().length > 0
        ) {
          this.club.set(this.possibleClubs()[0].id);
        }
      },
      {
        allowSignalWrites: true,
      },
    );
  }
}
