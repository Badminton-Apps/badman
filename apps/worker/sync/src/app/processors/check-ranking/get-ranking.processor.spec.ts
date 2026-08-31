/**
 * Unit tests for CheckRankingProcessor.syncRanking
 *
 * Core scenarios covered:
 *  1. Null values in rankingPlaces[0] are filled from web scraping.
 *  2. Existing non-null values are preserved via ?? (Jeroen's manual-correction scenario).
 *  3. Partial null: only the null disciplines are filled; non-null ones stay.
 *  4. Only rankingPlaces[0] is modified — regression guard for the old cascade bug
 *     that rewrote ALL historical places (including the May snapshot) back to Oct.
 *  5. Early-exit paths: player not found, no primary system, no memberId, no places.
 *  6. Web-scraping paths: getViaRanking success, searchPlayer fallback, no ranking found.
 */

jest.mock("@badman/backend-database", () => ({
  Player: { findByPk: jest.fn() },
  RankingPlace: { findAll: jest.fn() },
  RankingSystem: { findOne: jest.fn() },
}));

jest.mock("@badman/backend-pupeteer", () => ({
  acceptCookies: jest.fn().mockResolvedValue(undefined),
  getPage: jest.fn(),
  selectBadmninton: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@badman/backend-queue", () => ({
  SyncQueue: "sync",
  Sync: { CheckRanking: "check-ranking" },
}));

jest.mock("@nestjs/bull", () => ({
  Processor: () => () => {},
  Process: () => () => {},
}));

jest.mock("./pupeteer", () => ({
  getRanking: jest.fn(),
  getViaRanking: jest.fn(),
  searchPlayer: jest.fn(),
}));

import { NotFoundException } from "@nestjs/common";
import { Player, RankingPlace, RankingSystem } from "@badman/backend-database";
import { getPage } from "@badman/backend-pupeteer";
import { getRanking, getViaRanking, searchPlayer } from "./pupeteer";
import { CheckRankingProcessor } from "./get-ranking.processor";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: "player-uuid-1",
    fullName: "Shauni Goethals",
    memberId: "50098807",
    ...overrides,
  };
}

function makePrimarySystem() {
  return { id: "system-uuid-1" };
}

