jest.mock("@badman/backend-database", () => {
  class FakeModel {
    constructor(values: Record<string, unknown>) {
      Object.assign(this, values);
    }
    toJSON() {
      return { ...this };
    }
  }
  class Player extends FakeModel {
    static findAll = jest.fn();
    static bulkCreate = jest.fn().mockResolvedValue(undefined);
    id: string;
    constructor(values: Record<string, unknown>) {
      super(values);
      this.id = `new-${values["memberId"]}`;
    }
  }
  class RankingPlace extends FakeModel {
    static bulkCreate = jest.fn().mockResolvedValue(undefined);
  }
  return {
    Player,
    RankingLastPlace: {},
    RankingPlace,
    RankingSystem: { findOne: jest.fn() },
  };
});

jest.mock("@badman/backend-queue", () => ({
  Sync: { CheckRanking: "check-ranking" },
}));

jest.mock("../../../utils", () => ({
  ...jest.requireActual("../../../utils"),
  // Stand-ins for the two kinds of remap rule: by memberId and by name.
  correctWrongPlayers: jest.fn((player: { memberId?: string; firstName?: string }) => {
    if (player.memberId === "REMAPPED") {
      return { ...player, memberId: "OWN" };
    }
    if (player.firstName === "Renamed") {
      return { ...player, firstName: "Corrected", memberId: "OTHER" };
    }
    return player;
  }),
  ensureDefaultRanking: jest.fn(),
}));

import { Player, RankingPlace } from "@badman/backend-database";
import { Logger } from "@nestjs/common";
import { RankingSyncer } from "../ranking-sync";

const CATEGORIES = [
  { name: "HE/SM", code: "single-m" },
  { name: "DE/SD", code: "single-f" },
  { name: "HD/DM", code: "double-m" },
  { name: "DD", code: "double-f" },
  { name: "GD H/DX M", code: "mix-m" },
  { name: "GD D/DX D", code: "mix-f" },
];

const PUBLICATION = {
  usedForUpdate: false,
  code: "pub-1",
  name: "Week 44",
  year: "2026",
  week: "44",
  publicationDate: "2026-10-26",
  visible: true,
  date: new Date("2026-10-26"),
};

const RANKING = {
  visualCode: "ranking-code",
  system: { id: "system-1" },
  startDate: new Date("2026-07-01"),
};

function points(memberId: string, level: number, name = `Player ${memberId}`) {
  return {
    Player1: { MemberID: memberId, Name: name },
    Level: level,
    Totalpoints: level * 100,
    Rank: level,
  };
}

async function syncPublication(
  pointsByCategory: Record<string, ReturnType<typeof points>[]>,
  traceMemberIds: ReadonlySet<string> = new Set()
) {
  const visualService = {
    getPoints: jest.fn(
      async (_ranking: string, _publication: string, category: string) =>
        pointsByCategory[category] ?? []
    ),
  };
  const syncer = new RankingSyncer(visualService as never, {} as never, {} as never);

  await (
    syncer as unknown as {
      processSinglePublication: (...args: unknown[]) => Promise<unknown>;
    }
  ).processSinglePublication(PUBLICATION, CATEGORIES, RANKING, {}, traceMemberIds);

  return (RankingPlace.bulkCreate as jest.Mock).mock.calls.flatMap(([chunk]) => chunk);
}

function placeOf(places: Record<string, unknown>[], playerId: string) {
  return places.find((place) => place["playerId"] === playerId);
}

type PlayerQuery = { where: { memberId: Record<symbol, string[]> } };

function requestedMemberIds({ where }: PlayerQuery) {
  return Object.getOwnPropertySymbols(where.memberId).flatMap((op) => where.memberId[op]);
}

describe("RankingSyncer.processSinglePublication", () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
    jest.spyOn(Logger.prototype, "debug").mockImplementation();
    (Player.findAll as jest.Mock).mockImplementation(async (query: PlayerQuery) =>
      [{ id: "player-own", memberId: "OWN" }].filter((player) =>
        requestedMemberIds(query).includes(player.memberId)
      )
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    ["the player's own memberId comes first", [points("OWN", 4), points("REMAPPED", 11)]],
    ["the remapped memberId comes first", [points("REMAPPED", 11), points("OWN", 4)]],
  ])("ranks each federation memberId on its own player when %s", async (_, doubles) => {
    const places = await syncPublication({ "double-m": doubles });

    expect(placeOf(places, "player-own")).toMatchObject({ double: 4, doublePoints: 400 });
    expect(placeOf(places, "new-REMAPPED")).toMatchObject({ double: 11 });
  });

  it("looks players up by the memberIds the federation sent", async () => {
    await syncPublication({ "double-m": [points("REMAPPED", 11)] });

    const requested = (Player.findAll as jest.Mock).mock.calls.flatMap(([query]) =>
      requestedMemberIds(query)
    );
    expect(requested).toEqual(["REMAPPED"]);
  });

  it("keeps the federation memberId on a new player while correcting the name", async () => {
    await syncPublication({ "single-m": [points("NEW1", 9, "Renamed Person")] });

    const created = (Player.bulkCreate as jest.Mock).mock.calls.flatMap(([rows]) => rows);
    expect(created).toEqual([
      expect.objectContaining({ memberId: "NEW1", firstName: "Corrected", lastName: "Person" }),
    ]);
  });

  it("combines the categories of a single memberId into one place", async () => {
    const places = await syncPublication({
      "single-m": [points("OWN", 6)],
      "double-m": [points("OWN", 4)],
      "mix-m": [points("OWN", 6)],
    });

    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ playerId: "player-own", single: 6, double: 4, mix: 6 });
  });

  it("logs every level written for a traced memberId and nothing for the others", async () => {
    await syncPublication(
      { "single-m": [points("OWN", 6), points("NEW1", 9)], "double-m": [points("OWN", 4)] },
      new Set(["OWN"])
    );

    const traced = log.mock.calls
      .map(([message]) => `${message}`)
      .filter((m) => m.includes("[trace]"));
    expect(traced).toEqual([
      expect.stringMatching(/Week 44 single M: memberId OWN -> player player-own, level 6/),
      expect.stringMatching(/Week 44 double M: memberId OWN -> player player-own, level 4/),
    ]);
  });
});
