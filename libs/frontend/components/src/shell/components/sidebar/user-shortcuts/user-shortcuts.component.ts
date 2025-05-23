import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { AuthenticateService } from '@badman/frontend-auth';
import { ClubMembershipType } from '@badman/utils';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'badman-user-shortcuts',
    imports: [
        CommonModule,
        TranslatePipe,
        MatListModule,
        MatDividerModule,
        RouterModule,
        MatExpansionModule,
        MatIconModule,
    ],
    templateUrl: './user-shortcuts.component.html',
    styleUrls: ['./user-shortcuts.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserShortcutsComponent {
  private readonly authenticateService = inject(AuthenticateService);

  user = computed(() => this.authenticateService.user());
  loggedIn = computed(() => this.authenticateService.loggedIn());
  clubs = computed(() =>
    (this.user()?.clubs ?? [])
      .filter((club) => club.clubMembership?.active)
      .sort((a, b) => {
        // sort by membership type, first normal then loan
        if (a.clubMembership?.membershipType === b.clubMembership?.membershipType) {
          return 0;
        }

        if (a.clubMembership?.membershipType === ClubMembershipType.NORMAL) {
          return -1;
        }

        if (b.clubMembership?.membershipType === ClubMembershipType.NORMAL) {
          return 1;
        }

        return 0;
      }),
  );

  expanded = {
    club: true,
  };

  whenNavigate = output<void>();
}
