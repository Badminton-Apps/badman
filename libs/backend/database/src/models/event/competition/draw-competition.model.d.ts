import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { EventEntry } from '../entry.model';
import { EncounterCompetition } from './encounter-competition.model';
import { SubEventCompetition } from './sub-event-competition.model';
import { DrawType } from '@badman/utils';
import { Relation } from '../../../wrapper';
export declare class DrawCompetition extends Model {
    constructor(values?: Partial<DrawCompetition>, options?: BuildOptions);
    id: string;
    name: string;
    visualCode?: string;
    type: DrawType;
    size?: number;
    risers?: number;
    fallers?: number;
    subEventCompetition?: Relation<SubEventCompetition>;
    subeventId?: string;
    encounterCompetitions?: EncounterCompetition[];
    entries?: Relation<EventEntry[]>;
    getSubEventCompetition: BelongsToGetAssociationMixin<SubEventCompetition>;
    setSubEventCompetition: BelongsToSetAssociationMixin<SubEventCompetition, string>;
    getEncounterCompetitions: HasManyGetAssociationsMixin<EncounterCompetition>;
    setEncounterCompetitions: HasManySetAssociationsMixin<EncounterCompetition, string>;
    addEncounterCompetitions: HasManyAddAssociationsMixin<EncounterCompetition, string>;
    addEncounterCompetition: HasManyAddAssociationMixin<EncounterCompetition, string>;
    removeEncounterCompetition: HasManyRemoveAssociationMixin<EncounterCompetition, string>;
    removeEncounterCompetitions: HasManyRemoveAssociationsMixin<EncounterCompetition, string>;
    hasEncounter: HasManyHasAssociationMixin<EncounterCompetition, string>;
    hasEncounterCompetitions: HasManyHasAssociationsMixin<EncounterCompetition, string>;
    countEncounterCompetitions: HasManyCountAssociationsMixin;
    getEntries: HasManyGetAssociationsMixin<EventEntry>;
    setEntries: HasManySetAssociationsMixin<EventEntry, string>;
    addEntries: HasManyAddAssociationsMixin<EventEntry, string>;
    addEntry: HasManyAddAssociationMixin<EventEntry, string>;
    removeEntries: HasManyRemoveAssociationMixin<EventEntry, string>;
    removeEntry: HasManyRemoveAssociationsMixin<EventEntry, string>;
    hasEntries: HasManyHasAssociationMixin<EventEntry, string>;
    hasEntry: HasManyHasAssociationsMixin<EventEntry, string>;
    countEntries: HasManyCountAssociationsMixin;
}
declare const DrawCompetitionUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<DrawCompetition, "createdAt" | "updatedAt" | "subEventCompetition">>>;
export declare class DrawCompetitionUpdateInput extends DrawCompetitionUpdateInput_base {
}
declare const DrawCompetitionNewInput_base: import("@nestjs/common").Type<Partial<Omit<DrawCompetitionUpdateInput, "id">>>;
export declare class DrawCompetitionNewInput extends DrawCompetitionNewInput_base {
}
export {};
