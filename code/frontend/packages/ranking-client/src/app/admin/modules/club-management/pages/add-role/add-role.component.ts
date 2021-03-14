import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Claim, Club, ClubService, Role, RoleService } from 'app/_shared';
import { ClaimService } from 'app/_shared/services/security/claim.service';
import { Observable } from 'rxjs';
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
  templateUrl: './add-role.component.html',
  styleUrls: ['./add-role.component.scss'],
})
export class AddRoleComponent implements OnInit {
  club$: Observable<Club>;
  role: Role;
  claims$: Observable<{ category: string; claims: Claim[] }[]>;

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
      switchMap((id) => this.clubService.getClub(id))
    );

    this.claims$ = this.claimService.clubClaims().pipe(
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

  async add(role: Role, club: Club) {
    await this.roleSerice.addRole(role, club.id).toPromise();
    await this.router.navigate(['/', 'admin', 'club', club.id, 'edit']);
  }
}
