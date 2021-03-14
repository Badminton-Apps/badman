import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from 'app/player';
import { Claim, Player, PlayerService } from 'app/_shared';
import { ClaimService } from 'app/_shared/services/security/claim.service';
import { forkJoin, Observable } from 'rxjs';
import {
  groupBy,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  toArray,
} from 'rxjs/operators';
@Component({
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss'],
})
export class PermissionsComponent implements OnInit {
  claims$: Observable<{ category: string; claims: Claim[] }[]>;
  user$: Observable<Player>;

  constructor(
    private claimService: ClaimService,
    private userService: PlayerService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const userId$ = this.route.paramMap.pipe(map((r) => r.get('id')));

    this.user$ = userId$.pipe(
      switchMap((id) => this.userService.getPlayer(id))
    );

    this.claims$ = userId$.pipe(
      switchMap((id) =>
        forkJoin([
          this.claimService.globalUserClaims(id),
          this.claimService.globalClaims(),
        ])
      ),
      take(1),
      map(([userPerm, globalClaims]) =>
        globalClaims.map((c) => {
          c.hasPermission = userPerm.findIndex((uc) => uc.name == c.name) != -1;
          return c;
        })
      ),
      mergeMap((res) => res),
      groupBy((person) => person.category),
      mergeMap((obs) => {
        return obs.pipe(
          toArray(),
          map((items) => {
            return { category: obs.key, claims: items };
          })
        );
      }),
      toArray()
    );
  }

  async claimChanged(claim: Claim, user: Player, checked: boolean) {
    await this.claimService.updateGlobalUserClaim(user.id, claim.id, checked).toPromise();
  }
}
