/**
 * T021 — CheckRankingProcessor routes writes through RankingPlaceWriterService.
 *
 * Tests that syncRanking:
 * - Calls writer.updateForPlayer with extracted ranking values
 * - Skips write when player not found
 * - Skips write when primary system not found
 * - Skips write when no ranking places exist for player
 * - Only skips derivation when ALL three categories are zero (partial results OK)
 */
import {
  Player,
  RankingPlace,
  RankingPlaceWriterService,
  RankingSystem,
} from "@badman/backend-database";
import { CheckRankingProcessor } from "./get-ranking.processor";

// Mock puppeteer imports so tests do not launch a real browser
jest.mock("@badman/backend-pupeteer", () => ({
  acceptCookies: jest.fn().mockResolvedValue(undefined),
  getPage: jest.fn().mockResolvedValue({
    setDefaultTimeout: jest.fn(),
    setViewport: jest.fn(),
    close: jest.fn(),
  }),
  selectBadmninton: jest.fn().mockResolvedValue(undefined),
}));

// Mock the puppeteer helper functions from the local pupeteer/ dir
jest.mock("./pupeteer", () => ({
  getRanking: jest.fn(),
  getViaRanking: jest.fn(),
  searchPlayer: jest.fn(),
}));

import { getRanking, getViaRanking, searchPlayer } from "./pupeteer";
import { getPage } from "@badman/backend-pupeteer";

const mockGetRanking = getRanking as jest.MockedFunction<typeof getRanking>;
const mockGetViaRanking = getViaRanking as jest.MockedFunction<typeof getViaRanking>;
const mockSearchPlayer = searchPlayer as jest.MockedFunction<typeof searchPlayer>;

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const stubPlayer = (overrides?: Partial<Player>): Player =>
  ({
    id: "player-1",
    memberId: "M001",
    fullName: "Test Player",
    ...overrides,
  }) as unknown as Player;

const stubSystem = (): RankingSystem =>
  ({
    id: "sys-1",
    primary: true,
    amountOfLevels: 12,
    maxDiffLevels: 2,
  }) as unknown as RankingSystem;

const stubRankingPlace = (): RankingPlace =>
  ({
    id: "rp-1",
    playerId: "player-1",
    systemId: "sys-1",
    rankingDate: new Date("2025-01-01"),
    single: 5,
    double: 5,
    mix: 6,
  }) as unknown as RankingPlace;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("CheckRankingProcessor (T021)", () => {
  let writer: jest.Mocked<RankingPlaceWriterService>;
  let processor: CheckRankingProcessor;

  beforeEach(() => {
    writer = {
      updateForPlayer: jest.fn().mockResolvedValue(undefined),
      upsertMany: jest.fn(),
      upsertOne: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<RankingPlaceWriterService>;

    processor = new CheckRankingProcessor(writer);

    // Reset mocks
    mockGetRanking.mockReset();
    mockGetViaRanking.mockReset();
    mockSearchPlayer.mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

  it("throws NotFoundException when player not found", async () => {
    jest.spyOn(Player, "findByPk").mockResolvedValue(null);
    const { NotFoundException } = await import("@nestjs/common");

    await expect(processor.syncRanking("missing")).rejects.toThrow(NotFoundException);
    expect(writer.updateForPlayer).not.toHaveBeenCalled();
  });

  it("returns early when primary system not found", async () => {
    const player = stubPlayer();
    jest.spyOn(Player, "findByPk").mockResolvedValue(player);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(null);
    const { NotFoundException } = await import("@nestjs/common");

    await expect(processor.syncRanking("player-1")).rejects.toThrow(NotFoundException);
    expect(writer.updateForPlayer).not.toHaveBeenCalled();
  });

  it("returns early when player has no memberId", async () => {
    const player = stubPlayer({ memberId: undefined });
    jest.spyOn(Player, "findByPk").mockResolvedValue(player);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());

    await processor.syncRanking("player-1");

    expect(writer.updateForPlayer).not.toHaveBeenCalled();
  });

  it("returns early when player has no ranking places", async () => {
    const player = stubPlayer();
    jest.spyOn(Player, "findByPk").mockResolvedValue(player);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
    jest.spyOn(RankingPlace, "findAll").mockResolvedValue([]);

    await processor.syncRanking("player-1");

    expect(writer.updateForPlayer).not.toHaveBeenCalled();
  });

  it("calls writer.updateForPlayer with extracted ranking via getViaRanking path", async () => {
    const player = stubPlayer();
    jest.spyOn(Player, "findByPk").mockResolvedValue(player);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
    jest.spyOn(RankingPlace, "findAll").mockResolvedValue([stubRankingPlace()]);

    // getViaRanking succeeds (returns truthy)
    mockGetViaRanking.mockResolvedValue("https://toernooi.nl/player/M001" as any);
    // getRanking returns levels
    mockGetRanking.mockResolvedValue({ single: 3, double: 4, mix: 5 } as any);

    await processor.syncRanking("player-1");

    expect(writer.updateForPlayer).toHaveBeenCalledWith(
      "player-1",
      expect.objectContaining({ id: "sys-1" }),
      { single: 3, double: 4, mix: 5 },
      { propagateGameMemberships: true }
    );
  });

  it("falls back to searchPlayer path when getViaRanking returns falsy", async () => {
    const player = stubPlayer();
    jest.spyOn(Player, "findByPk").mockResolvedValue(player);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
    jest.spyOn(RankingPlace, "findAll").mockResolvedValue([stubRankingPlace()]);

    mockGetViaRanking.mockResolvedValue(null as any);
    mockSearchPlayer.mockResolvedValue(["player/M001"] as any);
    const mockPage = await (getPage as jest.Mock)();
    mockPage.goto = jest.fn().mockResolvedValue(undefined);
    mockGetRanking.mockResolvedValue({ single: 7, double: 7, mix: 8 } as any);

    await processor.syncRanking("player-1");

    expect(writer.updateForPlayer).toHaveBeenCalledWith(
      "player-1",
      expect.objectContaining({ id: "sys-1" }),
      expect.objectContaining({ single: 7, double: 7, mix: 8 }),
      { propagateGameMemberships: true }
    );
  });

  it("skips write when all three categories return zero/undefined", async () => {
    const player = stubPlayer();
    jest.spyOn(Player, "findByPk").mockResolvedValue(player);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
    jest.spyOn(RankingPlace, "findAll").mockResolvedValue([stubRankingPlace()]);

    mockGetViaRanking.mockResolvedValue(null as any);
    mockSearchPlayer.mockResolvedValue([]);

    await processor.syncRanking("player-1");

    // No links → no ranking found → skip
    expect(writer.updateForPlayer).not.toHaveBeenCalled();
  });

  it("proceeds when only one category found (partial result from web)", async () => {
    const player = stubPlayer();
    jest.spyOn(Player, "findByPk").mockResolvedValue(player);
    jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
    jest.spyOn(RankingPlace, "findAll").mockResolvedValue([stubRankingPlace()]);

    mockGetViaRanking.mockResolvedValue("https://toernooi.nl/player/M001" as any);
    // Only single returned — double and mix are undefined
    mockGetRanking.mockResolvedValue({ single: 4, double: undefined, mix: undefined } as any);

    await processor.syncRanking("player-1");

    // Should still write — partial result acceptable, writer fills from previous
    expect(writer.updateForPlayer).toHaveBeenCalledWith(
      "player-1",
      expect.objectContaining({ id: "sys-1" }),
      { single: 4, double: undefined, mix: undefined },
      { propagateGameMemberships: true }
    );
  });
});
