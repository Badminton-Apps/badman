import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';
import { Relation } from '../../wrapper';
export declare class RankingLastPlace extends Model {
    constructor(values?: Partial<RankingLastPlace>, options?: BuildOptions);
    id: string;
    rankingDate?: Date;
    gender?: string;
    singlePoints?: number;
    mixPoints?: number;
    doublePoints?: number;
    singlePointsDowngrade?: number;
    mixPointsDowngrade?: number;
    doublePointsDowngrade?: number;
    singleRank?: number;
    mixRank?: number;
    doubleRank?: number;
    totalSingleRanking?: number;
    totalMixRanking?: number;
    totalDoubleRanking?: number;
    totalWithinSingleLevel?: number;
    totalWithinMixLevel?: number;
    totalWithinDoubleLevel?: number;
    single?: number;
    mix?: number;
    double?: number;
    singleInactive?: boolean;
    mixInactive?: boolean;
    doubleInactive?: boolean;
    playerId?: string;
    systemId?: string;
    player?: Relation<Player>;
    rankingSystem?: Relation<RankingSystem>;
    getPlayer: BelongsToGetAssociationMixin<Player>;
    setPlayer: BelongsToSetAssociationMixin<Player, string>;
    getRankingSystem: BelongsToGetAssociationMixin<RankingSystem>;
    setRankingSystem: BelongsToSetAssociationMixin<RankingSystem, string>;
}
export declare class PagedRankingLastPlaces {
    count?: number;
    rows?: Relation<RankingLastPlace[]>;
}
