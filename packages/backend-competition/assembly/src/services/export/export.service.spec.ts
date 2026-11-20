jest.mock("@badman/backend-database", () => ({
  ...jest.requireActual("@badman/backend-database"),
  findLatestRankingPlaces: jest.fn(),
}));

import {
  LatestRankingPlace,
  Player,
  RankingSystem,
  Team,
  findLatestRankingPlaces,
} from "@badman/backend-database";
import { AssemblyExportService } from "./export.service";

/**
 * Characterization tests (BAD-409) for the ranking date of the line-up export:
 * the newest update publication of the primary system up to and including
 * 10 June of the season. Since BAD-392 the export uses findLatestRankingPlaces.
 * TZ is pinned to UTC by jest.global-setup.js.
 */
describe("AssemblyExportService ranking date (characterization)", () => {
  const lookup = findLatestRankingPlaces as jest.MockedFunction<typeof findLatestRankingPlaces>;

  const getPlayersFor = async (season: number, teams: Team[]) => {
    const service = new AssemblyExportService();
    service.system = { id: "system-1" } as RankingSystem;
    return (
      service as unknown as { _getPlayers: (teams: Team[], season: number) => Promise<Player[]> }
    )._getPlayers(teams, season);
  };

  const team = (...ids: string[]) =>
    ({
      getPlayers: jest.fn().mockResolvedValue(ids.map((id) => ({ id }) as Player)),
    }) as unknown as Team;

  afterEach(() => {
    lookup.mockReset();
  });

  it("takes the newest update publication of the system up to and including 10 June of the season", async () => {
    lookup.mockResolvedValue(new Map());
    await getPlayersFor(2026, [team("player-1")]);

    expect(lookup).toHaveBeenCalledWith({
      playerIds: ["player-1"],
      systemId: "system-1",
      onOrBefore: "2026-06-10",
      updatePossibleOnly: true,
    });
  });

  it("uses 10 June of the given season, not of the current year", async () => {
    lookup.mockResolvedValue(new Map());
    await getPlayersFor(2024, [team("player-1")]);

    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ onOrBefore: "2024-06-10" }));
  });

  it("looks up each player once and attaches the place as rankingPlaces[0]", async () => {
    lookup.mockResolvedValue(new Map([["player-1", { single: 6 } as LatestRankingPlace]]));
    const players = await getPlayersFor(2026, [team("player-1", "player-2"), team("player-1")]);

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup.mock.calls[0][0].playerIds).toEqual(["player-1", "player-2"]);
    expect(players.map((p) => p.id)).toEqual(["player-1", "player-2"]);
    expect(players[0].rankingPlaces?.[0]?.single).toBe(6);
    expect(players[1].rankingPlaces).toEqual([]);
  });

  it("still loads the last place of the system with the players", async () => {
    lookup.mockResolvedValue(new Map());
    const t = team("player-1");
    await getPlayersFor(2026, [t]);

    const { include } = (t.getPlayers as jest.Mock).mock.calls[0][0];
    expect(include).toHaveLength(1);
    expect(include[0].where).toEqual({ systemId: "system-1" });
  });
});
