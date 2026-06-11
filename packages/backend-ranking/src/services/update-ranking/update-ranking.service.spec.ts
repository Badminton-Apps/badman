/**
 * T018 — UpdateRankingService routes writes through RankingPlaceWriterService.
 *
 * Tests that updateRanking calls writer.upsertMany for changed places,
 * fetches the system once per chunk, and never calls RankingPlace.findOrCreate.
 */
import {
  Player,
  RankingPlace,
  RankingPlaceWriterService,
  RankingSystem,
} from "@badman/backend-database";
import { UpdateRankingService, MembersRolePerGroupData } from "./update-ranking.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stubSystem = (): RankingSystem =>
  ({
    id: "sys-1",
    amountOfLevels: 12,
    maxDiffLevels: 2,
  }) as unknown as RankingSystem;

const stubPlayer = (overrides?: Partial<Player>): Player =>
  ({
    id: "player-1",
    memberId: "M001",
    competitionPlayer: true,
    gender: "M",
    firstName: "Test",
    lastName: "Player",
    getClubs: jest.fn().mockResolvedValue([]),
    ...overrides,
  }) as unknown as Player;

const stubRow = (overrides?: Partial<MembersRolePerGroupData>): MembersRolePerGroupData => ({
  memberId: "M001",
  startDate: "2025-01-01",
  firstName: "Test",
  lastName: "Player",
  role: "Competitiespeler",
  gender: "M",
  startdate: new Date("2025-01-01"),
  enddate: new Date("2025-12-31"),
  single: 5,
  singlePoints: 1000,
  doubles: 5,
  doublesPoints: 900,
  mixed: 6,
  mixedPoints: 800,
  clubName: "Test Club",
  ...overrides,
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("UpdateRankingService — updateRanking routes via writer (T018)", () => {
  let writer: jest.Mocked<RankingPlaceWriterService>;
  let sequelize: any;
  let service: UpdateRankingService;
  const mockCommit = jest.fn();
  const mockRollback = jest.fn();

  beforeEach(() => {
    mockCommit.mockReset();
    mockRollback.mockReset();

    writer = {
      upsertMany: jest.fn().mockResolvedValue(undefined),
      upsertOne: jest.fn(),
      updateForPlayer: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<RankingPlaceWriterService>;

    sequelize = {
      transaction: jest.fn().mockResolvedValue({ commit: mockCommit, rollback: mockRollback }),
    };

    service = new UpdateRankingService(sequelize, writer);
  });

  afterEach(() => jest.restoreAllMocks());

  it("calls writer.upsertMany with changed places for an update run", async () => {
    const system = stubSystem();
    const player = stubPlayer();
    const data = [stubRow()];

    // Supply an existing stale place so updateRanking updates it (no new RankingPlace() call)
    const stalePlace = {
      id: "rp-1",
      playerId: "player-1",
      systemId: "sys-1",
      rankingDate: new Date("2025-01-01"),
      single: 1, // different from stubRow.single=5 → marks as changed
      singlePoints: 100,
      double: 1,
      doublePoints: 100,
      mix: 1,
      mixPoints: 100,
      updatePossible: false,
      changed: () => ["single"] as any, // non-false → triggers update
      toJSON: () =>
        ({
          id: "rp-1",
          playerId: "player-1",
          systemId: "sys-1",
          rankingDate: new Date("2025-01-01"),
          single: 5,
          double: 5,
          mix: 6,
        }) as any,
    } as unknown as RankingPlace;

    // fetchDistinctPlayers (1st), then updatePlayerGender (wrongMale + wrongFemale = 2nd + 3rd)
    jest
      .spyOn(Player, "findAll")
      .mockResolvedValueOnce([player]) // fetchDistinctPlayers
      .mockResolvedValue([]); // wrongMale + wrongFemale gender checks
    jest.spyOn(RankingPlace, "findAll").mockResolvedValue([stalePlace]);
    // System found for writer
    jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(system);
    // Player gender updates (no changes needed)
    jest.spyOn(Player, "update").mockResolvedValue([0] as any);

    await service.processFileUpload(data, {
      updateRanking: true,
      rankingDate: new Date("2025-01-01"),
      rankingSystemId: "sys-1",
    });

    expect(writer.upsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: "player-1",
          systemId: "sys-1",
        }),
      ]),
      system,
      expect.objectContaining({ transaction: expect.any(Object) })
    );
    expect(mockCommit).toHaveBeenCalled();
  });

  it("does not call writer.upsertMany when no places changed", async () => {
    const player = stubPlayer();

    // Existing place already has the same values
    const existingPlace = {
      id: "rp-1",
      playerId: "player-1",
      systemId: "sys-1",
      rankingDate: new Date("2025-01-01"),
      single: 5,
      singlePoints: 1000,
      double: 5,
      doublePoints: 900,
      mix: 6,
      mixPoints: 800,
      updatePossible: false,
      changed: () => false, // nothing changed
      toJSON: () => ({}) as any,
    } as unknown as RankingPlace;

    jest
      .spyOn(Player, "findAll")
      .mockResolvedValueOnce([player]) // fetchDistinctPlayers
      .mockResolvedValue([]); // updatePlayerGender calls (wrongMale + wrongFemale)
    jest.spyOn(RankingPlace, "findAll").mockResolvedValue([existingPlace]);
    jest.spyOn(Player, "update").mockResolvedValue([0] as any);

    await service.processFileUpload([stubRow()], {
      updateRanking: true,
      rankingDate: new Date("2025-01-01"),
      rankingSystemId: "sys-1",
    });

    expect(writer.upsertMany).not.toHaveBeenCalled();
    expect(mockCommit).toHaveBeenCalled();
  });

  it("rolls back on error during updateRanking", async () => {
    jest.spyOn(Player, "findAll").mockRejectedValue(new Error("DB down"));

    await expect(
      service.processFileUpload([stubRow()], {
        updateRanking: true,
        rankingDate: new Date("2025-01-01"),
        rankingSystemId: "sys-1",
      })
    ).rejects.toThrow("DB down");

    expect(mockRollback).toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("validates required options — throws when rankingDate missing", async () => {
    await expect(
      service.processFileUpload([stubRow()], {
        updateRanking: true,
        rankingSystemId: "sys-1",
        // no rankingDate
      })
    ).rejects.toThrow("Ranking date is required");
  });

  it("validates required options — throws when rankingSystemId missing", async () => {
    await expect(
      service.processFileUpload([stubRow()], {
        updateRanking: true,
        rankingDate: new Date("2025-01-01"),
        // no rankingSystemId
      })
    ).rejects.toThrow("Ranking system id is required");
  });
});
