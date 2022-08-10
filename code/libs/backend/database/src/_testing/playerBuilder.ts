import { Player, RankingPlace } from '../models';
import { GameBuilder } from './GameBuilder';

export class PlayerBuilder {
  private player: Player;

  private rankingPlaces: RankingPlace[] = [];
  private games: GameBuilder[] = [];

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
    systemId: string
  ): PlayerBuilder {
    const rankingPlace = new RankingPlace({
      single,
      double,
      mix,
      rankingDate,
      playerId: this.player.id,
      systemId,
    });

    this.rankingPlaces.push(rankingPlace);

    return this;
  }

  WithName(firstName: string, lastName: string): PlayerBuilder {
    this.player.firstName = firstName;
    this.player.lastName = lastName;

    return this;
  }

  async Build(): Promise<Player> {
    try {
      await this.player.save();

      for (const rankingPlace of this.rankingPlaces) {
        await rankingPlace.save();
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
    return this.player;
  }
}
