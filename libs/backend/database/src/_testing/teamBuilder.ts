import { SubEventTypeEnum, TeamMembershipType } from '@badman/utils';
import { Club, Team, TeamPlayerMembership } from '../models';
import { ClubBuilder } from './clubBuilder';
import { EventCompetitionEntryBuilder } from './eventCompetitionEntryBuilder';
import { PlayerBuilder } from './playerBuilder';

export class TeamBuilder {
  private build = false;

  private team: Team;

  private players: [PlayerBuilder, TeamMembershipType][] = [];
  private entries: EventCompetitionEntryBuilder[] = [];
  private club?: ClubBuilder;

  constructor(type: SubEventTypeEnum) {
    this.team = new Team({
      type,
    });
  }

  static Create(type: SubEventTypeEnum): TeamBuilder {
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

  WithSeason(season: number): TeamBuilder {
    this.team.season = season;
    return this;
  }

  WithId(id: string): TeamBuilder {
    this.team.id = id;
    return this;
  }

  WithPlayer(player: PlayerBuilder, type: TeamMembershipType): TeamBuilder {
    this.players.push([player, type]);
    return this;
  }

  WithEntry(entry: EventCompetitionEntryBuilder): TeamBuilder {
    entry.ForTeam(this);
    this.entries.push(entry);
    return this;
  }

  WithClub(club: ClubBuilder): TeamBuilder {
    club.WithTeam(this);
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
      if (this.club) {
        const c = await this.club.Build();
        this.team.clubId = c.id;
      }

      await this.team.save();

      for (const [player, type] of this.players) {
        const p = await player.Build();
        await this.team.addPlayer(p, {
          through: {
            membershipType: type,
            start: new Date(),
          },
        });
      }

      for (const entry of this.entries) {
        entry.WithTeamId(this.team.id);
        await entry.Build();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.team;
  }
}
