import { TeamMembershipType } from '@badman/utils';
import { Player } from '../models';
import { RankingPlaceBuilder } from './rankingPlaceBuilder';
import { TeamBuilder } from './teamBuilder';

export class PlayerBuilder {
  private build = false;

  private player: Player;

  private rankingPlaces: RankingPlaceBuilder[] = [];

  constructor(id?: string) {
    this.player = new Player({
      id,
    });
  }

  static Create(id?: string): PlayerBuilder {
    return new PlayerBuilder(id);
  }


  WithRanking(rankingPlace: RankingPlaceBuilder): PlayerBuilder {
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

  ForTeam(team: TeamBuilder, type: TeamMembershipType): PlayerBuilder {
    team.WithPlayer(this, type);
    return this;
  }

  async Build(rebuild = false): Promise<Player> {
    if (this.build && !rebuild) {
      return this.player;
    }

    try {
      await this.player.save();

      for (const rankingPlace of this.rankingPlaces) {
        rankingPlace.WithPlayerId(this.player.id);
        await rankingPlace.Build();
      }

    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.player;
  }
}
