import { Slugify } from '../types';
import { BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BuildOptions, CreateOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, HasOneGetAssociationMixin, HasOneSetAssociationMixin } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { ClubPlayerMembership } from './club-player-membership.model';
import { Club } from './club.model';
import { Comment } from './comment.model';
import { EventEntry, Game, GamePlayerMembership } from './event';
import { RankingLastPlace, RankingPlace, RankingPoint } from './ranking';
import { Claim, PlayerClaimMembership, PlayerRoleMembership, Role } from './security';
import { TeamPlayerMembership } from './team-player-membership.model';
import { Team } from './team.model';
import { Notification, Setting } from './personal';
import { TeamMembershipType } from '@badman/utils';
import { Relation } from '../wrapper';
export declare class Player extends Model {
    constructor(values?: Partial<Player>, options?: BuildOptions);
    id: string;
    email?: string;
    phone?: string;
    gender?: 'M' | 'F';
    birthDate?: Date;
    sub?: string;
    myTeams?: Relation<Team[]>;
    entriesP1?: Relation<EventEntry[]>;
    entriesP2?: Relation<EventEntry[]>;
    get entries(): EventEntry[];
    firstName?: string;
    lastName?: string;
    get fullName(): string;
    competitionPlayer?: boolean;
    slug?: string;
    memberId?: string;
    rankingPoints?: RankingPoint[];
    rankingPlaces?: Relation<RankingPlace[]>;
    rankingLastPlaces?: Relation<RankingLastPlace[]>;
    comments?: Relation<Comment[]>;
    notifications?: Relation<Notification[]>;
    teams?: (Team & {
        TeamPlayerMembership: TeamPlayerMembership;
    })[];
    clubs?: (Club & {
        ClubPlayerMembership: ClubPlayerMembership;
    })[];
    games?: (Game & {
        GamePlayerMembership: GamePlayerMembership;
    })[];
    roles?: (Role & {
        PlayerRoleMembership?: PlayerRoleMembership;
    })[];
    claims?: (Claim & {
        PlayerClaimMembership?: PlayerClaimMembership;
    })[];
    permissions?: string[];
    setting?: Relation<Setting>;
    getRankingPoints: HasManyGetAssociationsMixin<RankingPoint>;
    setRankingPoints: HasManySetAssociationsMixin<RankingPoint, string>;
    addRankingPoints: HasManyAddAssociationsMixin<RankingPoint, string>;
    addRankingPoint: HasManyAddAssociationMixin<RankingPoint, string>;
    removeRankingPoint: HasManyRemoveAssociationMixin<RankingPoint, string>;
    removeRankingPoints: HasManyRemoveAssociationsMixin<RankingPoint, string>;
    hasRankingPoint: HasManyHasAssociationMixin<RankingPoint, string>;
    hasRankingPoints: HasManyHasAssociationsMixin<RankingPoint, string>;
    countRankingPoints: HasManyCountAssociationsMixin;
    getRankingPlaces: HasManyGetAssociationsMixin<RankingPlace>;
    setRankingPlaces: HasManySetAssociationsMixin<RankingPlace, string>;
    addRankingPlaces: HasManyAddAssociationsMixin<RankingPlace, string>;
    addRankingPlace: HasManyAddAssociationMixin<RankingPlace, string>;
    removeRankingPlace: HasManyRemoveAssociationMixin<RankingPlace, string>;
    removeRankingPlaces: HasManyRemoveAssociationsMixin<RankingPlace, string>;
    hasRankingPlace: HasManyHasAssociationMixin<RankingPlace, string>;
    hasRankingPlaces: HasManyHasAssociationsMixin<RankingPlace, string>;
    countRankingPlaces: HasManyCountAssociationsMixin;
    getTeams: BelongsToManyGetAssociationsMixin<Team>;
    setTeam: BelongsToManySetAssociationsMixin<Team, string>;
    addTeams: BelongsToManyAddAssociationsMixin<Team, string>;
    addTeam: BelongsToManyAddAssociationMixin<Team, string>;
    removeTeam: BelongsToManyRemoveAssociationMixin<Team, string>;
    removeTeams: BelongsToManyRemoveAssociationsMixin<Team, string>;
    hasTeam: BelongsToManyHasAssociationMixin<Team, string>;
    hasTeams: BelongsToManyHasAssociationsMixin<Team, string>;
    countTeam: BelongsToManyCountAssociationsMixin;
    getGames: BelongsToManyGetAssociationsMixin<Game>;
    setGame: BelongsToManySetAssociationsMixin<Game, string>;
    addGames: BelongsToManyAddAssociationsMixin<Game, string>;
    addGame: BelongsToManyAddAssociationMixin<Game, string>;
    removeGame: BelongsToManyRemoveAssociationMixin<Game, string>;
    removeGames: BelongsToManyRemoveAssociationsMixin<Game, string>;
    hasGame: BelongsToManyHasAssociationMixin<Game, string>;
    hasGames: BelongsToManyHasAssociationsMixin<Game, string>;
    countGame: BelongsToManyCountAssociationsMixin;
    getClubs: BelongsToManyGetAssociationsMixin<Club>;
    setClubs: BelongsToManySetAssociationsMixin<Club, string>;
    addClubs: BelongsToManyAddAssociationsMixin<Club, string>;
    addClub: BelongsToManyAddAssociationMixin<Club, string>;
    removeClub: BelongsToManyRemoveAssociationMixin<Club, string>;
    removeClubs: BelongsToManyRemoveAssociationsMixin<Club, string>;
    hasClub: BelongsToManyHasAssociationMixin<Club, string>;
    hasClubs: BelongsToManyHasAssociationsMixin<Club, string>;
    countClub: BelongsToManyCountAssociationsMixin;
    getClaims: BelongsToManyGetAssociationsMixin<Claim>;
    setClaim: BelongsToManySetAssociationsMixin<Claim, string>;
    addClaims: BelongsToManyAddAssociationsMixin<Claim, string>;
    addClaim: BelongsToManyAddAssociationMixin<Claim, string>;
    removeClaim: BelongsToManyRemoveAssociationMixin<Claim, string>;
    removeClaims: BelongsToManyRemoveAssociationsMixin<Claim, string>;
    hasClaim: BelongsToManyHasAssociationMixin<Claim, string>;
    hasClaims: BelongsToManyHasAssociationsMixin<Claim, string>;
    countClaim: BelongsToManyCountAssociationsMixin;
    getRoles: BelongsToManyGetAssociationsMixin<Role>;
    setRole: BelongsToManySetAssociationsMixin<Role, string>;
    addRoles: BelongsToManyAddAssociationsMixin<Role, string>;
    addRole: BelongsToManyAddAssociationMixin<Role, string>;
    removeRole: BelongsToManyRemoveAssociationMixin<Role, string>;
    removeRoles: BelongsToManyRemoveAssociationsMixin<Role, string>;
    hasRole: BelongsToManyHasAssociationMixin<Role, string>;
    hasRoles: BelongsToManyHasAssociationsMixin<Role, string>;
    countRole: BelongsToManyCountAssociationsMixin;
    getRankingLastPlaces: HasManyGetAssociationsMixin<RankingLastPlace>;
    setRankingLastPlaces: HasManySetAssociationsMixin<RankingLastPlace, string>;
    addRankingLastPlaces: HasManyAddAssociationsMixin<RankingLastPlace, string>;
    addLastRankingPlace: HasManyAddAssociationMixin<RankingLastPlace, string>;
    removeLastRankingPlace: HasManyRemoveAssociationMixin<RankingLastPlace, string>;
    removeRankingLastPlaces: HasManyRemoveAssociationsMixin<RankingLastPlace, string>;
    hasLastRankingPlace: HasManyHasAssociationMixin<RankingLastPlace, string>;
    hasRankingLastPlaces: HasManyHasAssociationsMixin<RankingLastPlace, string>;
    countRankingLastPlaces: HasManyCountAssociationsMixin;
    getSetting: HasOneGetAssociationMixin<Setting>;
    setSetting: HasOneSetAssociationMixin<Setting, string>;
    getComments: HasManyGetAssociationsMixin<Comment>;
    setComments: HasManySetAssociationsMixin<Comment, string>;
    addComments: HasManyAddAssociationsMixin<Comment, string>;
    addComment: HasManyAddAssociationMixin<Comment, string>;
    removeComment: HasManyRemoveAssociationMixin<Comment, string>;
    removeComments: HasManyRemoveAssociationsMixin<Comment, string>;
    hasComment: HasManyHasAssociationMixin<Comment, string>;
    hasComments: HasManyHasAssociationsMixin<Comment, string>;
    countComments: HasManyCountAssociationsMixin;
    getNotifications: HasManyGetAssociationsMixin<Notification>;
    setNotifications: HasManySetAssociationsMixin<Notification, string>;
    addNotifications: HasManyAddAssociationsMixin<Notification, string>;
    addNotification: HasManyAddAssociationMixin<Notification, string>;
    removeNotification: HasManyRemoveAssociationMixin<Notification, string>;
    removeNotifications: HasManyRemoveAssociationsMixin<Notification, string>;
    hasNotification: HasManyHasAssociationMixin<Notification, string>;
    hasNotifications: HasManyHasAssociationsMixin<Notification, string>;
    countNotifications: HasManyCountAssociationsMixin;
    regenerateSlug: Slugify<Player>;
    static forceMemberId(player: Player, options: CreateOptions): Promise<void>;
    getPermissions(): Promise<string[]>;
    getHighsetRanking(system: string, max: number): RankingPlace | null;
    hasAnyPermission(requiredPermissions: string[]): Promise<boolean>;
    hasAllPermission(requiredPermissions: string[]): Promise<boolean>;
}
export declare class PagedPlayer {
    count?: number;
    rows?: Relation<Player[]>;
}
declare const PlayerUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Player, "entries" | "createdAt" | "updatedAt" | "teams" | "rankingPoints" | "myTeams" | "rankingPlaces" | "rankingLastPlaces" | "comments" | "notifications" | "clubs" | "games" | "roles" | "claims" | "setting">>>;
export declare class PlayerUpdateInput extends PlayerUpdateInput_base {
}
declare const PlayerNewInput_base: import("@nestjs/common").Type<Partial<Omit<PlayerUpdateInput, "id">>>;
export declare class PlayerNewInput extends PlayerNewInput_base {
}
declare const PlayerRankingType_base: import("@nestjs/common").Type<Partial<Omit<PlayerUpdateInput, "sub" | "permissions">>>;
export declare class PlayerRankingType extends PlayerRankingType_base {
    single?: number;
    double?: number;
    mix?: number;
}
export declare class PlayerTeamInput {
    id: string;
    membershipType?: Relation<TeamMembershipType>;
}
export {};
