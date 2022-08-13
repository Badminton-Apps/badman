import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, Observable } from 'rxjs';
import { groupBy, map, mergeMap, switchMap, toArray } from 'rxjs/operators';
import { Claim, Club, Role, RoleService } from '@badman/frontend/shared';

@Component({
  templateUrl: './add-role.component.html',
  styleUrls: ['./add-role.component.scss'],
})
export class AddRoleComponent implements OnInit {
  club$!: Observable<Club>;
  role!: Role;
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

    this.claims$ = this.apollo
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
      .pipe(
        map((x) => x.data.claims?.map((c) => new Claim(c))),
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
