import { RankingLastPlace } from '../models';
import { PlayerBuilder } from './playerBuilder';
import { SystemBuilder } from './systemBuilder';

export class RankingLastPlaceBuilder {
  private build = false;

  private rankingLastPlace: RankingLastPlace;

  constructor(id?: string) {
    this.rankingLastPlace = new RankingLastPlace({
      id,
    });
  }

  static Create(id?: string): RankingLastPlaceBuilder {
    return new RankingLastPlaceBuilder(id);
  }

  WithRanking(single: number, double: number, mix: number) {
    this.rankingLastPlace.single = single;
    this.rankingLastPlace.double = double;
    this.rankingLastPlace.mix = mix;
    return this;
  }

  WithPlayerId(playerId: string): RankingLastPlaceBuilder {
    this.rankingLastPlace.playerId = playerId;
    return this;
  }
  WithSystemId(systemId: string): RankingLastPlaceBuilder {
    this.rankingLastPlace.systemId = systemId;
    return this;
  }

  WithDate(date: Date): RankingLastPlaceBuilder {
    this.rankingLastPlace.rankingDate = date;
    return this;
  }

  ForSystem(system: SystemBuilder): RankingLastPlaceBuilder {
    system.WithrankingLastPlace(this);
    return this;
  }

  ForPlayer(player: PlayerBuilder): RankingLastPlaceBuilder {
    player.WithLastRanking(this);
    return this;
  }

  async Build(rebuild = false): Promise<RankingLastPlace> {
    if (this.build && !rebuild) {
      return this.rankingLastPlace;
    }

    try {
      await this.rankingLastPlace.save();
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.rankingLastPlace;
  }
}
