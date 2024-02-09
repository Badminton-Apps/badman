import { BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
export declare class GamePlayerMembership extends Model {
    constructor(values?: Partial<GamePlayerMembership>, options?: BuildOptions);
    playerId?: string;
    gameId?: string;
    systemId?: string;
    team?: number;
    player?: number;
    single?: number;
    double?: number;
    mix?: number;
}
