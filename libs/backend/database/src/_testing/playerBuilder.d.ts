import { TeamMembershipType } from '@badman/utils';
import { Player } from '../models';
import { RankingPlaceBuilder } from './rankingPlaceBuilder';
import { TeamBuilder } from './teamBuilder';
import { RankingLastPlaceBuilder } from './rankingLastPlaceBuilder';
export declare class PlayerBuilder {
    private build;
    private player;
    private rankingPlaces;
    private lastRankingPlaces;
    constructor(id?: string);
    static Create(id?: string): PlayerBuilder;
    WithRanking(rankingPlace: RankingPlaceBuilder): PlayerBuilder;
    WithLastRanking(rankingPlace: RankingLastPlaceBuilder): PlayerBuilder;
    WithName(firstName: string, lastName: string): PlayerBuilder;
    WithCompetitionStatus(status: boolean): PlayerBuilder;
    WithGender(gender: 'M' | 'F'): PlayerBuilder;
    ForTeam(team: TeamBuilder, type: TeamMembershipType): PlayerBuilder;
    Build(rebuild?: boolean): Promise<Player>;
}
