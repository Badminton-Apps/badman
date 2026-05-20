import { SubEventCompetition } from "@badman/backend-database";
import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";

/**
 * Request-scoped DataLoader for batching SubEventCompetition lookups by ID.
 *
 * Collects all `subEventCompetitionId` values arriving in one microtask tick,
 * issues a single `SubEventCompetition.findAll({ where: { id: { [Op.in]: [...ids] } } })`,
 * and resolves every caller from the shared result.  Missing IDs resolve to
 * `null`.  The instance is discarded at request end so no cross-request
 * cache leakage occurs.
 *
 * Shared across: DrawCompetitionResolver.subEventCompetition and
 * EventEntryResolver.subEventCompetition — cross-resolver dedup is automatic
 * because both resolvers inject the same Scope.REQUEST instance.
 */
@Injectable({ scope: Scope.REQUEST })
export class SubEventCompetitionLoaderService {
  private readonly loader = new DataLoader<string, SubEventCompetition | null>((ids) =>
    this.batchSubEventCompetitionsByIds(ids)
  );

  /**
   * Load a SubEventCompetition by ID.  Returns `null` when the ID is falsy or
   * the row does not exist.
   */
  load(id: string | null | undefined): Promise<SubEventCompetition | null> {
    if (!id) return Promise.resolve(null);
    return this.loader.load(id);
  }

  private async batchSubEventCompetitionsByIds(
    ids: readonly string[]
  ): Promise<(SubEventCompetition | null)[]> {
    const subEvents = await SubEventCompetition.findAll({
      where: { id: { [Op.in]: [...ids] } },
    });
    const map = new Map(subEvents.map((s) => [s.id, s]));
    return ids.map((id) => map.get(id) ?? null);
  }
}
