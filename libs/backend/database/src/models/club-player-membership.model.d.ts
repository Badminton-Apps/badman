import { Model } from 'sequelize-typescript';
import { ClubMembershipType } from '@badman/utils';
import { BuildOptions } from 'sequelize';
import { Club } from './club.model';
import { Player } from './player.model';
import { Relation } from '../wrapper';
export declare class ClubPlayerMembership extends Model {
    constructor(values?: Partial<ClubPlayerMembership>, options?: BuildOptions);
    id: string;
    playerId?: string;
    clubId?: string;
    club?: Relation<Club>;
    player?: Relation<Player>;
    end?: Date;
    active?: boolean;
    membershipType?: Relation<ClubMembershipType>;
    start?: Date;
}
declare const ClubPlayerMembershipUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<ClubPlayerMembership, "createdAt" | "updatedAt">>>;
export declare class ClubPlayerMembershipUpdateInput extends ClubPlayerMembershipUpdateInput_base {
}
declare const ClubPlayerMembershipNewInput_base: import("@nestjs/common").Type<Partial<Omit<ClubPlayerMembershipUpdateInput, "id">>>;
export declare class ClubPlayerMembershipNewInput extends ClubPlayerMembershipNewInput_base {
}
export {};
