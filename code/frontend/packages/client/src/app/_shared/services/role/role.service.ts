import { Apollo } from 'apollo-angular';
import { Injectable } from '@angular/core';

import { map, tap } from 'rxjs/operators';
import { AuthService } from '../security';
import { Player, Role } from './../../models';

import * as roleQuery from '../../graphql/roles/queries/GetRoleQuery.graphql';
import * as rolesQuery from '../../graphql/roles/queries/GetRolesQuery.graphql';

import * as addRoleMutation from '../../graphql/roles/mutations/addRole.graphql';
import * as updateRoleMutation from '../../graphql/roles/mutations/updateRole.graphql';
import * as addPlayerToRoleMutation from '../../graphql/roles/mutations/addPlayerToRoleMutation.graphql';
import * as removePlayerToRoleMutation from '../../graphql/roles/mutations/removePlayerFromRoleMutation.graphql';
import * as deleteRoleMutation from '../../graphql/roles/mutations/removeRole.graphql';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  constructor(private apollo: Apollo, private authService: AuthService) {}

  getRole(roleId: string) {
    return this.apollo
      .query<{ role: Role }>({
        query: roleQuery,
        variables: {
          id: roleId,
        },
        fetchPolicy: 'network-only'
      })
      .pipe(map((x) => new Role(x.data.role)));
  }

  getRoles(where?: { [key: string]: any }) {
    return this.apollo
      .query<{ roles: Role[] }>({
        query: rolesQuery,
        variables: {
          where,
        },
        fetchPolicy: 'network-only'
      })
      .pipe(map((x) => x.data.roles.map((r) => new Role(r))));
  }

  addRole(role: Role, clubId: string) {
    return this.apollo
      .mutate<{ addRole: Role }>({
        mutation: addRoleMutation,
        variables: {
          role: { ...role, clubId },
        },
      })
      .pipe(
        map((x) => new Role(x.data.addRole)),
        tap(() => this.authService.reloadPermissions())
      );
  }

  addPlayer(role: Role, player: Player) {
    return this.apollo
      .mutate({
        mutation: addPlayerToRoleMutation,
        variables: {
          playerId: player.id,
          roleId: role.id,
        },
      })
      .pipe(tap(() => this.authService.reloadPermissions()));
  }

  removePlayer(role: Role, player: Player) {
    return this.apollo
      .mutate({
        mutation: removePlayerToRoleMutation,
        variables: {
          playerId: player.id,
          roleId: role.id,
        },
      })
      .pipe(tap(() => this.authService.reloadPermissions()));
  }

  updateRole(role: Role) {
    return this.apollo
      .mutate<{ updateRole: Role }>({
        mutation: updateRoleMutation,
        variables: {
          role,
        },
      })
      .pipe(
        map((x) => new Role(x.data.updateRole)),
        tap(() => this.authService.reloadPermissions())
      );
  }

  deleteRole(id: string) {
    return this.apollo.mutate<{ removeLocation: Location }>({
      mutation: deleteRoleMutation,
      variables: {
        id,
      },
    });
  }
}
