import { Team } from "@badman/backend-database";
import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";

/**
 * Request-scoped DataLoader for batching Team lookups by ID.
 *
 * Collects all team IDs arriving in one microtask tick (home + away from
 * multiple EncounterCompetition rows), issues a single
 * `Team.findAll({ where: { id: { [Op.in]: [...ids] } } })`, and resolves
 * every caller from the shared result.  Missing IDs resolve to `null`.
 * The instance is discarded at request end so no cross-request cache
 * leakage occurs.
 *
 * Reused by: EncounterCompetitionResolver (home + away field resolvers).
 */
@Injectable({ scope: Scope.REQUEST })
export class TeamLoaderService {
  private readonly loader = new DataLoader<string, Team | null>((ids) =>
    this.batchTeamsByIds(ids)
  );

  /**
   * Load a Team by ID.  Returns `null` when the ID is falsy or the row
   * does not exist.
   */
  load(id: string | null | undefined): Promise<Team | null> {
    if (!id) return Promise.resolve(null);
    return this.loader.load(id);
  }

  private async batchTeamsByIds(ids: readonly string[]): Promise<(Team | null)[]> {
    const teams = await Team.findAll({ where: { id: { [Op.in]: [...ids] } } });
    const map = new Map(teams.map((t) => [t.id, t]));
    return ids.map((id) => map.get(id) ?? null);
  }
}
