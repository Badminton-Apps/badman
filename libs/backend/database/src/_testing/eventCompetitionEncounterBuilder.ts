import { EncounterCompetition } from '../models';
import { GameBuilder } from './GameBuilder';
import { DrawCompetitionBuilder } from './eventCompetitionDrawBuilder';
import { TeamBuilder } from './teamBuilder';

export class EncounterCompetitionBuilder {
  private build = false;

  private encounter: EncounterCompetition;

  private games: GameBuilder[] = [];
  private homeTeam?: TeamBuilder;
  private awayTeam?: TeamBuilder;
  private draw?: DrawCompetitionBuilder;

  constructor() {
    this.encounter = new EncounterCompetition();
  }

  static Create(): EncounterCompetitionBuilder {
    return new EncounterCompetitionBuilder();
  }

  WithId(id: string): EncounterCompetitionBuilder {
    this.encounter.id = id;
    return this;
  }

  ForDraw(draw: DrawCompetitionBuilder) {
    draw.WithEnouncter(this);
    return this;
  }

  WithDate(date: Date): EncounterCompetitionBuilder {
    this.encounter.date = date;
    return this;
  }

  WithHomeTeam(team: TeamBuilder): EncounterCompetitionBuilder {
    this.homeTeam = team;
    return this;
  }
  WithAwayTeam(team: TeamBuilder): EncounterCompetitionBuilder {
    this.awayTeam = team;
    return this;
  }

  WithGame(game: GameBuilder): EncounterCompetitionBuilder {
    game.ForCompetition(this.encounter);
    this.games.push(game);
    return this;
  }

  async Build(rebuild = false): Promise<EncounterCompetition> {
    if (this.build && !rebuild) {
      return this.encounter;
    }

    try {
      await this.encounter.save();

      for (const game of this.games) {
        await game.Build();
      }

      if (this.homeTeam) {
        this.encounter.homeTeamId = (await this.homeTeam.Build()).id;
      }

      if (this.awayTeam) {
        this.encounter.awayTeamId = (await this.awayTeam.Build()).id;
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.encounter;
  }
}
