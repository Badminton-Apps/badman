import { Team } from '../models';

export class TeamBulder {
  private team: Team;

  constructor() {
    this.team = new Team();
  }

  static Create(): TeamBulder {
    return new TeamBulder();
  }

  WithName(name: string): TeamBulder {
    this.team.name = name;

    return this;
  }

  WithId(id: string): TeamBulder {
    this.team.id = id;
    return this;
  }

  async Build(): Promise<Team> {
    try {
      await this.team.save();
    } catch (error) {
      console.log(error);
      throw error;
    }
    return this.team;
  }
}
