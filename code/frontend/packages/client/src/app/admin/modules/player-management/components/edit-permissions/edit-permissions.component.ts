import { ClaimService } from 'app/_shared/services/security/claim.service';
import { Claim, Player } from 'app/_shared';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
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
  selector: 'app-edit-permissions',
  templateUrl: './edit-permissions.component.html',
  styleUrls: ['./edit-permissions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPermissionsComponent implements OnInit {
  claims$: Observable<{ category: string; claims: Claim[] }[]>;

  @Output() onClaimChanged = new EventEmitter<{
    claim: Claim;
    checked: boolean;
  }>();

  @Input()
  player: Player;

  constructor(private claimService: ClaimService) {}

  ngOnInit(): void {
    this.claims$ = combineLatest([
      this.claimService.globalUserClaims(this.player.id),
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

  claimChanged(claim: Claim, checked: boolean) {
    this.onClaimChanged.next({ claim, checked });
  }
}
