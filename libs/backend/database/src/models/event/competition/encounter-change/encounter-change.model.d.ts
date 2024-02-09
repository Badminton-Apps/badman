import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Relation } from '../../../../wrapper';
import { EncounterCompetition } from '../encounter-competition.model';
import { EncounterChangeDate } from './encounter-change-date.model';
export declare class EncounterChange extends Model {
    constructor(values?: Partial<EncounterChange>, options?: BuildOptions);
    id: string;
    accepted?: boolean;
    encounter?: Relation<EncounterCompetition>;
    encounterId?: string;
    dates?: Relation<EncounterChangeDate[]>;
    getEncounter: BelongsToGetAssociationMixin<EncounterCompetition>;
    setEncounter: BelongsToSetAssociationMixin<EncounterCompetition, string>;
    getDates: HasManyGetAssociationsMixin<EncounterChangeDate>;
    setDates: HasManySetAssociationsMixin<EncounterChangeDate, string>;
    addDates: HasManyAddAssociationsMixin<EncounterChangeDate, string>;
    addDate: HasManyAddAssociationMixin<EncounterChangeDate, string>;
    removeDate: HasManyRemoveAssociationMixin<EncounterChangeDate, string>;
    removeDates: HasManyRemoveAssociationsMixin<EncounterChangeDate, string>;
    hasDate: HasManyHasAssociationMixin<EncounterChangeDate, string>;
    hasDates: HasManyHasAssociationsMixin<EncounterChangeDate, string>;
    countDates: HasManyCountAssociationsMixin;
}
declare const EncounterChangeUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<EncounterChange, "createdAt" | "updatedAt" | "dates">>>;
export declare class EncounterChangeUpdateInput extends EncounterChangeUpdateInput_base {
    home?: boolean;
    dates?: Relation<EncounterChangeDate[]>;
}
declare const EncounterChangeNewInput_base: import("@nestjs/common").Type<Partial<Omit<EncounterChangeUpdateInput, "id" | "dates">>>;
export declare class EncounterChangeNewInput extends EncounterChangeNewInput_base {
    dates?: Relation<EncounterChangeDate[]>;
}
export {};
