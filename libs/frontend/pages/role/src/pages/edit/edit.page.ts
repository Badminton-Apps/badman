import { CommonModule, isPlatformServer } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Claim, Club, Role } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom, Observable, of } from 'rxjs';
import { groupBy, map, mergeMap, tap, toArray } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { RoleFieldsComponent } from '../../components';

@Component({
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,

    RoleFieldsComponent,
  ],
})
export class EditPageComponent implements OnInit {
  role!: Role;
  club!: Club;
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  constructor(
    private apollo: Apollo,
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    private router: Router,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.club = data['club'];
      this.role = data['role'];

      const clubName = `${this.club.name}`;
      const roleName = `${this.role.name}`;

      this.seoService.update({
        title: `${roleName} - ${clubName}`,
        description: `Edit role ${roleName} of club ${clubName}`,
        type: 'website',
        keywords: ['club', 'badminton'],
      });
      this.breadcrumbsService.set('@role', roleName);
      this.breadcrumbsService.set('@club', clubName);

      this.claims$ = this._loadClaims();
    });
  }

  async update(role: Role, club: Club) {
    await lastValueFrom(
      this.apollo.mutate<{ role: Partial<Role> }>({
        mutation: gql`
          mutation UpdateRole($data: RoleUpdateInput!) {
            updateRole(data: $data) {
              id
              name
              claims {
                name
              }
            }
          }
        `,
        variables: {
          data: role,
        },
      })
    );

    await this.router.navigate(['/', 'club', club.id, 'edit']);
  }

  private _loadClaims() {
    const STATE_KEY = makeStateKey<Claim[]>('clubTeamsKey-' + this.club.id);
    let obs$;

    if (this.transferState.hasKey(STATE_KEY)) {
      const state = this.transferState.get(STATE_KEY, []);
      obs$ = of(state?.map((team) => new Claim(team)));
    } else {
      obs$ = this.apollo
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
          tap((claims) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, claims);
            }
          })
        );
    }
    return obs$.pipe(
      mergeMap((claims) => claims),
      groupBy((category) => category.category ?? 'Other'),
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
}
