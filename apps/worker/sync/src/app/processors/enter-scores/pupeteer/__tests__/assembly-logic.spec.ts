import { SubEventTypeEnum } from "@badman/utils";
import {
  getHeaderForAssemblyPosition,
  getAssemblyPositionsInOrder,
} from "../assemblyPositions";
import { matchGamesToAssembly } from "../matchGamesToAssembly";
import { fixMixedDoublesPlayerOrder } from "../fixMixedDoublesPlayerOrder";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGame(id: string, playerIds: string[], overrides: Record<string, unknown> = {}) {
  const half = playerIds.length / 2;
  const players = playerIds.map((pid, i) => ({
    id: pid,
    memberId: pid,
    gender: i % 2 === 0 ? "M" : "F",
    fullName: `Player ${pid}`,
    GamePlayerMembership: {
      team: i < half ? 1 : 2,
      player: (i % half) + 1,
      update: jest.fn().mockResolvedValue(undefined),
    },
  }));
  return { id, visualCode: null, players, ...overrides } as any;
}

function makeAssembly(teamId: string, assembly: Record<string, unknown> | null) {
  return { teamId, assembly };
}

const encounter = {
  home: { id: "home-team" },
  away: { id: "away-team" },
};

// ---------------------------------------------------------------------------
// getHeaderForAssemblyPosition
// ---------------------------------------------------------------------------

