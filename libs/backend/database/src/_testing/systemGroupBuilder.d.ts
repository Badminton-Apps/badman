import { RankingSystem, RankingGroup, SubEventCompetition, SubEventTournament } from '../models';
export declare class SystemGroupBuilder {
    private build;
    private systemGroup;
    private systems;
    private subEventTournaments;
    private subEventCompetitions;
    constructor();
    static Create(): SystemGroupBuilder;
    WithSystem(system: RankingSystem): SystemGroupBuilder;
    WithCompetition(subEventCompetition: SubEventCompetition): SystemGroupBuilder;
    WithTournament(subEventTournament: SubEventTournament): SystemGroupBuilder;
    Build(rebuild?: boolean): Promise<RankingGroup>;
}
