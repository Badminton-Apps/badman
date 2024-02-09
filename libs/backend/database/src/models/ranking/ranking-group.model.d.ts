import { BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { SubEventCompetition, SubEventTournament } from '../event';
import { RankingSystem } from './ranking-system.model';
import { Relation } from '../../wrapper';
export declare class RankingGroup extends Model {
    constructor(values?: Partial<RankingGroup>, options?: BuildOptions);
    id: string;
    name?: string;
    subEventCompetitions?: Relation<SubEventCompetition[]>;
    subEventTournaments?: Relation<SubEventTournament[]>;
    rankingSystems?: Relation<RankingSystem[]>;
    getSubEventTournaments: BelongsToManyGetAssociationsMixin<SubEventTournament>;
    setSubEventTournaments: BelongsToManySetAssociationsMixin<SubEventTournament, string>;
    addSubEventTournaments: BelongsToManyAddAssociationsMixin<SubEventTournament, string>;
    addSubEventTournament: BelongsToManyAddAssociationMixin<SubEventTournament, string>;
    removeSubEventTournament: BelongsToManyRemoveAssociationMixin<SubEventTournament, string>;
    removeSubEventTournaments: BelongsToManyRemoveAssociationsMixin<SubEventTournament, string>;
    hasSubEventTournament: BelongsToManyHasAssociationMixin<SubEventTournament, string>;
    hasSubEventTournaments: BelongsToManyHasAssociationsMixin<SubEventTournament, string>;
    countSubEventTournament: BelongsToManyCountAssociationsMixin;
    getSubEventCompetitions: BelongsToManyGetAssociationsMixin<SubEventCompetition>;
    setSubEventCompetitions: BelongsToManySetAssociationsMixin<SubEventCompetition, string>;
    addSubEventCompetitions: BelongsToManyAddAssociationsMixin<SubEventCompetition, string>;
    addSubEventCompetition: BelongsToManyAddAssociationMixin<SubEventCompetition, string>;
    removeSubEventCompetition: BelongsToManyRemoveAssociationMixin<SubEventCompetition, string>;
    removeSubEventCompetitions: BelongsToManyRemoveAssociationsMixin<SubEventCompetition, string>;
    hasSubEventCompetition: BelongsToManyHasAssociationMixin<SubEventCompetition, string>;
    hasSubEventCompetitions: BelongsToManyHasAssociationsMixin<SubEventCompetition, string>;
    countSubEventCompetition: BelongsToManyCountAssociationsMixin;
    getRankingSystems: BelongsToManyGetAssociationsMixin<RankingSystem>;
    setRankingSystems: BelongsToManySetAssociationsMixin<RankingSystem, string>;
    addRankingSystems: BelongsToManyAddAssociationsMixin<RankingSystem, string>;
    addRankingSystem: BelongsToManyAddAssociationMixin<RankingSystem, string>;
    removeRankingSystem: BelongsToManyRemoveAssociationMixin<RankingSystem, string>;
    removeRankingSystems: BelongsToManyRemoveAssociationsMixin<RankingSystem, string>;
    hasRankingSystem: BelongsToManyHasAssociationMixin<RankingSystem, string>;
    hasRankingSystems: BelongsToManyHasAssociationsMixin<RankingSystem, string>;
    countRankingSystem: BelongsToManyCountAssociationsMixin;
}