describe("getHeaderForAssemblyPosition", () => {
  it("returns HD1 for M / double1", () => {
    expect(getHeaderForAssemblyPosition(SubEventTypeEnum.M, "double1")).toBe("HD1");
  });

  it("returns DE1 for F / single1", () => {
    expect(getHeaderForAssemblyPosition(SubEventTypeEnum.F, "single1")).toBe("DE1");
  });

  it("returns HD for MX / double1", () => {
    expect(getHeaderForAssemblyPosition(SubEventTypeEnum.MX, "double1")).toBe("HD");
  });

  it("returns null for unknown team type", () => {
    expect(getHeaderForAssemblyPosition("UNKNOWN" as SubEventTypeEnum, "double1")).toBeNull();
  });

  it("returns null for unknown position in a valid team type", () => {
    expect(getHeaderForAssemblyPosition(SubEventTypeEnum.M, "triple1")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getAssemblyPositionsInOrder
// ---------------------------------------------------------------------------

describe("getAssemblyPositionsInOrder", () => {
  it("returns 8 positions for M", () => {
    expect(getAssemblyPositionsInOrder(SubEventTypeEnum.M)).toHaveLength(8);
  });

  it("returns 8 positions for F", () => {
    expect(getAssemblyPositionsInOrder(SubEventTypeEnum.F)).toHaveLength(8);
  });

  it("returns 8 positions for MX", () => {
    expect(getAssemblyPositionsInOrder(SubEventTypeEnum.MX)).toHaveLength(8);
  });

  it("returns MX order with doubles first, then singles, then doubles again", () => {
    const order = getAssemblyPositionsInOrder(SubEventTypeEnum.MX);
    expect(order).toEqual([
      "double1",
      "double2",
      "single1",
      "single3",
      "single2",
      "single4",
      "double3",
      "double4",
    ]);
  });

  it("returns empty array for unknown team type", () => {
    expect(getAssemblyPositionsInOrder("UNKNOWN" as SubEventTypeEnum)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// matchGamesToAssembly
// ---------------------------------------------------------------------------

describe("matchGamesToAssembly", () => {
  it("returns empty map when no assemblies", () => {
    const games = [makeGame("g1", ["p1", "p2"])];
    const result = matchGamesToAssembly(games, [], SubEventTypeEnum.M, encounter);
    expect(result.size).toBe(0);
  });

  it("returns empty map when assembly data is null", () => {
    const assemblies = [
      makeAssembly("home-team", null),
      makeAssembly("away-team", null),
    ];
    const games = [makeGame("g1", ["p1", "p2"])];
    const result = matchGamesToAssembly(games, assemblies, SubEventTypeEnum.M, encounter);
    expect(result.size).toBe(0);
  });

  it("matches a singles game for M type to single1", () => {
    const assemblies = [
      makeAssembly("home-team", { single1: "p1" }),
      makeAssembly("away-team", { single1: "p2" }),
    ];
    const game = makeGame("g1", ["p1", "p2"]);
    const result = matchGamesToAssembly([game], assemblies, SubEventTypeEnum.M, encounter);
    expect(result.size).toBe(1);
    const entry = result.get(game);
    expect(entry?.assemblyPosition).toBe("single1");
    expect(entry?.gameType).toBe("S");
  });

  it("matches a doubles game for M type to double1", () => {
    const assemblies = [
      makeAssembly("home-team", { double1: ["p1", "p2"] }),
      makeAssembly("away-team", { double1: ["p3", "p4"] }),
    ];
    const game = makeGame("g1", ["p1", "p2", "p3", "p4"]);
    const result = matchGamesToAssembly([game], assemblies, SubEventTypeEnum.M, encounter);
    expect(result.size).toBe(1);
    const entry = result.get(game);
    expect(entry?.assemblyPosition).toBe("double1");
    expect(entry?.gameType).toBe("D");
  });

  it("prevents double-matching: second eligible position does not steal the same game", () => {
    // Both double1 and double2 in assembly point to the same 4 players.
    const assemblies = [
      makeAssembly("home-team", { double1: ["p1", "p2"], double2: ["p1", "p2"] }),
      makeAssembly("away-team", { double1: ["p3", "p4"], double2: ["p3", "p4"] }),
    ];
    const game = makeGame("g1", ["p1", "p2", "p3", "p4"]);
    const result = matchGamesToAssembly([game], assemblies, SubEventTypeEnum.M, encounter);
    // Should be matched only once (to double1, which comes first)
    expect(result.size).toBe(1);
    const entry = result.get(game);
    expect(entry?.assemblyPosition).toBe("double1");
  });

  it("skips games that have players with 'unknown' in memberId", () => {
    const assemblies = [
      makeAssembly("home-team", { single1: "p1" }),
      makeAssembly("away-team", { single1: "p2" }),
    ];
    // One player has 'unknown' memberId — valid player count drops below 2
    const game = makeGame("g1", ["p1", "p2"]);
    game.players[1].memberId = "unknown-abc";
    const result = matchGamesToAssembly([game], assemblies, SubEventTypeEnum.M, encounter);
    expect(result.size).toBe(0);
  });

  it("assigns gameType MX for all games in MX team type (doubles)", () => {
    const assemblies = [
      makeAssembly("home-team", { double1: ["p1", "p2"] }),
      makeAssembly("away-team", { double1: ["p3", "p4"] }),
    ];
    const game = makeGame("g1", ["p1", "p2", "p3", "p4"]);
    const result = matchGamesToAssembly([game], assemblies, SubEventTypeEnum.MX, encounter);
    const entry = result.get(game);
    expect(entry?.gameType).toBe("MX");
  });

  it("assigns gameType MX for singles in MX team type", () => {
    const assemblies = [
      makeAssembly("home-team", { single1: "p1" }),
      makeAssembly("away-team", { single1: "p2" }),
    ];
    const game = makeGame("g1", ["p1", "p2"]);
    const result = matchGamesToAssembly([game], assemblies, SubEventTypeEnum.MX, encounter);
    const entry = result.get(game);
    expect(entry?.gameType).toBe("MX");
  });

  it("does not match when players don't align", () => {
    const assemblies = [
      makeAssembly("home-team", { single1: "p1" }),
      makeAssembly("away-team", { single1: "p2" }),
    ];
    // Game has completely different players
    const game = makeGame("g1", ["p9", "p10"]);
    const result = matchGamesToAssembly([game], assemblies, SubEventTypeEnum.M, encounter);
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fixMixedDoublesPlayerOrder
// ---------------------------------------------------------------------------

describe("fixMixedDoublesPlayerOrder", () => {
  function makeDoubleGame(
    t1p1Gender: string,
    t2p1Gender: string
  ) {
    const t1p1update = jest.fn().mockResolvedValue(undefined);
    const t1p2update = jest.fn().mockResolvedValue(undefined);
    const t2p1update = jest.fn().mockResolvedValue(undefined);
    const t2p2update = jest.fn().mockResolvedValue(undefined);

    const players = [
      {
        id: "t1p1",
        gender: t1p1Gender,
        fullName: "T1P1",
        GamePlayerMembership: { team: 1, player: 1, update: t1p1update },
      },
      {
        id: "t1p2",
        gender: t1p1Gender === "F" ? "M" : "F",
        fullName: "T1P2",
        GamePlayerMembership: { team: 1, player: 2, update: t1p2update },
      },
      {
        id: "t2p1",
        gender: t2p1Gender,
        fullName: "T2P1",
        GamePlayerMembership: { team: 2, player: 1, update: t2p1update },
      },
      {
        id: "t2p2",
        gender: t2p1Gender === "F" ? "M" : "F",
        fullName: "T2P2",
        GamePlayerMembership: { team: 2, player: 2, update: t2p2update },
      },
    ];
    return { id: "game1", players } as any;
  }

  it("no-op when game has fewer than 4 players", async () => {
    const game = makeGame("g1", ["p1", "p2"]);
    const updateFn = jest.fn();
    game.players.forEach((p: any) => (p.GamePlayerMembership.update = updateFn));
    await fixMixedDoublesPlayerOrder(game, {} as any);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("no-op when order is already correct (Team1: M first, F second)", async () => {
    const game = makeDoubleGame("M", "M");
    const tx = {} as any;
    await fixMixedDoublesPlayerOrder(game, tx);
    game.players.forEach((p: any) => {
      expect(p.GamePlayerMembership.update).not.toHaveBeenCalled();
    });
  });

  it("swaps Team 1 when F is in position 1", async () => {
    const game = makeDoubleGame("F", "M"); // Team1: F then M — wrong order
    const tx = {} as any;
    await fixMixedDoublesPlayerOrder(game, tx);

    const t1p1 = game.players.find(
      (p: any) => p.GamePlayerMembership.team === 1 && p.id === "t1p1"
    );
    const t1p2 = game.players.find(
      (p: any) => p.GamePlayerMembership.team === 1 && p.id === "t1p2"
    );
    expect(t1p1.GamePlayerMembership.update).toHaveBeenCalledWith({ player: 2 }, { transaction: tx });
    expect(t1p2.GamePlayerMembership.update).toHaveBeenCalledWith({ player: 1 }, { transaction: tx });
    // In-memory update
    expect(t1p1.GamePlayerMembership.player).toBe(2);
    expect(t1p2.GamePlayerMembership.player).toBe(1);
  });

  it("swaps Team 2 when F is in position 1", async () => {
    const game = makeDoubleGame("M", "F"); // Team2: F then M — wrong order
    const tx = {} as any;
    await fixMixedDoublesPlayerOrder(game, tx);

    const t2p1 = game.players.find(
      (p: any) => p.GamePlayerMembership.team === 2 && p.id === "t2p1"
    );
    const t2p2 = game.players.find(
      (p: any) => p.GamePlayerMembership.team === 2 && p.id === "t2p2"
    );
    expect(t2p1.GamePlayerMembership.update).toHaveBeenCalledWith({ player: 2 }, { transaction: tx });
    expect(t2p2.GamePlayerMembership.update).toHaveBeenCalledWith({ player: 1 }, { transaction: tx });
    expect(t2p1.GamePlayerMembership.player).toBe(2);
    expect(t2p2.GamePlayerMembership.player).toBe(1);
  });

  it("no-op when needsTeam1Fix but no transaction provided", async () => {
    const game = makeDoubleGame("F", "M"); // Team1 needs fix
    // No transaction passed
    await fixMixedDoublesPlayerOrder(game);
    const t1p1 = game.players.find((p: any) => p.id === "t1p1");
    const t1p2 = game.players.find((p: any) => p.id === "t1p2");
    expect(t1p1.GamePlayerMembership.update).not.toHaveBeenCalled();
    expect(t1p2.GamePlayerMembership.update).not.toHaveBeenCalled();
  });

  it("does not throw when update throws", async () => {
    const game = makeDoubleGame("F", "M");
    const tx = {} as any;
    const t1p1 = game.players.find((p: any) => p.id === "t1p1");
    t1p1.GamePlayerMembership.update = jest.fn().mockRejectedValue(new Error("DB error"));
    await expect(fixMixedDoublesPlayerOrder(game, tx)).resolves.toBeUndefined();
  });
});
