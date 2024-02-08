import { LevelType, UsedRankingTiming } from '@badman/utils';
import { BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Slugify } from '../../../types';
import { Relation } from '../../../wrapper';
import { Role } from '../../security';
import { AvailabilityException } from '../availability.model';
import { Comment } from './../../comment.model';
import { SubEventCompetition } from './sub-event-competition.model';
export declare class EventCompetition extends Model {
    constructor(values?: Partial<EventCompetition>, options?: BuildOptions);
    id: string;
    name?: string;
    season: number;
    lastSync?: Date;
    openDate?: Date;
    closeDate?: Date;
    changeOpenDate?: Date;
    changeCloseDate?: Date;
    changeCloseRequestDate?: Date;
    contactEmail?: string;
    comments?: Relation<Comment[]>;
    roles?: Relation<Role[]>;
    subEventCompetitions?: Relation<SubEventCompetition[]>;
    type: LevelType;
    visualCode?: string;
    started?: boolean;
    slug?: string;
    teamMatcher?: string;
    usedRankingAmount: number;
    usedRankingUnit: 'months' | 'weeks' | 'days';
    get usedRanking(): UsedRankingTiming;
    official: boolean;
    state?: string;
    country?: string;
    checkEncounterForFilledIn?: boolean;
    exceptions?: Relation<EventException[]>;
    infoEvents?: Relation<InfoEvent[]>;
    regenerateSlug: Slugify<EventCompetition>;
    getSubEventCompetitions: HasManyGetAssociationsMixin<SubEventCompetition>;
    setSubEventCompetitions: HasManySetAssociationsMixin<SubEventCompetition, string>;
    addSubEventCompetitions: HasManyAddAssociationsMixin<SubEventCompetition, string>;
    addSubEventCompetition: HasManyAddAssociationMixin<SubEventCompetition, string>;
    removeSubEventCompetition: HasManyRemoveAssociationMixin<SubEventCompetition, string>;
    removeSubEventCompetitions: HasManyRemoveAssociationsMixin<SubEventCompetition, string>;
    hasSubEventCompetition: HasManyHasAssociationMixin<SubEventCompetition, string>;
    hasSubEventCompetitions: HasManyHasAssociationsMixin<SubEventCompetition, string>;
    countSubEventCompetitions: HasManyCountAssociationsMixin;
    getComments: HasManyGetAssociationsMixin<Comment>;
    setComments: HasManySetAssociationsMixin<Comment, string>;
    addComments: HasManyAddAssociationsMixin<Comment, string>;
    addComment: HasManyAddAssociationMixin<Comment, string>;
    removeComment: HasManyRemoveAssociationMixin<Comment, string>;
    removeComments: HasManyRemoveAssociationsMixin<Comment, string>;
    hasComment: HasManyHasAssociationMixin<Comment, string>;
    hasComments: HasManyHasAssociationsMixin<Comment, string>;
    countComments: HasManyCountAssociationsMixin;
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
declare const EventCompetitionUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<EventCompetition, "exceptions" | "createdAt" | "updatedAt" | "subEventCompetitions" | "comments" | "roles" | "infoEvents">>>;
export declare class EventCompetitionUpdateInput extends EventCompetitionUpdateInput_base {
    exceptions?: AvailabilityException[];
    infoEvents?: InfoEvent[];
}
declare const EventCompetitionNewInput_base: import("@nestjs/common").Type<Partial<Omit<EventCompetitionUpdateInput, "id">>>;
export declare class EventCompetitionNewInput extends EventCompetitionNewInput_base {
}
export interface EventException {
    start?: Date;
    end?: Date;
    courts?: number;
}
export interface InfoEvent {
    start?: Date;
    end?: Date;
    name?: string;
}
export {};
