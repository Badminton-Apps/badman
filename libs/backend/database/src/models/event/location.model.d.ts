import { BelongsToGetAssociationMixin, BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BelongsToSetAssociationMixin, BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Club } from '../club.model';
import { Team } from '../team.model';
import { Availability } from './availability.model';
import { Court } from './court.model';
import { EventTournament } from './tournament';
import type { Point } from 'geojson';
import { Relation } from '../../wrapper';
export declare class Location extends Model {
    constructor(values?: Partial<Location>, options?: BuildOptions);
    id: string;
    name?: string;
    address?: string;
    street?: string;
    streetNumber?: string;
    postalcode?: string;
    city?: string;
    state?: string;
    phone?: string;
    fax?: string;
    coordinates?: Point;
    teams?: Relation<Team[]>;
    eventTournaments?: Relation<EventTournament[]>;
    courts?: Court;
    club?: Relation<Club>;
    clubId?: string;
    availabilities?: Availability[];
    getAvailabilities: HasManyGetAssociationsMixin<Availability>;
    setAvailabilities: HasManySetAssociationsMixin<Availability, string>;
    addAvailabilities: HasManyAddAssociationsMixin<Availability, string>;
    addAvailability: HasManyAddAssociationMixin<Availability, string>;
    removeAvailability: HasManyRemoveAssociationMixin<Availability, string>;
    removeAvailabilities: HasManyRemoveAssociationsMixin<Availability, string>;
    hasAvailability: HasManyHasAssociationMixin<Availability, string>;
    hasAvailabilities: HasManyHasAssociationsMixin<Availability, string>;
    countAvailabilities: HasManyCountAssociationsMixin;
    getTeams: BelongsToManyGetAssociationsMixin<Team>;
    setTeams: BelongsToManySetAssociationsMixin<Team, string>;
    addTeams: BelongsToManyAddAssociationsMixin<Team, string>;
    addTeam: BelongsToManyAddAssociationMixin<Team, string>;
    removeTeam: BelongsToManyRemoveAssociationMixin<Team, string>;
    removeTeams: BelongsToManyRemoveAssociationsMixin<Team, string>;
    hasTeam: BelongsToManyHasAssociationMixin<Team, string>;
    hasTeams: BelongsToManyHasAssociationsMixin<Team, string>;
    countTeam: BelongsToManyCountAssociationsMixin;
    getEventTournaments: BelongsToManyGetAssociationsMixin<EventTournament>;
    setEventTournaments: BelongsToManySetAssociationsMixin<EventTournament, string>;
    addEventTournaments: BelongsToManyAddAssociationsMixin<EventTournament, string>;
    addEventTournament: BelongsToManyAddAssociationMixin<EventTournament, string>;
    removeEventTournament: BelongsToManyRemoveAssociationMixin<EventTournament, string>;
    removeEventTournaments: BelongsToManyRemoveAssociationsMixin<EventTournament, string>;
    hasEventTournament: BelongsToManyHasAssociationMixin<EventTournament, string>;
    hasEventTournaments: BelongsToManyHasAssociationsMixin<EventTournament, string>;
    countEventTournament: BelongsToManyCountAssociationsMixin;
    getCourts: HasManyGetAssociationsMixin<Court>;
    setCourts: HasManySetAssociationsMixin<Court, string>;
    addCourts: HasManyAddAssociationsMixin<Court, string>;
    addCourt: HasManyAddAssociationMixin<Court, string>;
    removeCourt: HasManyRemoveAssociationMixin<Court, string>;
    removeCourts: HasManyRemoveAssociationsMixin<Court, string>;
    hasCourt: HasManyHasAssociationMixin<Court, string>;
    hasCourts: HasManyHasAssociationsMixin<Court, string>;
    countCourts: HasManyCountAssociationsMixin;
    getClub: BelongsToGetAssociationMixin<Club>;
    setClub: BelongsToSetAssociationMixin<Club, string>;
}
export declare class PointInput {
    longitude?: number;
    latitude?: number;
}
declare const LocationUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<Location, "createdAt" | "updatedAt" | "coordinates">>>;
export declare class LocationUpdateInput extends LocationUpdateInput_base {
    coordinates?: {
        longitude?: number;
        latitude?: number;
    };
}
declare const LocationNewInput_base: import("@nestjs/common").Type<Partial<Omit<LocationUpdateInput, "id">>>;
export declare class LocationNewInput extends LocationNewInput_base {
}
export {};
