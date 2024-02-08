import { EncounterCompetition } from '../models';
import { GameBuilder } from './GameBuilder';
import { DrawCompetitionBuilder } from './eventCompetitionDrawBuilder';
import { TeamBuilder } from './teamBuilder';
export declare class EncounterCompetitionBuilder {
    private build;
    private encounter;
    private games;
    private homeTeam?;
    private awayTeam?;
    private draw?;
    constructor(id?: string);
    static Create(id?: string): EncounterCompetitionBuilder;
    WithId(id: string): EncounterCompetitionBuilder;
    ForDraw(draw: DrawCompetitionBuilder): this;
    WithDate(date: Date): EncounterCompetitionBuilder;
    WithHomeTeam(team: TeamBuilder): EncounterCompetitionBuilder;
    WithAwayTeam(team: TeamBuilder): EncounterCompetitionBuilder;
    WithGame(game: GameBuilder): EncounterCompetitionBuilder;
    Build(rebuild?: boolean): Promise<EncounterCompetition>;
}
