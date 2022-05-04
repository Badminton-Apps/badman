import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest, Observable } from 'rxjs';
import {
  debounceTime,
  groupBy,
  map,
  mergeMap,
  take,
  toArray,
} from 'rxjs/operators';
import { Claim, ClaimService, Player } from '../../../../../_shared';

@Component({
  selector: 'badman-edit-permissions',
  templateUrl: './edit-permissions.component.html',
  styleUrls: ['./edit-permissions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPermissionsComponent implements OnInit {
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  @Input()
  player!: Player;

  constructor(
    private claimService: ClaimService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (!this.player?.id) {
      throw new Error('No player');
    }

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
    if (!this.player?.id) {
      throw new Error('No player');
    }
    if (!claim?.id) {
      throw new Error('No claim');
    }

    this.claimService
      .updateGlobalUserClaim(this.player.id, claim.id, checked)
      .pipe(debounceTime(600))
      .subscribe((_) => {
        this._snackBar.open('Saved', undefined, {
          duration: 1000,
          panelClass: 'success',
        });
      });
  }
}
