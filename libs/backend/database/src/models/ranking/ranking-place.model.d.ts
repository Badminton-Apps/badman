import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions, DestroyOptions, SaveOptions, UpdateOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Player } from '../player.model';
import { RankingLastPlace } from './ranking-last-place.model';
import { RankingSystem } from './ranking-system.model';
import { Relation } from '../../wrapper';
export declare class RankingPlace extends Model {
    constructor(values?: Partial<RankingPlace>, options?: BuildOptions);
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
    updatePossible?: boolean;
    playerId?: string;
    systemId?: string;
    player?: Relation<Player>;
    rankingSystem?: Relation<RankingSystem>;
    getPlayer: BelongsToGetAssociationMixin<Player>;
    setPlayer: BelongsToSetAssociationMixin<Player, string>;
    getRankingSystem: BelongsToGetAssociationMixin<RankingSystem>;
    setRankingSystem: BelongsToSetAssociationMixin<RankingSystem, string>;
    static updateLatestRankingsUpdates(instances: RankingPlace[] | RankingPlace, options: UpdateOptions): Promise<void>;
    static addEmptyValues(instances: RankingPlace[] | RankingPlace, options: SaveOptions): Promise<void>;
    static updateGames(instances: RankingPlace[] | RankingPlace, options: UpdateOptions): Promise<void>;
    static updateLatestRankingsCreate(instances: RankingPlace[] | RankingPlace, options: SaveOptions): Promise<void>;
    static updateLatestRankingsDestroy(instances: RankingPlace[] | RankingPlace, options: DestroyOptions): Promise<void>;
    static updateLatestRankings(instances: RankingPlace[], options: SaveOptions | UpdateOptions, type: 'create' | 'update' | 'destroy'): Promise<void>;
    static updateGameRanking(instances: RankingPlace[], options: UpdateOptions): Promise<void>;
    asLastRankingPlace(): Partial<RankingLastPlace>;
}
declare const RankingPlaceUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<RankingPlace, "player" | "createdAt" | "updatedAt" | "rankingSystem">>>;
export declare class RankingPlaceUpdateInput extends RankingPlaceUpdateInput_base {
}
declare const RankingPlaceNewInput_base: import("@nestjs/common").Type<Partial<Omit<RankingPlaceUpdateInput, "id">>>;
export declare class RankingPlaceNewInput extends RankingPlaceNewInput_base {
}
export {};
