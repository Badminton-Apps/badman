import { GameType } from '@badman/utils';
import { DrawTournament, EncounterCompetition, Game } from '../models';
import { PlayerBuilder } from './playerBuilder';
export declare class GameBuilder {
    private build;
    private game;
    private players;
    private set;
    constructor();
    static Create(): GameBuilder;
    WithId(id: string): GameBuilder;
    WithSet(team1Score: number, team2Score: number): GameBuilder;
    ForCompetition(encounter: EncounterCompetition): GameBuilder;
    ForTournament(draw: DrawTournament): GameBuilder;
    WithDate(date: Date): GameBuilder;
    WithWinner(team: number): GameBuilder;
    WithGameType(gameType: GameType): GameBuilder;
    WithPlayer(team: number, player: number, builder: PlayerBuilder): GameBuilder;
    Build(rebuild?: boolean): Promise<Game>;
}
