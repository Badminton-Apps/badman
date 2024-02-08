import { Player } from './player.model';
import { EventCompetition } from './event/competition/event-competition.model';
import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { EncounterCompetition } from './event';
import { Club } from './club.model';
import { Relation } from '../wrapper';
export declare class Comment extends Model {
    constructor(values?: Partial<Comment>, options?: BuildOptions);
    id: string;
    message?: string;
    player?: Relation<Player>;
    playerId?: string;
    club?: Relation<Club>;
    clubId?: string;
    competition?: Relation<EventCompetition>;
    encounter?: Relation<EncounterCompetition>;
    linkId?: string;
    linkType?: string;
    getCompetition: BelongsToGetAssociationMixin<EventCompetition>;
    setCompetition: BelongsToSetAssociationMixin<EventCompetition, string>;
    getPlayer: BelongsToGetAssociationMixin<Player>;
    setPlayer: BelongsToSetAssociationMixin<Player, string>;
}
declare const CommentUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Comment, "competition" | "createdAt" | "updatedAt" | "club" | "encounter">>>;
export declare class CommentUpdateInput extends CommentUpdateInput_base {
}
declare const CommentNewInput_base: import("@nestjs/common").Type<Partial<Omit<CommentUpdateInput, "id">>>;
export declare class CommentNewInput extends CommentNewInput_base {
}
export {};
