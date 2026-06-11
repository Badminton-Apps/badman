/**
 * T016 — RankingSyncer routes writes through RankingPlaceWriterService.
 *
 * Tests that processSinglePublication calls writer.upsertMany with the
 * collected instances array and the current system — never calling
 * RankingPlace.bulkCreate directly.
 *
 * RankingPlace construction requires a Sequelize instance to be registered.
 * We mock @badman/backend-database entirely with lightweight plain-object
 * stand-ins, defined inside the factory so jest hoisting does not break refs.
 */

// ---------------------------------------------------------------------------
// Mock @badman/backend-database BEFORE importing RankingSyncer
// ---------------------------------------------------------------------------

// Shared mock functions — defined at module scope so tests can reference them
const playerBulkCreateMock = jest.fn().mockResolvedValue([]);
const rankingPlaceBulkCreateMock = jest.fn().mockResolvedValue([]);
const playerFindAllMock = jest.fn();
const rankingPlaceFindAllMock = jest.fn().mockResolvedValue([]);

jest.mock("@badman/backend-database", () => {
  // All classes defined INSIDE the factory to avoid hoisting TDZ issues
  const _playerBulkCreate = jest.fn().mockResolvedValue([]);
  const _rankingPlaceBulkCreate = jest.fn().mockResolvedValue([]);
  const _playerFindAll = jest.fn();

  class _MockRankingPlace {
    id?: string;
    playerId?: string;
    systemId?: string;
    rankingDate?: Date;
    single?: number;
    singlePoints?: number;
    singleRank?: number;
    double?: number;
    doublePoints?: number;
    doubleRank?: number;
    mix?: number;
    mixPoints?: number;
    mixRank?: number;
    gender?: string;
    updatePossible?: boolean;

    constructor(values?: Record<string, unknown>) {
      if (values) Object.assign(this, values);
    }
    toJSON() {
      return { ...this };
    }
    static bulkCreate = _rankingPlaceBulkCreate;
    static findAll = jest.fn().mockResolvedValue([]);
  }

  class _MockPlayer {
    id?: string;
    memberId?: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    fullName?: string;
    constructor(values?: Record<string, unknown>) {
      if (values) Object.assign(this, values);
    }
    toJSON() {
      return { ...this };
    }
    static bulkCreate = _playerBulkCreate;
    static findAll = _playerFindAll;
  }

  class _MockRankingLastPlace {}
  class _MockRankingSystem {}

  return {
    Player: _MockPlayer,
    RankingPlace: _MockRankingPlace,
    RankingLastPlace: _MockRankingLastPlace,
    RankingSystem: _MockRankingSystem,
    CronJob: { findOne: jest.fn() },
    RankingPlaceWriterService: jest.fn(),
    // Expose internal mocks for assertions
    __mocks__: {
      playerBulkCreate: _playerBulkCreate,
      rankingPlaceBulkCreate: _rankingPlaceBulkCreate,
      playerFindAll: _playerFindAll,
    },
  };
});

// ---------------------------------------------------------------------------
// Imports (after mock registration)
// ---------------------------------------------------------------------------
import { RankingSyncer } from "../ranking-sync";
import { Player, RankingPlaceWriterService } from "@badman/backend-database";

// Retrieve internal mocks via the __mocks__ export key
const dbModule = jest.requireMock("@badman/backend-database") as any;
const mocks = dbModule.__mocks__;

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const mockQueue = { add: jest.fn(), process: jest.fn() } as any;
const mockSequelize = { transaction: jest.fn() } as any;
const mockVisualService = { getPoints: jest.fn() } as any;

const stubSystem = (): any => ({
  id: "sys-1",
  amountOfLevels: 12,
  maxDiffLevels: 2,
  primary: true,
});

