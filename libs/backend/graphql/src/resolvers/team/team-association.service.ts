import {
  Club,
  EventEntry,
  Location,
  Player,
  Team,
  TeamPlayerMembership,
} from "@badman/backend-database";
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

  private async batchEntriesByTeamIds(
    teamIds: readonly string[]
  ): Promise<(EventEntry | null)[]> {
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
    // Fetch through TeamPlayerMembership so we can group rows back by teamId.
    // One query keeps this O(1) DB round trip regardless of team count.
    const memberships = await TeamPlayerMembership.findAll({
      where: { teamId: { [Op.in]: [...teamIds] } },
      include: [{ model: Player, required: true }],
    });

    const grouped = new Map<string, Player[]>();
    for (const m of memberships as Array<TeamPlayerMembership & { Player?: Player }>) {
      if (!m.teamId || !m.Player) continue;
      const player = m.Player;
      // Attach the membership in the shape `team.getPlayers()` would produce
      // so downstream consumers reading `player.TeamPlayerMembership` keep
      // working (e.g. PlayerTeamResolver.teamMembership).
      (player as Player & { TeamPlayerMembership: TeamPlayerMembership }).TeamPlayerMembership = m;
      const bucket = grouped.get(m.teamId) ?? [];
      bucket.push(player);
      grouped.set(m.teamId, bucket);
    }

    return teamIds.map((teamId) => grouped.get(teamId) ?? []);
  }
}
