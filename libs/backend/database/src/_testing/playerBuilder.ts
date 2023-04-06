import { Player, RankingPlace, Team } from '../models';

export class PlayerBuilder {
  private build = false;

  private player: Player;

  private rankingPlaces: RankingPlace[] = [];

  constructor(id?: string) {
    this.player = new Player({
      id,
    });
  }

  static Create(id?: string): PlayerBuilder {
    return new PlayerBuilder(id);
  }

  WithRanking(
    single: number,
    double: number,
    mix: number,
    rankingDate: Date,
    systemId: string,
    updatePossible = true
  ): PlayerBuilder {
    const rankingPlace = new RankingPlace({
      single,
      double,
      mix,
      rankingDate,
      playerId: this.player.id,
      systemId,
      updatePossible,
    });

    this.rankingPlaces.push(rankingPlace);

    return this;
  }

  WithName(firstName: string, lastName: string): PlayerBuilder {
    this.player.firstName = firstName;
    this.player.lastName = lastName;

    return this;
  }

  WithCompetitionStatus(status: boolean): PlayerBuilder {
    this.player.competitionPlayer = status;
    return this;
  }

  WithGender(gender: 'M' | 'F'): PlayerBuilder {
    this.player.gender = gender;
    return this;
  }

  ForTeam(team: Team): PlayerBuilder {
    this.player.hasTeam(team);
    return this;
  }

  async Build(rebuild = false): Promise<Player> {
    if (this.build && !rebuild) {
      return this.player;
    }

    try {
      await this.player.save();

      for (const rankingPlace of this.rankingPlaces) {
        await rankingPlace.save();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.player;
  }
}
