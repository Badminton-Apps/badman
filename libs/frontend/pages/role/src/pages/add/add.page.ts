import { CommonModule, isPlatformServer } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Claim, Club, Role } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import {
  Observable,
  of,
  map,
  tap,
  mergeMap,
  groupBy,
  toArray,
  lastValueFrom,
} from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { RoleFieldsComponent } from '../../components';

@Component({
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    RoleFieldsComponent,
  ],
})
export class AddPageComponent implements OnInit {
  role!: Role;
  club!: Club;
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

  constructor(
    private apollo: Apollo,
    private seoService: SeoService,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbsService: BreadcrumbService,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit(): void {
    this.role = new Role({});

    this.route.data.subscribe((data) => {
      this.club = data['club'];

      const clubName = `${this.club.name}`;

      this.seoService.update({
        title: `Adding role to ${clubName}`,
        description: `Adding role to club ${clubName}`,
        type: 'website',
        keywords: ['club', 'badminton'],
      });
      this.breadcrumbsService.set('@club', clubName);

      this.claims$ = this._loadClaims();
    });
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

  async add(role: Role, club: Club) {
    if (!club?.id) {
      throw new Error('No role id');
    }
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation AddRole($data: RoleInput!) {
            addRole(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: { ...role, clubId: club.id },
        },
      })
    );
    await this.router.navigate(['/', 'club', club.id, 'edit']);
  }
}
