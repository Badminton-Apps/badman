import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Game } from '../event';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';
import { Relation } from '../../wrapper';
export declare class RankingPoint extends Model {
    constructor(values?: Partial<RankingPoint>, options?: BuildOptions);
    id: string;
    points?: number;
    player?: Relation<Player>;
    game?: Relation<Game>;
    system?: Relation<RankingSystem>;
    rankingDate?: Date;
    differenceInLevel?: number;
    systemId?: string;
    playerId?: string;
    gameId?: string;
    getPlayer: BelongsToGetAssociationMixin<Player>;
    setPlayer: BelongsToSetAssociationMixin<Player, string>;
    getGame: BelongsToGetAssociationMixin<Game>;
    setGame: BelongsToSetAssociationMixin<Game, string>;
    getSystem: BelongsToGetAssociationMixin<RankingSystem>;
    setSystem: BelongsToSetAssociationMixin<RankingSystem, string>;
}
