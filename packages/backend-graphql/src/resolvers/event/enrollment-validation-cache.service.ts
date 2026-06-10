import { EventEntry, Player, Team } from "@badman/backend-database";
import { EnrollmentValidationService, TeamEnrollmentOutput } from "@badman/backend-enrollment";
import { TeamMembershipType } from "@badman/utils";
import { Injectable, Logger, Scope } from "@nestjs/common";
import DataLoader from "dataloader";

type ValidationMap = Map<string, TeamEnrollmentOutput>;
type CacheKey = string; // `${clubId}:${season}`

/**
 * Request-scoped DataLoader for enrollment validation.
 *
 * The `EventEntry.enrollmentValidation` field resolver runs a club-wide
 * validation that returns results for every team in the club. Without
 * batching, a query returning N teams in the same club triggers N full
 * validations. DataLoader collapses all calls sharing the same
 * (clubId, season) key into a single computation per request.
 */
@Injectable({ scope: Scope.REQUEST })
export class EnrollmentValidationCacheService {
  private readonly logger = new Logger(EnrollmentValidationCacheService.name);
  private readonly loader = new DataLoader<CacheKey, ValidationMap>((keys) =>
    this.batchValidate(keys)
  );

  constructor(private readonly enrollmentService: EnrollmentValidationService) {}

  async getForTeam(team: Team): Promise<TeamEnrollmentOutput | null> {
    if (!team.clubId || team.season == null || !team.id) return null;
    const key: CacheKey = `${team.clubId}:${team.season}`;
    const byTeamId = await this.loader.load(key);
    return byTeamId.get(team.id) ?? null;
  }

  private async batchValidate(keys: readonly CacheKey[]): Promise<ValidationMap[]> {
    if (keys.length > 1 && process.env["NODE_ENV"] !== "production") {
      this.logger.debug(`batched ${keys.length} enrollment validations`);
    }
    return Promise.all(keys.map((key) => this.computeValidation(key)));
  }

  private async computeValidation(key: CacheKey): Promise<ValidationMap> {
    const [clubId, seasonStr] = key.split(":");
    const season = Number(seasonStr);

    try {
      const teamsOfClub = await Team.findAll({
        where: { clubId, season },
        include: [{ model: Player, as: "players" }, { model: EventEntry }],
      });

      const validation = await this.enrollmentService.fetchAndValidate(
        {
          teams: teamsOfClub.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.type,
            link: t.link,
            teamNumber: t.teamNumber,
            basePlayers: t.entry?.meta?.competition?.players,
            players: t.players
              ?.filter((p) => p.TeamPlayerMembership.membershipType === TeamMembershipType.REGULAR)
              .map((p) => p.id),
            backupPlayers: t.players
              ?.filter((p) => p.TeamPlayerMembership.membershipType === TeamMembershipType.BACKUP)
              .map((p) => p.id),
            subEventId: t.entry?.subEventId,
            clubId: t.clubId,
          })),
          clubId,
          season,
        },
        EnrollmentValidationService.defaultValidators()
      );

      const map: ValidationMap = new Map();
      for (const t of validation.teams ?? []) {
        if (t.id) map.set(t.id, t);
      }
      return map;
    } catch (err) {
      this.logger.error(`enrollment validation failed for club ${clubId} season ${season}`, err);
      throw err;
    }
  }
}
