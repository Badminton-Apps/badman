import { RankingPlace } from '../models';
import { PlayerBuilder } from './playerBuilder';
import { SystemBuilder } from './systemBuilder';
export declare class RankingPlaceBuilder {
    private build;
    private rankingPlace;
    constructor(id?: string);
    static Create(id?: string): RankingPlaceBuilder;
    WithRanking(single: number, double: number, mix: number): this;
    WithPlayerId(playerId: string): RankingPlaceBuilder;
    WithSystemId(systemId: string): RankingPlaceBuilder;
    WithDate(date: Date): RankingPlaceBuilder;
    WithUpdatePossible(updatePossible: boolean): RankingPlaceBuilder;
    ForSystem(system: SystemBuilder): RankingPlaceBuilder;
    ForPlayer(player: PlayerBuilder): RankingPlaceBuilder;
    Build(rebuild?: boolean): Promise<RankingPlace>;
}
