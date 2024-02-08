import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Relation } from '../../wrapper';
import { Location } from './location.model';
export declare class Availability extends Model {
    constructor(values?: Partial<Availability>, options?: BuildOptions);
    id: string;
    season?: number;
    days?: Relation<AvailabilityDay[]>;
    exceptions?: Relation<AvailabilityException[]>;
    location?: Relation<Location>;
    locationId?: string;
    getLocation: BelongsToGetAssociationMixin<Location>;
    setLocation: BelongsToSetAssociationMixin<Location, string>;
}
export interface AvailabilityException {
    start?: Date;
    end?: Date;
    courts?: number;
}
export interface AvailabilityDay {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime?: string;
    endTime?: string;
    courts?: number;
}
declare const AvailabilityUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Availability, "days" | "exceptions" | "location" | "createdAt" | "updatedAt">>>;
export declare class AvailabilityUpdateInput extends AvailabilityUpdateInput_base {
    days?: Relation<AvailabilityDay[]>;
    exceptions?: AvailabilityException[];
}
declare const AvailabilityNewInput_base: import("@nestjs/common").Type<Partial<Omit<AvailabilityUpdateInput, "id">>>;
export declare class AvailabilityNewInput extends AvailabilityNewInput_base {
}
export {};
