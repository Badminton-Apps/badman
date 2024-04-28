import { CommonModule } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Claim, Club, Role } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, lastValueFrom } from 'rxjs';
import { groupBy, map, mergeMap, toArray } from 'rxjs/operators';
import { BreadcrumbService } from 'xng-breadcrumb';
import { RoleFieldsComponent } from '../../components';

@Component({
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, RoleFieldsComponent],
})
export class EditPageComponent implements OnInit {
  private apollo = inject(Apollo);
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private breadcrumbsService = inject(BreadcrumbService);
  private router = inject(Router);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);
  role!: Role;
  club!: Club;
  claims$!: Observable<{ category: string; claims: Claim[] }[]>;

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
      }),
    );

    await this.router.navigate(['/', 'club', club.id, 'edit']);
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
}
