import { EventCompetitionEntryBuilder } from './eventCompetitionEntryBuilder';
import { SubEventType } from '../enums';
import { Club, Team } from '../models';
import { PlayerBuilder } from './playerBuilder';
import { ClubBuilder } from './clubBuilder';

export class TeamBuilder {
  private build = false;

  private team: Team;

  private players: PlayerBuilder[] = [];
  private entries: EventCompetitionEntryBuilder[] = [];
  private club: ClubBuilder;

  constructor(type: SubEventType) {
    this.team = new Team({
      type,
    });
  }

  static Create(type: SubEventType): TeamBuilder {
    return new TeamBuilder(type);
  }

  WithName(name: string): TeamBuilder {
    this.team.name = name;

    return this;
  }

  WithTeamNumber(number: number): TeamBuilder {
    this.team.teamNumber = number;

    return this;
  }

  WithId(id: string): TeamBuilder {
    this.team.id = id;
    return this;
  }

  WithPlayer(player: PlayerBuilder): TeamBuilder {
    player.ForTeam(this.team);
    this.players.push(player);
    return this;
  }

  WithEntry(entry: EventCompetitionEntryBuilder): TeamBuilder {
    entry.ForTeam(this.team);
    this.entries.push(entry);
    return this;
  }

  WithClub(club: ClubBuilder): TeamBuilder {
    club.ForTeam(this.team);
    this.club = club;
    return this;
  }

  ForClub(club: Club): TeamBuilder {
    this.team.clubId = club.id;
    return this;
  }

  async Build(rebuild = false): Promise<Team> {
    if (this.build && !rebuild) {
      return this.team;
    }

    try {
      await this.team.save();

      for (const player of this.players) {
        await player.Build();
      }

      for (const entry of this.entries) {
        await entry.Build();
      }

      if (this.club) {
        await this.club.Build();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.team;
  }
}
