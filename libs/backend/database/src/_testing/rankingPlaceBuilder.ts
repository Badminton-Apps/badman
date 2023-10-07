import { RankingPlace } from '../models';
import { PlayerBuilder } from './playerBuilder';
import { SystemBuilder } from './systemBuilder';

export class RankingPlaceBuilder {
  private build = false;

  private rankingPlace: RankingPlace;

  constructor(id?: string) {
    this.rankingPlace = new RankingPlace({
      id,
    });
  }

  static Create(id?: string): RankingPlaceBuilder {
    return new RankingPlaceBuilder(id);
  }

  WithRanking(single: number, double: number, mix: number) {
    this.rankingPlace.single = single;
    this.rankingPlace.double = double;
    this.rankingPlace.mix = mix;
    return this;
  }

  WithPlayerId(playerId: string): RankingPlaceBuilder {
    this.rankingPlace.playerId = playerId;
    return this;
  }
  WithSystemId(systemId: string): RankingPlaceBuilder {
    this.rankingPlace.systemId = systemId;
    return this;
  }

  WithDate(date: Date): RankingPlaceBuilder {
    this.rankingPlace.rankingDate = date;
    return this;
  }

  ForSystem(system: SystemBuilder): RankingPlaceBuilder {
    system.WithrankingPlace(this);
    return this;
  }

  ForPlayer(player: PlayerBuilder): RankingPlaceBuilder {
    player.WithRanking(this);
    return this;
  }

  async Build(rebuild = false): Promise<RankingPlace> {
    if (this.build && !rebuild) {
      return this.rankingPlace;
    }

  try {
      await this.rankingPlace.save();
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.rankingPlace;
  }
}
