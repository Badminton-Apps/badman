import { Model } from 'sequelize-typescript';
import { BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import { Slugify } from '../../../types';
import { Role } from '../../security';
import { Location } from '../location.model';
import { SubEventTournament } from './sub-event-tournament.model';
import { Relation } from '../../../wrapper';
export declare class EventTournament extends Model {
    constructor(values?: Partial<EventTournament>, options?: BuildOptions);
    id: string;
    tournamentNumber?: string;
    name?: string;
    firstDay?: Date;
    lastSync?: Date;
    openDate?: Date;
    closeDate?: Date;
    dates?: string;
    locations?: Relation<Location[]>;
    subEventTournaments?: Relation<SubEventTournament[]>;
    visualCode?: string;
    slug?: string;
    official?: boolean;
    state?: string;
    country?: string;
    roles?: Relation<Role[]>;
    regenerateSlug: Slugify<EventTournament>;
    getSubEventTournaments: HasManyGetAssociationsMixin<SubEventTournament>;
    setSubEventTournaments: HasManySetAssociationsMixin<SubEventTournament, string>;
    addSubEventTournaments: HasManyAddAssociationsMixin<SubEventTournament, string>;
    addsubEventTournament: HasManyAddAssociationMixin<SubEventTournament, string>;
    removesubEventTournament: HasManyRemoveAssociationMixin<SubEventTournament, string>;
    removeSubEventTournaments: HasManyRemoveAssociationsMixin<SubEventTournament, string>;
    hassubEventTournament: HasManyHasAssociationMixin<SubEventTournament, string>;
    hasSubEventTournaments: HasManyHasAssociationsMixin<SubEventTournament, string>;
    countSubEventTournaments: HasManyCountAssociationsMixin;
    getLocations: BelongsToManyGetAssociationsMixin<Location>;
    setLocations: BelongsToManySetAssociationsMixin<Location, string>;
    addLocations: BelongsToManyAddAssociationsMixin<Location, string>;
    addLocation: BelongsToManyAddAssociationMixin<Location, string>;
    removeLocation: BelongsToManyRemoveAssociationMixin<Location, string>;
    removeLocations: BelongsToManyRemoveAssociationsMixin<Location, string>;
    hasLocation: BelongsToManyHasAssociationMixin<Location, string>;
    hasLocations: BelongsToManyHasAssociationsMixin<Location, string>;
    countLocation: BelongsToManyCountAssociationsMixin;
    getRoles: HasManyGetAssociationsMixin<Role>;
    setRoles: HasManySetAssociationsMixin<Role, string>;
    addRoles: HasManyAddAssociationsMixin<Role, string>;
    addRole: HasManyAddAssociationMixin<Role, string>;
    removeRole: HasManyRemoveAssociationMixin<Role, string>;
    removeRoles: HasManyRemoveAssociationsMixin<Role, string>;
    hasRole: HasManyHasAssociationMixin<Role, string>;
    hasRoles: HasManyHasAssociationsMixin<Role, string>;
    countRoles: HasManyCountAssociationsMixin;
}
declare const EventTournamentUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<EventTournament, "createdAt" | "updatedAt" | "roles">>>;
export declare class EventTournamentUpdateInput extends EventTournamentUpdateInput_base {
}
declare const EventTournamentNewInput_base: import("@nestjs/common").Type<Partial<Omit<EventTournamentUpdateInput, "id">>>;
export declare class EventTournamentNewInput extends EventTournamentNewInput_base {
}
export {};
