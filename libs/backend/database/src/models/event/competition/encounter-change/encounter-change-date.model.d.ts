import { ChangeEncounterAvailability } from '@badman/utils';
import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Relation } from '../../../../wrapper';
import { Location } from '../../location.model';
import { EncounterChange } from './encounter-change.model';
export declare class EncounterChangeDate extends Model {
    constructor(values?: Partial<EncounterChangeDate>, options?: BuildOptions);
    id: string;
    selected?: boolean;
    encounterChange?: Relation<EncounterChange>;
    encounterChangeId?: string;
    date?: Date;
    availabilityHome?: ChangeEncounterAvailability;
    availabilityAway?: ChangeEncounterAvailability;
    location?: Relation<Location>;
    locationId?: string;
    getEncounterChange: BelongsToGetAssociationMixin<EncounterChange>;
    setEncounterChange: BelongsToSetAssociationMixin<EncounterChange, string>;
    getLocation: BelongsToGetAssociationMixin<Location>;
    setLocation: BelongsToSetAssociationMixin<Location, string>;
}
declare const EncounterChangeDateUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<EncounterChangeDate, "location" | "createdAt" | "updatedAt" | "encounterChange">>>;
export declare class EncounterChangeDateUpdateInput extends EncounterChangeDateUpdateInput_base {
}
declare const EncounterChangeDateNewInput_base: import("@nestjs/common").Type<Partial<Omit<EncounterChangeDateUpdateInput, "id">>>;
export declare class EncounterChangeDateNewInput extends EncounterChangeDateNewInput_base {
}
export {};
