import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { EncounterCompetition, EventCompetition, EventTournament } from '../event';
import { Player } from '../player.model';
import { Club } from '../club.model';
import { Relation } from '../../wrapper';
export declare class Notification extends Model {
    constructor(values?: Partial<Notification>, options?: BuildOptions);
    id: string;
    sendTo?: Relation<Player>;
    sendToId?: string;
    type?: string;
    linkId?: string;
    linkType?: string;
    encounter?: Relation<EncounterCompetition>;
    competition?: Relation<EventCompetition>;
    tournament?: Relation<EventTournament>;
    club?: Relation<Club>;
    read?: boolean;
    meta?: string;
    getEncounter: BelongsToGetAssociationMixin<EncounterCompetition>;
    setEncounter: BelongsToSetAssociationMixin<EncounterCompetition, string>;
    getCompetition: BelongsToGetAssociationMixin<EventCompetition>;
    setCompetition: BelongsToSetAssociationMixin<EventCompetition, string>;
    getTournament: BelongsToGetAssociationMixin<EventTournament>;
    setTournament: BelongsToSetAssociationMixin<EventTournament, string>;
    getClub: BelongsToGetAssociationMixin<Club>;
    setClub: BelongsToSetAssociationMixin<Club, string>;
}
declare const NotificationUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Notification, "tournament" | "competition" | "createdAt" | "updatedAt" | "club" | "encounter" | "sendTo">>>;
export declare class NotificationUpdateInput extends NotificationUpdateInput_base {
}
export {};