const stubPublication = (): any => ({
  code: "pub-1",
  name: "Test Pub",
  date: new Date("2025-01-01"),
  usedForUpdate: true,
  visible: true,
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("RankingSyncer.processSinglePublication (T016)", () => {
  let writer: jest.Mocked<RankingPlaceWriterService>;
  let rankingSync: RankingSyncer;

  beforeEach(() => {
    jest.clearAllMocks();

    writer = {
      upsertMany: jest.fn().mockResolvedValue(undefined),
      upsertOne: jest.fn(),
      updateForPlayer: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<RankingPlaceWriterService>;

    rankingSync = new RankingSyncer(mockVisualService, mockQueue, mockSequelize, writer);
  });

  it("calls writer.upsertMany with collected RankingPlace instances and system", async () => {
    const system = stubSystem();
    const publication = stubPublication();

    const categories = [
      { name: "HE/SM", code: "he-sm" },
      { name: "DE/SD", code: "de-sd" },
      { name: "HD/DM", code: "hd-dm" },
      { name: "DD", code: "dd" },
      { name: "GD H/DX M", code: "gdh-dxm" },
      { name: "GD D/DX D", code: "gdd-dxd" },
    ];

    mockVisualService.getPoints.mockResolvedValue([
      { Player1: { MemberID: "M001", Name: "Test Player" }, Level: 5, Totalpoints: 1000, Rank: 10 },
    ]);

    // Create player using the mocked constructor
    const MockPlayerClass = Player as any;
    const mockPlayer = new MockPlayerClass({
      id: "player-uuid",
      memberId: "M001",
      fullName: "Test Player",
    });
    mocks.playerFindAll.mockResolvedValue([mockPlayer]);

    const mockTransaction = {} as any;
    const syncer = rankingSync as any;
    await syncer.processSinglePublication(
      publication,
      categories,
      { visualCode: "vis-1", system, startDate: new Date("2025-01-01") },
      mockTransaction
    );

    expect(writer.upsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ playerId: "player-uuid", systemId: "sys-1" }),
      ]),
      system,
      expect.objectContaining({
        transaction: mockTransaction,
        chunkSize: expect.any(Number),
        propagateGameMemberships: false,
      })
    );
  });

  it("does NOT call RankingPlace.bulkCreate for ranking data", async () => {
    const system = stubSystem();
    const publication = stubPublication();
    const categories = [{ name: "HE/SM", code: "he-sm" }];

    mockVisualService.getPoints.mockResolvedValue([
      { Player1: { MemberID: "M002", Name: "Known Player" }, Level: 3, Totalpoints: 500, Rank: 5 },
    ]);

    const MockPlayerClass = Player as any;
    const mockPlayer = new MockPlayerClass({
      id: "player-2",
      memberId: "M002",
      fullName: "Known Player",
    });
    mocks.playerFindAll.mockResolvedValue([mockPlayer]);

    const mockTransaction = {} as any;
    const syncer = rankingSync as any;
    await syncer.processSinglePublication(
      publication,
      categories,
      { visualCode: "vis-1", system, startDate: new Date("2025-01-01") },
      mockTransaction
    );

    // RankingPlace.bulkCreate must not be called — writer owns ranking writes
    expect(mocks.rankingPlaceBulkCreate).not.toHaveBeenCalled();
    expect(writer.upsertMany).toHaveBeenCalled();
  });

  it("upsertMany receives empty array when no ranking points are returned", async () => {
    const system = stubSystem();
    const publication = stubPublication();
    const categories = [{ name: "HE/SM", code: "he-sm" }];

    mockVisualService.getPoints.mockResolvedValue([]);
    mocks.playerFindAll.mockResolvedValue([]);

    const mockTransaction = {} as any;
    const syncer = rankingSync as any;
    await syncer.processSinglePublication(
      publication,
      categories,
      { visualCode: "vis-1", system, startDate: new Date("2025-01-01") },
      mockTransaction
    );

    // No instances → upsertMany called with empty array
    expect(writer.upsertMany).toHaveBeenCalledWith([], system, expect.anything());
  });
});
