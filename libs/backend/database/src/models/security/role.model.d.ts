import { BelongsToGetAssociationMixin, BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BelongsToSetAssociationMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Club } from '../club.model';
import { EventCompetition, EventTournament } from '../event';
import { Player } from '../player.model';
import { Team } from '../team.model';
import { RoleClaimMembership } from './claim-role-membership.model';
import { Claim } from './claim.model';
import { PlayerRoleMembership } from './role-player-membership.model';
import { Relation } from '../../wrapper';
export declare class Role extends Model {
    constructor(values?: Partial<Role>, options?: BuildOptions);
    id: string;
    name?: string;
    description?: string;
    locked?: boolean;
    claims?: (Claim & {
        RoleClaimMembership: RoleClaimMembership;
    })[];
    players?: (Player & {
        PlayerClaimMembership?: PlayerRoleMembership;
    })[];
    club?: Relation<Club>;
    team?: Relation<Team>;
    competition?: Relation<EventCompetition>;
    tournament?: Relation<EventTournament>;
    linkId?: string;
    linkType?: string;
    getClaims: BelongsToManyGetAssociationsMixin<Claim>;
    setClaims: BelongsToManySetAssociationsMixin<Claim, string>;
    addClaims: BelongsToManyAddAssociationsMixin<Claim, string>;
    addClaim: BelongsToManyAddAssociationMixin<Claim, string>;
    removeClaim: BelongsToManyRemoveAssociationMixin<Claim, string>;
    removeClaims: BelongsToManyRemoveAssociationsMixin<Claim, string>;
    hasClaim: BelongsToManyHasAssociationMixin<Claim, string>;
    hasClaims: BelongsToManyHasAssociationsMixin<Claim, string>;
    countClaim: BelongsToManyCountAssociationsMixin;
    getPlayers: BelongsToManyGetAssociationsMixin<Player>;
    setPlayer: BelongsToManySetAssociationsMixin<Player, string>;
    addPlayers: BelongsToManyAddAssociationsMixin<Player, string>;
    addPlayer: BelongsToManyAddAssociationMixin<Player, string>;
    removePlayer: BelongsToManyRemoveAssociationMixin<Player, string>;
    removePlayers: BelongsToManyRemoveAssociationsMixin<Player, string>;
    hasPlayer: BelongsToManyHasAssociationMixin<Player, string>;
    hasPlayers: BelongsToManyHasAssociationsMixin<Player, string>;
    countPlayer: BelongsToManyCountAssociationsMixin;
    getClub: BelongsToGetAssociationMixin<Club>;
    setClub: BelongsToSetAssociationMixin<Club, string>;
    getTeam: BelongsToGetAssociationMixin<Team>;
    setTeam: BelongsToSetAssociationMixin<Team, string>;
    getCompetition: BelongsToGetAssociationMixin<EventCompetition>;
    setCompetition: BelongsToSetAssociationMixin<EventCompetition, string>;
    getTournament: BelongsToGetAssociationMixin<EventTournament>;
    setTournament: BelongsToSetAssociationMixin<EventTournament, string>;
}
declare const RoleUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Role, "createdAt" | "updatedAt" | "claims">>>;
export declare class RoleUpdateInput extends RoleUpdateInput_base {
    claims?: Relation<Claim[]>;
}
declare const RoleNewInput_base: import("@nestjs/common").Type<Partial<Omit<RoleUpdateInput, "id">>>;
export declare class RoleNewInput extends RoleNewInput_base {
}
export {};
