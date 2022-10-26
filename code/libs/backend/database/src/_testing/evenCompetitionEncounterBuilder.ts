import { DrawCompetition, EncounterCompetition } from '../models';
import { TeamBulder } from './teamBuilder';
import { GameBuilder } from './GameBuilder';

export class EncounterCompetitionBuilder {
  private encounter: EncounterCompetition;

  private games: GameBuilder[] = [];
  private homeTeam: TeamBulder;
  private awayTeam: TeamBulder;

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

  ForDraw(draw: DrawCompetition) {
    this.encounter.drawId = draw.id;
    return this;
  }

  WithDate(date: Date): EncounterCompetitionBuilder {
    this.encounter.date = date;
    return this;
  }

  WithHomeTeam(team: TeamBulder): EncounterCompetitionBuilder {
    this.homeTeam = team;
    return this;
  }
  WithAwayTeam(team: TeamBulder): EncounterCompetitionBuilder {
    this.awayTeam = team;
    return this;
  }

  WithGame(game: GameBuilder): EncounterCompetitionBuilder {
    game.ForCompetition(this.encounter);
    this.games.push(game);
    return this;
  }

  async Build(): Promise<EncounterCompetition> {
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

    return this.encounter;
  }
}
