import { DrawCompetition } from "@badman/backend-database";
import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";

/**
 * Request-scoped DataLoader for batching DrawCompetition lookups by ID.
 *
 * Collects all draw IDs arriving in one microtask tick (one per
 * EncounterCompetition row), issues a single
 * `DrawCompetition.findAll({ where: { id: { [Op.in]: [...ids] } } })`, and
 * resolves every caller from the shared result.  Missing IDs resolve to
 * `null`.  The instance is discarded at request end so no cross-request
 * cache leakage occurs.
 *
 * Reused by: EncounterCompetitionResolver (drawCompetition field resolver).
 * May be reused by feature 025 (DrawCompetition.subEventCompetition).
 */
@Injectable({ scope: Scope.REQUEST })
export class DrawCompetitionLoaderService {
  private readonly loader = new DataLoader<string, DrawCompetition | null>((ids) =>
    this.batchDrawsByIds(ids)
  );

  /**
   * Load a DrawCompetition by ID.  Returns `null` when the ID is falsy or
   * the row does not exist.
   */
  load(id: string | null | undefined): Promise<DrawCompetition | null> {
    if (!id) return Promise.resolve(null);
    return this.loader.load(id);
  }

  private async batchDrawsByIds(ids: readonly string[]): Promise<(DrawCompetition | null)[]> {
    const draws = await DrawCompetition.findAll({ where: { id: { [Op.in]: [...ids] } } });
    const map = new Map(draws.map((d) => [d.id, d]));
    return ids.map((id) => map.get(id) ?? null);
  }
}
