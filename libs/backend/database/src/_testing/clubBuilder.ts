import { Club } from '../models';
import { TeamBuilder } from './teamBuilder';

export class ClubBuilder {
  private build = false;

  private club: Club;

  private teams: TeamBuilder[] = [];

  constructor(name = 'Test Club', id?: string) {
    this.club = new Club({ id, name });
  }

  static Create(name = 'Test Club',id?: string): ClubBuilder {
    return new ClubBuilder(name, id);
  }

  WithName(name: string): this {
    this.club.name = name;

    return this;
  }
  
  WithTeamName(name: string): this {
    this.club.teamName = name;

    return this;
  }

  WithId(id: string): this {
    this.club.id = id;
    return this;
  }

  WithTeam(team: TeamBuilder): this {
    team.ForClub(this.club);
    this.teams.push(team);
    return this;
  }

  async Build(rebuild = false): Promise<Club> {
    if (this.build && !rebuild) {
      return this.club;
    }

    try {
      await this.club.save();

      for (const team of this.teams) {
        await team.Build();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.club;
  }
}
