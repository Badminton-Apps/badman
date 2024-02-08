import { DrawTournament } from '../models';
import { GameBuilder } from './GameBuilder';
import { SubEventTournamentBuilder } from './eventTournamentSubEventBuilder';
export declare class DrawTournamentBuilder {
    private build;
    private draw;
    private games;
    constructor();
    static Create(): DrawTournamentBuilder;
    WithName(firstName: string): DrawTournamentBuilder;
    WithId(id: string): DrawTournamentBuilder;
    ForSubEvent(event: SubEventTournamentBuilder): DrawTournamentBuilder;
    WithGame(game: GameBuilder): DrawTournamentBuilder;
    Build(rebuild?: boolean): Promise<DrawTournament>;
}
