import {
  Player,
  RankingSystem,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { EnrollmentData, EnrollmentOutput } from '../../models';
import {
  CompetitionStatusRule,
  PlayerGenderRule,
  PlayerMinLevelRule,
  Rule,
  TeamBaseIndexRule,
  TeamSubeventIndexRule,
} from './rules';

@Injectable()
export class ValidationService {
  private readonly _logger = new Logger(ValidationService.name);

  async getValidationData({
    systemId,
    teams,
    entries,
  }: {
    systemId: string;
    teams: {
      id: string;
      basePlayers: string[];
      players: string[];
      backupPlayers: string[];
      linkId: string;
    }[];
    entries: {
      id: string;
      teamId: string;
      subEventId: string;
    }[];
  }): Promise<EnrollmentData> {
    const system = await RankingSystem.findByPk(systemId);
    let previousSeasonTeams = [];

    const linkIds = teams.map((t) => t.linkId);
    if (linkIds.length > 0) {
      previousSeasonTeams = await Team.findAll({
        where: {
          linkId: linkIds,
        },
      });
    }

    const subEvents = await SubEventCompetition.findAll({
      where: {
        id: entries.map((e) => e.subEventId),
      },
    });

    const playerIds = teams
      .map((t) => t.players)
      .concat(teams.map((t) => t.backupPlayers))
      .concat(teams.map((t) => t.basePlayers))
      .flat(1);
    const players = await Player.findAll({
      where: {
        id: playerIds,
      },
    });

    return {
      teams: teams.map((t) => {
        const entry = entries.find((e) => e.teamId === t.id);

        return {
          team: null,
          previousSeasonTeam: previousSeasonTeams.find(
            (p) => p.linkId === t.linkId
          ),
          id: t.id,
          basePlayers: players.filter((p) => t.basePlayers.includes(p.id)),
          teamPlayers: players.filter((p) => t.players.includes(p.id)),
          backupPlayers: players.filter((p) => t.backupPlayers.includes(p.id)),
          system,

          baseIndex: 0,
          teamIndex: 0,
          subEvent: subEvents.find((s) => s.id === entry.subEventId),
        };
      }),
    };
  }

  /**
   * Validate the enrollment
   *
   * @param enrollment Enrollment configuaration
   * @returns Whether the enrollment is valid or not
   */
  async validate(
    enrollment: EnrollmentData,
    validators: Rule[]
  ): Promise<EnrollmentOutput> {
    // get all errors and warnings from the validators in parallel
    const results = await Promise.all(
      validators.map((v) => v.validate(enrollment))
    );

    const errors = results
      ?.map((r) => r.errors)
      ?.flat(1)
      ?.filter((e) => !!e);
    const warnings = results
      ?.map((r) => r.warnings)
      ?.flat(1)
      ?.filter((e) => !!e);
    const valids = results
      ?.map((r) => r.valid)
      ?.flat(1)
      ?.filter((e) => !!e);

    // valids is an array for each team's validitiy per validator
    // if any of the validators return false, the team is invalid
    const valid: {
      teamId: string;
      valid: boolean;
    }[] = [];
    for (const team of enrollment.teams) {
      const teamValid = valids?.filter((v) => v.teamId == team.team.id);
      valid.push({
        teamId: team.team.id,
        valid: teamValid?.every((v) => v.valid),
      });
    }

    return {
      errors: errors,
      warnings: warnings,
      valid,
    };
  }

  async fetchAndValidate(
    data: {
      systemId: string;
      teamId: string;
      subEventId: string;
    },
    validators: Rule[]
  ) {
    const dbData = await this.getValidationData(null);
    return this.validate(dbData, validators);
  }

  static defaultValidators(): Rule[] {
    return [
      new TeamBaseIndexRule(),
      new TeamSubeventIndexRule(),
      new CompetitionStatusRule(),
      new PlayerMinLevelRule(),
      new PlayerGenderRule(),
    ];
  }
}
