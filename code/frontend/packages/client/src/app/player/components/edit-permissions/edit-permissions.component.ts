import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Claim, ClaimService, Player } from 'app/_shared';
import { combineLatest, Observable } from 'rxjs';
import { groupBy, map, mergeMap, take, toArray } from 'rxjs/operators';

@Component({
  selector: 'app-edit-permissions',
  templateUrl: './edit-permissions.component.html',
  styleUrls: ['./edit-permissions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPermissionsComponent implements OnInit {
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  @Output() onClaimChanged = new EventEmitter<{
    claim: Claim;
    checked: boolean;
  }>();

  @Input()
  player!: Player;

  constructor(private claimService: ClaimService) {}

  ngOnInit(): void {
    this.claims$ = combineLatest([
      this.claimService.globalUserClaims(this.player.id!),
      this.claimService.globalClaims(),
    ]).pipe(
      take(1),
      map(([userPerm, globalClaims]) =>
        globalClaims.map((c) => {
          c.hasPermission = userPerm.findIndex((uc) => uc.name == c.name) != -1;
          return c;
        })
      ),
      mergeMap((res) => res),
      groupBy((person) => person.category!),
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

  claimChanged(claim: Claim, checked: boolean) {
    this.onClaimChanged.next({ claim, checked });
  }
}
