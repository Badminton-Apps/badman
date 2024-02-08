import { BuildOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { EventEntry } from './entry.model';
import { Relation } from '../../wrapper';
export declare class Standing extends Model {
    constructor(values?: Partial<Standing>, options?: BuildOptions);
    id: string;
    entry?: Relation<EventEntry>;
    entryId?: string;
    position?: number;
    size?: number;
    points: number;
    played: number;
    gamesWon: number;
    gamesLost: number;
    setsWon: number;
    setsLost: number;
    totalPointsWon: number;
    totalPointsLost: number;
    riser: boolean;
    faller: boolean;
    /**
     * Competition: encounters won
     * Tournament: Ignored
     */
    won: number;
    /**
     * Competition: encounters draw
     * Tournament: Ignored
     */
    tied: number;
    /**
     * Competition: encounters lost
     * Tournament: Ignored
     */
    lost: number;
    restartCount(): void;
}
