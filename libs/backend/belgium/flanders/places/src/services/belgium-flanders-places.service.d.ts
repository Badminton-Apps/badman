import { Player, RankingSystem } from '@badman/backend-database';
import { Transaction } from 'sequelize';
export declare class BelgiumFlandersPlacesService {
    newPlaceForPlayer(player: Player, system: RankingSystem, stop: Date, start: Date, options: {
        updateRanking?: boolean | undefined;
        transaction?: Transaction | undefined;
    } | undefined): Promise<void>;
    private _getNewPlace;
    private _getGames;
    private _isInactive;
    private _calculatePoints;
    private _findPointsAverage;
    private _findRanking;
}
