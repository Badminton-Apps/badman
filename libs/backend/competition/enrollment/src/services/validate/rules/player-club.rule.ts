import { Club, Player } from '@badman/backend-database';
import { EnrollmentValidationData, EnrollmentValidationError, RuleResult } from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if the players is the correct club for the team
 */
export class PlayerClubRule extends Rule {
  async validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]> {
    const results = [] as RuleResult[];
    // get all players from the teams
    const playerIds = new Set<string>();

    for (const { basePlayers, teamPlayers, backupPlayers } of enrollment.teams) {
      const baseIds = basePlayers?.map((p) => p.id ?? '') ?? [];
      const teamIds = teamPlayers?.map((p) => p.id ?? '') ?? [];
      const backupIds = backupPlayers?.map((p) => p.id ?? '') ?? [];

      baseIds.forEach((id) => playerIds.add(id));
      teamIds.forEach((id) => playerIds.add(id));
      backupIds.forEach((id) => playerIds.add(id));
    }

    // get all players from the ids
    const players = await Player.findAll({
      where: {
        id: Array.from(playerIds)?.filter((id) => !!id) ?? [],
      },
      include: [
        {
          model: Club,
        },
      ],
    });

    if (enrollment.club?.id == null) {
      this.logger.error(`No Club not found`);
      return [];
    }

    for (const { teamPlayers, team, backupPlayers, basePlayers } of enrollment.teams) {
      if (!team?.id) {
        continue;
      }

      const errors = [] as EnrollmentValidationError[];
      const warnings = [] as EnrollmentValidationError[];

      // All base players should be from the teams's club
      const basePlayerErrors = this.checkPlayersClub(
        players,
        basePlayers?.map((p) => p.id ?? '') ?? [],
        enrollment.club,
      );

      if (basePlayerErrors.length > 0) {
        errors.push(...(basePlayerErrors.filter((e) => !!e) as EnrollmentValidationError[]));
      }

      // if teamplayers or backup players are set, they should be from the same club, if not: warning
      const teamPlayerErrors = this.checkPlayersClub(
        players,
        teamPlayers?.map((p) => p.id ?? '') ?? [],
        enrollment.club,
      );
      const backupPlayerErrors = this.checkPlayersClub(
        players,
        backupPlayers?.map((p) => p.id ?? '') ?? [],
        enrollment.club,
      );

      if (teamPlayerErrors.length > 0) {
        errors.push(...(teamPlayerErrors.filter((e) => !!e) as EnrollmentValidationError[]));
      }

      if (backupPlayerErrors.length > 0) {
        errors.push(...(backupPlayerErrors.filter((e) => !!e) as EnrollmentValidationError[]));
      }

      results.push({
        teamId: team.id,
        errors,
        warnings,
        valid: errors.length === 0,
      });
    }

    return results;
  }

  private checkPlayersClub(playerList: Player[], playersToCheck: string[], club: Club) {
    // 1. find player in playerList
    // 2. check if the active club (= no end date) is the same as the club
    // 3. return a list of players that are not from the club

    return playersToCheck.map((id) => {
      const player = playerList.find((p) => p.id === id);
      if (!player) {
        this.logger.error(`Player with id ${id} not found`);
        return;
      }

      const activeClub = player.clubs?.find((c) => c.ClubPlayerMembership.end == null);

      if (!activeClub) {
        return {
          message: 'all.competition.team-enrollment.errors.player-club-none',
          params: {
            player: {
              fullName: player.fullName,
              id: player.id,
            }
          },
        } as EnrollmentValidationError;
      }

      if (activeClub?.id !== club.id) {
        return {
          message: 'all.competition.team-enrollment.errors.player-club',
          params: {
            player: {
              fullName: player.fullName,
              id: player.id,
            },
            club: {
              name: club.name,
              id: club.id,
            },
            activeClub: {
              name: activeClub.name,
              id: activeClub.id,
            }
          },
        } as EnrollmentValidationError;
      }

      return;
    });
  }
}
