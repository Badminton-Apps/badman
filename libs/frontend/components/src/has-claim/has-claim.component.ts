import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { AuthenticateService, ClaimService } from '@badman/frontend-auth';

@Component({
  selector: 'badman-has-claim',
  templateUrl: './has-claim.component.html',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.Emulated,
})
export class HasClaimComponent {
  private readonly claim = inject(ClaimService);
  private readonly auth = inject(AuthenticateService)

  any = input<string | string[]>([]);
  anyArray = computed<string[]>(
    () => (this.any() instanceof Array ? this.any() : [this.any()]) as string[],
  );

  all = input<string | string[]>([]);
  allArray = computed<string[]>(
    () => (this.all() instanceof Array ? this.all() : [this.all()]) as string[],
  );

  show = computed(() => {
    if (!this.auth.user()){
      return false;
    }

    if (this.any().length > 0) {
      return Array.isArray(this.anyArray())
        ? this.claim.hasAnyClaims(this.anyArray())
        : this.claim.hasClaim(this.any() as string);
    }

    if (this.all().length > 0) {
      return Array.isArray(this.allArray())
        ? this.claim.hasAllClaims(this.allArray())
        : this.claim.hasClaim(this.all() as string);
    }

    return false;
  });
}
