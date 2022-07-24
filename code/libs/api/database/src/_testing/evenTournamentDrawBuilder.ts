import { DrawTournament, SubEventTournament } from '../models';
import { GameBuilder } from './GameBuilder';

export class DrawTournamentBuilder {
  private draw: DrawTournament;

  private games: GameBuilder[] = [];

  constructor() {
    this.draw = new DrawTournament();
  }

  static Create(): DrawTournamentBuilder {
    return new DrawTournamentBuilder();
  }

  WithName(firstName: string): DrawTournamentBuilder {
    this.draw.name = firstName;

    return this;
  }

  WithId(id: string): DrawTournamentBuilder {
    this.draw.id = id;
    return this;
  }

  ForSubEvent(event: SubEventTournament): DrawTournamentBuilder {
    this.draw.subeventId = event.id;
    return this;
  }

  WithGame(game: GameBuilder): DrawTournamentBuilder {
    game.ForTournament(this.draw);
    this.games.push(game);
    return this;
  }

  async Build(): Promise<DrawTournament> {
    try {
      await this.draw.save();

      for (const game of this.games) {
        await game.Build();
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
    return this.draw;
  }
}
