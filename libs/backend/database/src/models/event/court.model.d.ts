import { Model } from 'sequelize-typescript';
import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import { Game } from './game.model';
import { Location } from './location.model';
import { Relation } from '../../wrapper';
export declare class Court extends Model {
    constructor(values?: Partial<Court>, options?: BuildOptions);
    id: string;
    name?: string;
    games?: Relation<Game[]>;
    location?: Relation<Location>;
    locationId?: string;
    getGames: HasManyGetAssociationsMixin<Game>;
    setGames: HasManySetAssociationsMixin<Game, string>;
    addGames: HasManyAddAssociationsMixin<Game, string>;
    addGame: HasManyAddAssociationMixin<Game, string>;
    removeGame: HasManyRemoveAssociationMixin<Game, string>;
    removeGames: HasManyRemoveAssociationsMixin<Game, string>;
    hasGame: HasManyHasAssociationMixin<Game, string>;
    hasGames: HasManyHasAssociationsMixin<Game, string>;
    countGames: HasManyCountAssociationsMixin;
    getLocation: BelongsToGetAssociationMixin<Location>;
    setLocation: BelongsToSetAssociationMixin<Location, string>;
}
