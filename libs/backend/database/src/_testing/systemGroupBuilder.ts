import {
  RankingGroupSubEventTournamentMembership,
  RankingSystemRankingGroupMembership,
  RankingSystem,
  RankingGroup,
  SubEventCompetition,
  SubEventTournament,
  RankingGroupSubEventCompetitionMembership,
} from '../models';

export class SystemGroupBuilder {
  private build = false;

  private systemGroup: RankingGroup;

  private systems: string[] = [];
  private subEventTournaments: string[] = [];
  private subEventCompetitions: string[] = [];

  constructor() {
    this.systemGroup = new RankingGroup();
  }

  static Create(): SystemGroupBuilder {
    return new SystemGroupBuilder();
  }

  WithSystem(system: RankingSystem): SystemGroupBuilder {
    this.systems.push(system.id);
    return this;
  }

  WithCompetition(subEventCompetition: SubEventCompetition): SystemGroupBuilder {
    this.subEventCompetitions.push(subEventCompetition.id);
    return this;
  }

  WithTournament(subEventTournament: SubEventTournament): SystemGroupBuilder {
    this.subEventTournaments.push(subEventTournament.id);
    return this;
  }

  async Build(rebuild = false): Promise<RankingGroup> {
    if (this.build && !rebuild) {
      return this.systemGroup;
    }

    try {
      await this.systemGroup.save();

      for (const systemId of this.systems) {
        await new RankingSystemRankingGroupMembership({
          systemId: systemId,
          groupId: this.systemGroup.id,
        }).save();
      }

      for (const subEventTournamentId of this.subEventTournaments) {
        await new RankingGroupSubEventTournamentMembership({
          subEventId: subEventTournamentId,
          groupId: this.systemGroup.id,
        }).save();
      }

      for (const subEventCompetitionId of this.subEventCompetitions) {
        await new RankingGroupSubEventCompetitionMembership({
          subEventId: subEventCompetitionId,
          groupId: this.systemGroup.id,
        }).save();
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    this.build = true;
    return this.systemGroup;
  }
}
