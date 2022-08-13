import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { forkJoin, lastValueFrom, Observable } from 'rxjs';
import {
  groupBy,
  map,
  mergeMap,
  share,
  switchMap,
  take,
  toArray,
} from 'rxjs/operators';
import { Claim, Club, Role, RoleService } from '@badman/frontend/shared';

@Component({
  templateUrl: './edit-role.component.html',
  styleUrls: ['./edit-role.component.scss'],
})
export class EditRoleComponent implements OnInit {
  role$!: Observable<Role>;
  club$!: Observable<Club>;
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  constructor(
    private apollo: Apollo,
    private roleSerice: RoleService,
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
        return this.apollo.query<{ club: Partial<Club> }>({
          query: gql`
            query Club($id: ID!) {
              club(id: $id) {
                id
              }
            }
          `,
          variables: {
            id,
          },
        });
      }),
      map((x) => x.data.club)
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
      this.apollo
        .query<{ claims: Claim[] }>({
          query: gql`
            query Claims($where: JSONObject) {
              claims(where: $where) {
                id
                name
                category
                description
                type
              }
            }
          `,
          variables: {
            where: {
              type: ['CLUB', 'TEAM'],
            },
          },
        })
        .pipe(map((x) => x.data.claims?.map((c) => new Claim(c)))),
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

  async update(role: Role, club: Club) {
    await lastValueFrom(
      this.apollo.mutate<{ role: Partial<Role> }>({
        mutation: gql`
          mutation UpdateRole($data: RoleUpdateInput!) {
            updateRole(data: $data) {
              id
              name
            }
          }
        `,
        variables: {
          data: role,
        },
      })
    );

    // await this.roleSerice.updateRole(role).toPromise();
    await this.router.navigate(['/', 'club', club.id, 'edit']);
  }
}
