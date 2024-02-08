import { Club, ClubPlayerMembership, GamePlayerMembership, Player, RankingPlace, TeamPlayerMembership } from './models';
declare const GamePlayerMembershipType_base: import("@nestjs/common").Type<Omit<GamePlayerMembership, "id"> & Player>;
export declare class GamePlayerMembershipType extends GamePlayerMembershipType_base {
    rankingPlace?: RankingPlace;
}
declare const ClubPlayerMembershipType_base: import("@nestjs/common").Type<Omit<ClubPlayerMembership, "id"> & Club>;
export declare class ClubPlayerMembershipType extends ClubPlayerMembershipType_base {
}
declare const TeamPlayerMembershipType_base: import("@nestjs/common").Type<Omit<TeamPlayerMembership, "id"> & Player>;
export declare class TeamPlayerMembershipType extends TeamPlayerMembershipType_base {
}
export {};
