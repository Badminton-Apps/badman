import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  Input,
  OnInit,
  Signal,
  inject,
  computed,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Claim, Player, Role } from '@badman/frontend-models';
import { SecurityType } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { groupBy, map, mergeMap, shareReplay, toArray } from 'rxjs/operators';
import { PlayerSearchComponent } from '../../player-search';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ClaimComponent } from '../claim';
import { BadmanBlockModule } from '../../block';
import { MatListModule } from '@angular/material/list';

const roleQuery = gql`
  query GetRole($id: ID!) {
    role(id: $id) {
      id
      name
      locked
      claims {
        id
      }

      players {
        id
        fullName
      }
    }
  }
`;

@Component({
  selector: 'badman-edit-role',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,

    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatListModule,

    PlayerSearchComponent,
    ClaimComponent,
    BadmanBlockModule,
  ],
  templateUrl: './edit-role.component.html',
  styleUrls: ['./edit-role.component.scss'],
})
export class EditRoleComponent implements OnInit {
  private injector = inject(Injector);
  private apollo = inject(Apollo);
  private dialog = inject(MatDialog);

  @Input({ required: true })
  roleId!: string;

  @Input({ required: true })
  type!: SecurityType[] | SecurityType;

  role?: Signal<Role | undefined>;
  claims?: Signal<{ category: string; claims: Claim[] }[] | undefined>;

  // if role is locked, a min of 1 person must be in the role
  removeDisabled = computed(() => {
    if (this.role?.()?.locked) {
      return (this.role?.()?.players?.length ?? 0) <= 1;
    }

    // if role is not locked, you can remove anyone
    return false;
  });

  roleClaimsIds = computed(() => {
    return this.role?.()?.claims?.map((c) => c.id) ?? [];
  });

  newClaims?: Claim[];

  @ViewChild('editClaimsTemplate')
  editClaimsTemplateRef?: TemplateRef<HTMLElement>;

  ngOnInit() {
    this.role = toSignal(
      this.apollo
        .watchQuery<{ role: Partial<Role> }>({
          query: roleQuery,
          variables: {
            id: this.roleId,
          },
        })
        .valueChanges.pipe(
          shareReplay(1),
          map((result) => new Role(result.data.role))
        ),
      { injector: this.injector }
    );

    this.claims = toSignal(
      this.apollo
        .query<{ claims: Partial<Claim>[] }>({
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
              type: this.type,
            },
          },
        })
        .pipe(
          map((result) => result.data.claims.map((c) => new Claim(c))),
          mergeMap((claims) => claims ?? []),
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
        ),
      { injector: this.injector }
    );
  }

  async editClaims() {
    if (!this.editClaimsTemplateRef) {
      return;
    }

    // load the current claims in the list
    this.newClaims = this.role?.()?.claims ?? [];

    this.dialog
      .open(this.editClaimsTemplateRef)
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.saveRole();
        }

        this.newClaims = undefined;
      });
  }

  onClaimChange(enabled: boolean, claim: Claim) {
    if (!this.newClaims) {
      return;
    }

    if (enabled) {
      this.newClaims.push(claim);
    }

    if (!enabled) {
      this.newClaims = this.newClaims.filter((c) => c.id !== claim.id);
    }
  }

  // apollo stuff
  async onPlayerAddedToRole(player: Player) {
    if (player && this.role?.()) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation AddPlayerToRole($playerId: ID!, $roleId: ID!) {
              addPlayerToRole(playerId: $playerId, roleId: $roleId)
            }
          `,
          variables: {
            playerId: player.id,
            roleId: this.role()?.id,
          },
          refetchQueries: () => [
            {
              query: roleQuery,
              variables: {
                id: this.role?.()?.id,
              },
            },
          ],
        })
      );
    }
  }

  async onPlayerRemovedFromRole(player: Player) {
    if (player && this.role?.()) {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation RemovePlayerFromRole($playerId: ID!, $roleId: ID!) {
              removePlayerFromRole(playerId: $playerId, roleId: $roleId)
            }
          `,
          variables: {
            playerId: player.id,
            roleId: this.role()?.id,
          },
          refetchQueries: () => [
            {
              query: roleQuery,
              variables: {
                id: this.role?.()?.id,
              },
            },
          ],
        })
      );
    }
  }

  async saveRole() {
    if (!this.role?.()) {
      return;
    }

    await lastValueFrom(
      this.apollo.mutate<{ role: Partial<Role> }>({
        mutation: gql`
          mutation UpdateRole($data: RoleUpdateInput!) {
            updateRole(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            id: this.role()?.id,
            claims: this.newClaims,
          },
        },
        refetchQueries: () => [
          {
            query: roleQuery,
            variables: {
              id: this.role?.()?.id,
            },
          },
        ],
      })
    );
  }
}
