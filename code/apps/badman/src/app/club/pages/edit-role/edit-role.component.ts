import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import {
  groupBy,
  map,
  mergeMap,
  share,
  switchMap,
  take,
  toArray,
} from 'rxjs/operators';
import {
  Claim,
  ClaimService,
  Club,
  ClubService,
  Role,
  RoleService,
} from '../../../_shared';

@Component({
  templateUrl: './edit-role.component.html',
  styleUrls: ['./edit-role.component.scss'],
})
export class EditRoleComponent implements OnInit {
  role$!: Observable<Role>;
  club$!: Observable<Club>;
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  constructor(
    private clubSerice: ClubService,
    private roleSerice: RoleService,
    private claimService: ClaimService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.club$ = this.route.paramMap.pipe(
      map((x) => x.get('id')),
      switchMap((id) => {
        if (!id) {
          throw new Error('No club id');
        }
        return this.clubSerice.getClub(id);
      })
    );
    this.role$ = this.route.paramMap.pipe(
      map((x) => x.get('roleId')),
      switchMap((id) => {
        if (!id) {
          throw new Error('No role id');
        }
        return this.roleSerice.getRole(id);
      }),
      share(),
      take(1)
    );

    this.claims$ = forkJoin([
      this.role$.pipe(map((r) => r.claims)),
      this.claimService.clubClaims(),
    ]).pipe(
      take(1),
      map(([userPerm, clubClaims]) =>
        clubClaims.map((c) => {
          c.hasPermission =
            userPerm?.findIndex((uc) => uc.name == c.name) != -1;
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

  async update(role: Role, club: Club) {
    await this.roleSerice.updateRole(role).toPromise();
    await this.router.navigate(['/', 'admin', 'club', club.id, 'edit']);
  }
}
