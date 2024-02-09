import { Game, RankingPoint, RankingSystem } from '@badman/backend-database';
import { Transaction } from 'sequelize';
export declare class BelgiumFlandersPointsService {
    createRankingPointforGame(system: RankingSystem, game: Game, options?: {
        transaction?: Transaction;
    }): Promise<RankingPoint[]>;
    private _getPointsForGame;
    private _getWinningPoints;
    private _getPlayersForGame;
}
