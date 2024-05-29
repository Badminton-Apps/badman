import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { ClaimService } from '@badman/frontend-auth';

@Component({
  selector: 'badman-has-claim',
  templateUrl: './has-claim.component.html',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.Emulated,
})
export class HasClaimComponent {
  private readonly auth = inject(ClaimService);

  any = input<string | string[]>([]);
  anyArray = computed<string[]>(
    () => (this.any() instanceof Array ? this.any() : [this.any()]) as string[],
  );

  all = input<string | string[]>([]);
  allArray = computed<string[]>(
    () => (this.all() instanceof Array ? this.all() : [this.all()]) as string[],
  );

  show = computed(() => {
    if (this.any().length > 0) {
      return Array.isArray(this.anyArray())
        ? this.auth.hasAnyClaimsSignal(this.anyArray())
        : this.auth.hasClaimSignal(this.any() as string);
    }

    if (this.all().length > 0) {
      return Array.isArray(this.allArray())
        ? this.auth.hasAllClaims(this.allArray())
        : this.auth.hasClaimSignal(this.all() as string);
    }

    return false;
  });
}
