import { GameType } from '@badman/utils';
import { DrawTournament, EncounterCompetition, Game, GamePlayerMembership } from '../models';
import { PlayerBuilder } from './playerBuilder';

export class GameBuilder {
  private build = false;

  private game: Game;

  private players: {
    team: number;
    player: number;
    builder: PlayerBuilder;
  }[] = [];

  private set = 1;

  constructor() {
    this.game = new Game();
  }

  static Create(): GameBuilder {
    return new GameBuilder();
  }

  WithId(id: string): GameBuilder {
    this.game.id = id;
    return this;
  }

  WithSet(team1Score: number, team2Score: number): GameBuilder {
    this.game[`set${this.set}Team1` as 'set1Team1' | 'set2Team1' | 'set3Team1'] = team1Score;
    this.game[`set${this.set}Team2` as 'set1Team2' | 'set2Team2' | 'set3Team2'] = team2Score;
    this.set++;

    return this;
  }

  ForCompetition(encounter: EncounterCompetition): GameBuilder {
    this.game.linkId = encounter.id;
    this.game.linkType = 'competition';
    return this;
  }

  ForTournament(draw: DrawTournament): GameBuilder {
    this.game.linkId = draw.id;
    this.game.linkType = 'tournament';
    return this;
  }

  WithDate(date: Date): GameBuilder {
    this.game.playedAt = date;
    return this;
  }

  WithWinner(team: number): GameBuilder {
    this.game.winner = team;
    return this;
  }

  WithGameType(gameType: GameType): GameBuilder {
    this.game.gameType = gameType;
    return this;
  }

  WithPlayer(team: number, player: number, builder: PlayerBuilder): GameBuilder {
    this.players.push({
      team,
      player,
      builder,
    });

    return this;
  }

  async Build(rebuild = false): Promise<Game> {
    if (this.build && !rebuild) {
      return this.game;
    }

    try {
      await this.game.save();

      for (const player of this.players) {
        const playerEntity = await player.builder.Build();
        await new GamePlayerMembership({
          playerId: playerEntity.id,
          gameId: this.game.id,
          team: player.team,
          player: player.player,
        }).save();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.game;
  }
}
