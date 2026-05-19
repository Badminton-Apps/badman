import {
  Club,
  EventEntry,
  Location,
  Player,
  Team,
  TeamPlayerMembership,
} from "@badman/backend-database";
import { Injectable, Logger, Scope } from "@nestjs/common";
import { Op } from "sequelize";

type Batch<K, V> = {
  keys: Set<K>;
  promise: Promise<Map<K, V>> | null;
};

type BatchState<K, V> = {
  cache: Map<K, V | null>;
  batch: Batch<K, V> | null;
};

/**
 * Request-scoped batching for Team field resolvers.
 *
 * Each method collects all ids requested within one microtask tick, then
 * issues a single `findAll({ id: Op.in })` and resolves every queued caller
 * from the shared result. Subsequent ticks start a fresh batch but reuse
 * the per-request cache built up so far.
 *
 * Lifecycle is bound to one GraphQL request (Scope.REQUEST). No TTL needed:
 * the service instance is discarded when the request ends.
 */
@Injectable({ scope: Scope.REQUEST })
export class TeamAssociationService {
  private readonly logger = new Logger(TeamAssociationService.name);

  private captainState: BatchState<string, Player> = { cache: new Map(), batch: null };
  private locationState: BatchState<string, Location> = { cache: new Map(), batch: null };
  private clubState: BatchState<string, Club> = { cache: new Map(), batch: null };
  private entryState: BatchState<string, EventEntry> = { cache: new Map(), batch: null };
  private playersState: BatchState<string, Player[]> = { cache: new Map(), batch: null };

  async getCaptain(team: Team): Promise<Player | null> {
    return this.loadOne(this.captainState, team.captainId, (ids) =>
      this.loadPlayersByIds(ids)
    );
  }

  async getPrefferedLocation(team: Team): Promise<Location | null> {
    return this.loadOne(this.locationState, team.prefferedLocationId, (ids) =>
      this.loadLocationsByIds(ids)
    );
  }

  async getClub(team: Team): Promise<Club | null> {
    return this.loadOne(this.clubState, team.clubId, (ids) => this.loadClubsByIds(ids));
  }

  async getEntry(team: Team): Promise<EventEntry | null> {
    return this.loadOne(this.entryState, team.id, (ids) => this.loadEntriesByTeamIds(ids));
  }

  async getPlayers(team: Team): Promise<Player[]> {
    const result = await this.loadOne(this.playersState, team.id, (ids) =>
      this.loadPlayersByTeamIds(ids)
    );
    return result ?? [];
  }

  private loadOne<V>(
    state: BatchState<string, V>,
    key: string | null | undefined,
    loader: (keys: string[]) => Promise<Map<string, V>>
  ): Promise<V | null> {
    if (!key) {
      return Promise.resolve(null);
    }
    if (state.cache.has(key)) {
      return Promise.resolve(state.cache.get(key) ?? null);
    }

    if (!state.batch) {
      const batch: Batch<string, V> = { keys: new Set<string>(), promise: null };
      state.batch = batch;
      batch.promise = Promise.resolve().then(async () => {
        state.batch = null;
        const ids = [...batch.keys];
        const result = await loader(ids);
        for (const id of ids) {
          state.cache.set(id, result.get(id) ?? null);
        }
        return result;
      });
    }

    state.batch.keys.add(key);
    return state.batch.promise!.then((m) => m.get(key) ?? null);
  }

  private async loadPlayersByIds(ids: string[]): Promise<Map<string, Player>> {
    if (ids.length === 0) return new Map();
    const players = await Player.findAll({ where: { id: { [Op.in]: ids } } });
    return new Map(players.map((p) => [p.id, p]));
  }

  private async loadLocationsByIds(ids: string[]): Promise<Map<string, Location>> {
    if (ids.length === 0) return new Map();
    const locations = await Location.findAll({ where: { id: { [Op.in]: ids } } });
    return new Map(locations.map((l) => [l.id, l]));
  }

  private async loadClubsByIds(ids: string[]): Promise<Map<string, Club>> {
    if (ids.length === 0) return new Map();
    const clubs = await Club.findAll({ where: { id: { [Op.in]: ids } } });
    return new Map(clubs.map((c) => [c.id, c]));
  }

  private async loadEntriesByTeamIds(teamIds: string[]): Promise<Map<string, EventEntry>> {
    if (teamIds.length === 0) return new Map();
    const entries = await EventEntry.findAll({ where: { teamId: { [Op.in]: teamIds } } });

    // Group by teamId; prefer the entry with a drawId (federation-sync has
    // assigned a draw), otherwise fall back to any entry for the team.
    // Mirrors the pre-existing logic at team.resolver.ts:323.
    const byTeam = new Map<string, EventEntry[]>();
    for (const entry of entries) {
      if (!entry.teamId) continue;
      const bucket = byTeam.get(entry.teamId) ?? [];
      bucket.push(entry);
      byTeam.set(entry.teamId, bucket);
    }

    const result = new Map<string, EventEntry>();
    for (const [teamId, bucket] of byTeam) {
      const winner = bucket.find((e) => e.drawId) ?? bucket[0];
      if (winner) {
        result.set(teamId, winner);
      }
    }
    return result;
  }

  private async loadPlayersByTeamIds(teamIds: string[]): Promise<Map<string, Player[]>> {
    if (teamIds.length === 0) return new Map();

    // Fetch through TeamPlayerMembership so we can group rows back by teamId.
    // Using a single query keeps this O(1) DB round trip regardless of team count.
    const memberships = await TeamPlayerMembership.findAll({
      where: { teamId: { [Op.in]: teamIds } },
      include: [{ model: Player, required: true }],
    });

    const grouped = new Map<string, Player[]>();
    for (const m of memberships as Array<TeamPlayerMembership & { Player?: Player }>) {
      if (!m.teamId || !m.Player) continue;
      const player = m.Player;
      // Attach the membership row in the same shape Sequelize would produce
      // through `team.getPlayers()` so downstream resolvers that read
      // `player.TeamPlayerMembership` keep working.
      (player as Player & { TeamPlayerMembership: TeamPlayerMembership }).TeamPlayerMembership = m;
      const bucket = grouped.get(m.teamId) ?? [];
      bucket.push(player);
      grouped.set(m.teamId, bucket);
    }
    return grouped;
  }
}
