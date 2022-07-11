import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Observable } from 'rxjs';
import { groupBy, map, mergeMap, switchMap, toArray } from 'rxjs/operators';
import {
  Claim,
  ClaimService,
  Club,
  ClubService,
  Role,
  RoleService,
} from '../../../_shared';

@Component({
  templateUrl: './add-role.component.html',
  styleUrls: ['./add-role.component.scss'],
})
export class AddRoleComponent implements OnInit {
  club$!: Observable<Club>;
  role!: Role;
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  constructor(
    private roleSerice: RoleService,
    private clubService: ClubService,
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

        return this.clubService.getClub(id);
      })
    );

    this.claims$ = this.claimService.clubClaims().pipe(
      mergeMap((res) => res),
      groupBy((person) => person.category ?? 'Other'),
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

  async add(role: Role, club: Club) {
    if (!club?.id) {
      throw new Error('No role id');
    }
    await lastValueFrom(this.roleSerice.addRole(role, club.id));
    await this.router.navigate(['/', 'admin', 'club', club.id, 'edit']);
  }
}
