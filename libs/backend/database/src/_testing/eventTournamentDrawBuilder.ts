import { DrawTournament } from '../models';
import { GameBuilder } from './GameBuilder';
import { SubEventTournamentBuilder } from './eventTournamentSubEventBuilder';

export class DrawTournamentBuilder {
  private build = false;

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

  ForSubEvent(event: SubEventTournamentBuilder): DrawTournamentBuilder {
    event.WithDraw(this);
    return this;
  }

  WithGame(game: GameBuilder): DrawTournamentBuilder {
    this.games.push(game);
    return this;
  }

  async Build(rebuild = false): Promise<DrawTournament> {
    if (this.build && !rebuild) {
      return this.draw;
    }

    try {
      await this.draw.save();

      for (const game of this.games) {
        await game.Build();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.draw;
  }
}
