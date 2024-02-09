import { RankingLastPlace } from '../models';
import { PlayerBuilder } from './playerBuilder';
import { SystemBuilder } from './systemBuilder';
export declare class RankingLastPlaceBuilder {
    private build;
    private rankingLastPlace;
    constructor(id?: string);
    static Create(id?: string): RankingLastPlaceBuilder;
    WithRanking(single: number, double: number, mix: number): this;
    WithPlayerId(playerId: string): RankingLastPlaceBuilder;
    WithSystemId(systemId: string): RankingLastPlaceBuilder;
    WithDate(date: Date): RankingLastPlaceBuilder;
    ForSystem(system: SystemBuilder): RankingLastPlaceBuilder;
    ForPlayer(player: PlayerBuilder): RankingLastPlaceBuilder;
    Build(rebuild?: boolean): Promise<RankingLastPlace>;
}
