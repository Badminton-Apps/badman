import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { ClaimService } from '@badman/frontend-auth';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'badman-has-claim',
  templateUrl: './has-claim.component.html',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.Emulated,
})
export class HasClaimComponent implements OnInit {
  @Input()
  any!: string | string[];

  @Input()
  all!: string | string[];

  // @Input()
  // some: string|string[]

  show$!: Observable<boolean>;

  constructor(private auth: ClaimService) {}

  ngOnInit(): void {
    const permissions: Observable<boolean>[] = [];

    if (this.any) {
      permissions.push(
        Array.isArray(this.any)
          ? this.auth.hasAnyClaims$(this.any)
          : this.auth.hasClaim$(this.any)
      );
    }

    if (this.all) {
      permissions.push(
        Array.isArray(this.all)
          ? this.auth.hasAllClaims$(this.all)
          : this.auth.hasClaim$(this.all)
      );
    }

    this.show$ = combineLatest(permissions).pipe(
      map((claims) => claims.reduce((acc, claim) => acc || claim, false))
    );
  }
}
