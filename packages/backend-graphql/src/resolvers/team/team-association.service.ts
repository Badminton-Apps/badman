import { Club, EventEntry, Location, Player, Team } from "@badman/backend-database";
import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import { Op } from "sequelize";

/**
 * Request-scoped batching for Team field resolvers.
 *
 * Each DataLoader collects all keys requested within one microtask, issues
 * one `findAll({ ... [Op.in] })` per loader, and resolves every caller from
 * the shared result. Cache is per-instance (per request); the instance is
 * discarded when the request ends so no TTL is needed.
 */
@Injectable({ scope: Scope.REQUEST })
export class TeamAssociationService {
  private readonly captainLoader = new DataLoader<string, Player | null>((ids) =>
    this.batchPlayersByIds(ids)
  );
  private readonly locationLoader = new DataLoader<string, Location | null>((ids) =>
    this.batchLocationsByIds(ids)
  );
  private readonly clubLoader = new DataLoader<string, Club | null>((ids) =>
    this.batchClubsByIds(ids)
  );
  private readonly entryLoader = new DataLoader<string, EventEntry | null>((teamIds) =>
    this.batchEntriesByTeamIds(teamIds)
  );
  private readonly playersLoader = new DataLoader<string, Player[]>((teamIds) =>
    this.batchPlayersByTeamIds(teamIds)
  );

  getCaptain(team: Team): Promise<Player | null> {
    return team.captainId ? this.captainLoader.load(team.captainId) : Promise.resolve(null);
  }

  getPrefferedLocation(team: Team): Promise<Location | null> {
    return team.prefferedLocationId
      ? this.locationLoader.load(team.prefferedLocationId)
      : Promise.resolve(null);
  }

  getClub(team: Team): Promise<Club | null> {
    return team.clubId ? this.clubLoader.load(team.clubId) : Promise.resolve(null);
  }

  getEntry(team: Team): Promise<EventEntry | null> {
    return team.id ? this.entryLoader.load(team.id) : Promise.resolve(null);
  }

  async getPlayers(team: Team): Promise<Player[]> {
    if (!team.id) return [];
    return this.playersLoader.load(team.id);
  }

  private async batchPlayersByIds(ids: readonly string[]): Promise<(Player | null)[]> {
    const players = await Player.findAll({ where: { id: { [Op.in]: [...ids] } } });
    const map = new Map(players.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  }

  private async batchLocationsByIds(ids: readonly string[]): Promise<(Location | null)[]> {
    const locations = await Location.findAll({ where: { id: { [Op.in]: [...ids] } } });
    const map = new Map(locations.map((l) => [l.id, l]));
    return ids.map((id) => map.get(id) ?? null);
  }

  private async batchClubsByIds(ids: readonly string[]): Promise<(Club | null)[]> {
    const clubs = await Club.findAll({ where: { id: { [Op.in]: [...ids] } } });
    const map = new Map(clubs.map((c) => [c.id, c]));
    return ids.map((id) => map.get(id) ?? null);
  }

  private async batchEntriesByTeamIds(teamIds: readonly string[]): Promise<(EventEntry | null)[]> {
    const entries = await EventEntry.findAll({
      where: { teamId: { [Op.in]: [...teamIds] } },
    });

    // Group by teamId; prefer the entry with a drawId (federation-sync has
    // assigned a draw), otherwise fall back to the first entry for the team.
    // Mirrors the pre-existing logic at team.resolver.ts:323.
    const byTeam = new Map<string, EventEntry[]>();
    for (const entry of entries) {
      if (!entry.teamId) continue;
      const bucket = byTeam.get(entry.teamId) ?? [];
      bucket.push(entry);
      byTeam.set(entry.teamId, bucket);
    }

    return teamIds.map((teamId) => {
      const bucket = byTeam.get(teamId);
      if (!bucket || bucket.length === 0) return null;
      return bucket.find((e) => e.drawId) ?? bucket[0];
    });
  }

  private async batchPlayersByTeamIds(teamIds: readonly string[]): Promise<Player[][]> {
    // Load via the registered Team↔Player M:N association so Sequelize
    // auto-attaches the through row as `player.TeamPlayerMembership`,
    // matching the legacy `team.getPlayers()` shape consumed downstream
    // (e.g. PlayerTeamResolver.teamMembership).
    const teams = await Team.findAll({
      where: { id: { [Op.in]: [...teamIds] } },
      attributes: ["id"],
      include: [{ model: Player, as: "players" }],
    });

    const grouped = new Map<string, Player[]>();
    for (const t of teams as Array<Team & { players?: Player[] }>) {
      grouped.set(t.id, t.players ?? []);
    }
    return teamIds.map((teamId) => grouped.get(teamId) ?? []);
  }
}