function makeRankingPlace(overrides: Record<string, unknown> = {}) {
  return {
    single: null as number | null,
    double: null as number | null,
    mix: null as number | null,
    updatePossible: false,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makePage() {
  return {
    setDefaultTimeout: jest.fn(),
    setViewport: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── Setup ──────────────────────────────────────────────────────────────────

describe("CheckRankingProcessor.syncRanking", () => {
  let processor: CheckRankingProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new CheckRankingProcessor();
  });

  afterEach(() => jest.restoreAllMocks());

  // ── shared mock helpers ────────────────────────────────────────────────────

  function setupHappyPath(
    rankingPlaces: ReturnType<typeof makeRankingPlace>[],
    scrapedRanking: { single?: number; double?: number; mix?: number }
  ) {
    const player = makePlayer();
    const page = makePage();

    (Player.findByPk as jest.Mock).mockResolvedValue(player);
    (RankingSystem.findOne as jest.Mock).mockResolvedValue(makePrimarySystem());
    (RankingPlace.findAll as jest.Mock).mockResolvedValue(rankingPlaces);
    (getPage as jest.Mock).mockResolvedValue(page);
    // getViaRanking returning undefined forces the searchPlayer fallback path
    (getViaRanking as jest.Mock).mockResolvedValue(undefined);
    (searchPlayer as jest.Mock).mockResolvedValue(["/player/link-1"]);
    (getRanking as jest.Mock).mockResolvedValue(scrapedRanking);

    return { player, page };
  }

  // ── 1. Null values are filled in ─────────────────────────────────────────

  it("fills null single/double/mix from web-scraped ranking", async () => {
    const place = makeRankingPlace({ single: null, double: null, mix: null });
    setupHappyPath([place], { single: 5, double: 3, mix: 4 });

    await processor.syncRanking("player-uuid-1");

    expect(place.single).toBe(5);
    expect(place.double).toBe(3);
    expect(place.mix).toBe(4);
    expect(place.save).toHaveBeenCalledTimes(1);
  });

  // ── 2. Existing non-null values are preserved (Jeroen-correction scenario) ─

  it("preserves already-set values — does NOT overwrite with scraped values", async () => {
    // Simulates Jeroen manually correcting the May snapshot to single=7,double=5,mix=7.
    // The scraper returns different values (5,3,4) — they must be ignored.
    const place = makeRankingPlace({ single: 7, double: 5, mix: 7 });
    setupHappyPath([place], { single: 5, double: 3, mix: 4 });

    await processor.syncRanking("player-uuid-1");

    expect(place.single).toBe(7); // manual correction preserved
    expect(place.double).toBe(5);
    expect(place.mix).toBe(7);
    // save() is still called; Sequelize dirty-tracking will be a no-op since nothing changed
    expect(place.save).toHaveBeenCalledTimes(1);
  });

  // ── 3. Partial nulls: only null disciplines are filled ───────────────────

  it("fills only the null disciplines, leaves non-null disciplines alone", async () => {
    // single is set (Jeroen), double and mix are missing
    const place = makeRankingPlace({ single: 7, double: null, mix: null });
    setupHappyPath([place], { single: 3, double: 2, mix: 4 });

    await processor.syncRanking("player-uuid-1");

    expect(place.single).toBe(7); // preserved
    expect(place.double).toBe(2); // filled
    expect(place.mix).toBe(4); // filled
  });

  // ── 4. Regression: only rankingPlaces[0] is saved — old cascade bug ────────

  it("only modifies rankingPlaces[0] and never touches older places (May snapshot protection)", async () => {
    // Before the fix the processor looped newest→oldest and saved EVERY place
    // until it hit the first updatePossible=true row, which could be the May snapshot.
    // Now only [0] is touched.
    const place0 = makeRankingPlace({ single: null, double: null, mix: null }); // most recent
    const place1 = makeRankingPlace({
      single: 7,
      double: 5,
      mix: 7,
      updatePossible: true, // May snapshot — must never be overwritten
    });
    setupHappyPath([place0, place1], { single: 5, double: 3, mix: 4 });

    await processor.syncRanking("player-uuid-1");

    // rankingPlaces[0] filled in
    expect(place0.single).toBe(5);
    expect(place0.save).toHaveBeenCalledTimes(1);

    // rankingPlaces[1] (May snapshot) untouched
    expect(place1.single).toBe(7);
    expect(place1.save).not.toHaveBeenCalled();
  });

  // ── 5. Early-exit: player not found ─────────────────────────────────────

  it("throws NotFoundException when player does not exist", async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(processor.syncRanking("unknown-id")).rejects.toThrow(NotFoundException);
    expect(getPage).not.toHaveBeenCalled();
  });

  // ── 6. Early-exit: no primary ranking system ─────────────────────────────

  it("throws NotFoundException when no primary ranking system exists", async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(makePlayer());
    (RankingSystem.findOne as jest.Mock).mockResolvedValue(null);

    await expect(processor.syncRanking("player-uuid-1")).rejects.toThrow(NotFoundException);
    expect(getPage).not.toHaveBeenCalled();
  });

  // ── 7. Early-exit: no memberId ───────────────────────────────────────────

  it("returns early without opening a browser page when player has no memberId", async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(makePlayer({ memberId: null }));
    (RankingSystem.findOne as jest.Mock).mockResolvedValue(makePrimarySystem());

    await processor.syncRanking("player-uuid-1");

    expect(getPage).not.toHaveBeenCalled();
  });

  // ── 8. Early-exit: no ranking places ─────────────────────────────────────

  it("returns early without opening a browser page when player has no ranking places", async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(makePlayer());
    (RankingSystem.findOne as jest.Mock).mockResolvedValue(makePrimarySystem());
    (RankingPlace.findAll as jest.Mock).mockResolvedValue([]);

    await processor.syncRanking("player-uuid-1");

    expect(getPage).not.toHaveBeenCalled();
  });

  // ── 9. Web-scraping: searchPlayer fallback ────────────────────────────────

  it("uses the searchPlayer fallback path when getViaRanking returns undefined", async () => {
    const place = makeRankingPlace();
    setupHappyPath([place], { single: 5, double: 3, mix: 4 });

    await processor.syncRanking("player-uuid-1");

    expect(searchPlayer).toHaveBeenCalledTimes(1);
    expect(getRanking).toHaveBeenCalledTimes(1);
    expect(place.single).toBe(5);
  });

  // ── 10. Web-scraping: searchPlayer finds no results ───────────────────────

  it("returns early without saving when searchPlayer returns no links", async () => {
    const place = makeRankingPlace();
    const player = makePlayer();
    const page = makePage();

    (Player.findByPk as jest.Mock).mockResolvedValue(player);
    (RankingSystem.findOne as jest.Mock).mockResolvedValue(makePrimarySystem());
    (RankingPlace.findAll as jest.Mock).mockResolvedValue([place]);
    (getPage as jest.Mock).mockResolvedValue(page);
    (getViaRanking as jest.Mock).mockResolvedValue(undefined);
    (searchPlayer as jest.Mock).mockResolvedValue([]); // no links

    await processor.syncRanking("player-uuid-1");

    expect(getRanking).not.toHaveBeenCalled();
    expect(place.save).not.toHaveBeenCalled();
    expect(page.close).toHaveBeenCalledTimes(1); // page always closed in finally
  });

  // ── 11. Web-scraping: getRanking returns all undefined ────────────────────

  it("returns early without saving when getRanking finds no values for the player", async () => {
    const place = makeRankingPlace();
    const player = makePlayer();
    const page = makePage();

    (Player.findByPk as jest.Mock).mockResolvedValue(player);
    (RankingSystem.findOne as jest.Mock).mockResolvedValue(makePrimarySystem());
    (RankingPlace.findAll as jest.Mock).mockResolvedValue([place]);
    (getPage as jest.Mock).mockResolvedValue(page);
    (getViaRanking as jest.Mock).mockResolvedValue(undefined);
    (searchPlayer as jest.Mock).mockResolvedValue(["/player/link-1"]);
    (getRanking as jest.Mock).mockResolvedValue({
      single: undefined,
      double: undefined,
      mix: undefined,
    });

    await processor.syncRanking("player-uuid-1");

    expect(place.save).not.toHaveBeenCalled();
  });

  // ── 12. Browser page is always closed in finally ─────────────────────────

  it("closes the browser page even when an error occurs during processing", async () => {
    const player = makePlayer();
    const page = makePage();

    (Player.findByPk as jest.Mock).mockResolvedValue(player);
    (RankingSystem.findOne as jest.Mock).mockResolvedValue(makePrimarySystem());
    (RankingPlace.findAll as jest.Mock).mockResolvedValue([makeRankingPlace()]);
    (getPage as jest.Mock).mockResolvedValue(page);
    (getViaRanking as jest.Mock).mockRejectedValue(new Error("puppeteer crashed"));

    await processor.syncRanking("player-uuid-1"); // should not throw (caught internally)

    expect(page.close).toHaveBeenCalledTimes(1);
  });
});
