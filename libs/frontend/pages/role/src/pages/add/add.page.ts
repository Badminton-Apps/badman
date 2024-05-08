import { CommonModule } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Claim, Club, Role } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, groupBy, lastValueFrom, map, mergeMap, toArray } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { RoleFieldsComponent } from '../../components';

@Component({
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, RoleFieldsComponent],
})
export class AddPageComponent implements OnInit {
  private apollo = inject(Apollo);
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private breadcrumbsService = inject(BreadcrumbService);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);
  role!: Role;
  club!: Club;
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

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
    return this.apollo
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
            type: ['club', 'team'],
          },
        },
      })
      .pipe(
        transferState('clubTeamsKey-' + this.club.id, this.stateTransfer, this.platformId),
        map((x) => x?.data.claims?.map((c) => new Claim(c))),
        mergeMap((claims) => claims ?? []),
        groupBy((category) => category.category ?? 'Other'),
        mergeMap((obs) => {
          return obs.pipe(
            toArray(),
            map((items) => {
              return { category: obs.key, claims: items };
            }),
          );
        }),
        toArray(),
      );
  }

  async add(role: Role, club: Club) {
    if (!club?.id) {
      throw new Error('No role id');
    }
    await lastValueFrom(
      this.apollo.mutate({
        mutation: gql`
          mutation CreateRole($data: RoleNewInput!) {
            createRole(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: { ...role, clubId: club.id },
        },
      }),
    );
    await this.router.navigate(['/', 'club', club.id, 'edit']);
  }
}
