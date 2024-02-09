import { BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Player } from '../player.model';
import { PlayerClaimMembership } from './claim-player-membership.model';
import { RoleClaimMembership } from './claim-role-membership.model';
import { Role } from './role.model';
import { SecurityType } from '@badman/utils';
export declare class Claim extends Model {
    constructor(values?: Partial<Claim>, options?: BuildOptions);
    id: string;
    name?: string;
    description?: string;
    category?: string;
    type?: SecurityType;
    players?: (Player & {
        PlayerClaimMembership?: PlayerClaimMembership;
    })[];
    roles?: (Role & {
        RoleClaimMembership: RoleClaimMembership;
    })[];
    getPlayers: BelongsToManyGetAssociationsMixin<Player>;
    setPlayer: BelongsToManySetAssociationsMixin<Player, string>;
    addPlayers: BelongsToManyAddAssociationsMixin<Player, string>;
    addPlayer: BelongsToManyAddAssociationMixin<Player, string>;
    removePlayer: BelongsToManyRemoveAssociationMixin<Player, string>;
    removePlayers: BelongsToManyRemoveAssociationsMixin<Player, string>;
    hasPlayer: BelongsToManyHasAssociationMixin<Player, string>;
    hasPlayers: BelongsToManyHasAssociationsMixin<Player, string>;
    countPlayer: BelongsToManyCountAssociationsMixin;
    getRoles: BelongsToManyGetAssociationsMixin<Role>;
    setRole: BelongsToManySetAssociationsMixin<Role, string>;
    addRoles: BelongsToManyAddAssociationsMixin<Role, string>;
    addRole: BelongsToManyAddAssociationMixin<Role, string>;
    removeRole: BelongsToManyRemoveAssociationMixin<Role, string>;
    removeRoles: BelongsToManyRemoveAssociationsMixin<Role, string>;
    hasRole: BelongsToManyHasAssociationMixin<Role, string>;
    hasRoles: BelongsToManyHasAssociationsMixin<Role, string>;
    countRole: BelongsToManyCountAssociationsMixin;
}
declare const ClaimUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Claim, "createdAt" | "updatedAt">>>;
export declare class ClaimUpdateInput extends ClaimUpdateInput_base {
}
declare const ClaimNewInput_base: import("@nestjs/common").Type<Partial<Omit<ClaimUpdateInput, "id">>>;
export declare class ClaimNewInput extends ClaimNewInput_base {
}
export {};
