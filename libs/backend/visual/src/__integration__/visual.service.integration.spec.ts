import * as dotenv from "dotenv";
import * as path from "path";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { configSchema, load } from "@badman/utils";
import { VisualModule } from "../visual.module";
import { VisualService } from "../services/visual.service";
import { XmlMatch, XmlTeamMatch } from "../utils/visual-result";

// Load .env from monorepo root — must happen before any import reads env vars.
dotenv.config({ path: path.resolve(__dirname, "../../../../../.env") });

// Honour useCache=false in non-production so we can bypass the in-memory cache
// when we want fresh data.
process.env["VISUAL_FORCE_CACHE_DEV"] = "true";

const FIXTURES = {
  // PBA competitie 2025-2026 — confirmed Flemish team competition (TypeID=1)
  eventCode: "A0E9B3BE-1D47-428D-8EB5-7807839F7498",
  // VR DrawCode "1" = "1e Provinciale - A"
  drawCode: "1",
} as const;

const CREDS_PRESENT = !!process.env["VR_API_USER"] && !!process.env["VR_API_PASS"];

const describeOrSkip = CREDS_PRESENT ? describe : describe.skip;

describeOrSkip("VisualService (integration — real VR API)", () => {
  jest.setTimeout(60_000);

  let module: TestingModule;
  let service: VisualService;

  // Shared fetched data — loaded once in beforeAll
  let drawEncounters: XmlTeamMatch[];
  let playedTeamMatchCode: number;
  let playedGames: XmlMatch[];

  beforeAll(async () => {
    // Simple in-memory stub for CACHE_MANAGER — avoids bringing up Keyv/Redis.
    const cacheStore = new Map<string, unknown>();
    const cacheStub = {
      get: (key: string) => Promise.resolve(cacheStore.get(key)),
      set: (key: string, value: unknown) => {
        cacheStore.set(key, value);
        return Promise.resolve();
      },
      del: (key: string) => {
        cacheStore.delete(key);
        return Promise.resolve();
      },
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema: configSchema,
          load: [load],
        }),
        VisualModule,
      ],
    })
      .overrideProvider(CACHE_MANAGER)
      .useValue(cacheStub)
      .compile();

    service = module.get(VisualService);

    // 1. Draw-level: GET /Draw/{drawCode}/Match → XmlTeamMatch[] (one per encounter)
    drawEncounters = (await service.getGames(
      FIXTURES.eventCode,
      FIXTURES.drawCode,
      false,
    )) as XmlTeamMatch[];

    // 2. Find a real played TeamMatch code from the draw response.
    //    We cannot use our DB's `encounter.visualCode` because it doesn't
    //    necessarily match the VR TeamMatch Code (they can drift).
    const played = drawEncounters.find(
      (m) => m.Winner != null && m.Winner > 0 && (m.ScoreStatus as unknown as number) === 0,
    );
    if (!played) {
      throw new Error("No played encounter found in draw — pick a different drawCode");
    }
    playedTeamMatchCode = played.Code as unknown as number;

    // 3. Encounter-level: GET /TeamMatch/{matchId} → XmlMatch[] (individual games)
    //    IMPORTANT: encounter-level games must be fetched via getTeamMatch, NOT
    //    getGames. getGames hits /Draw/{id}/Match which returns TeamMatch[].
    playedGames = await service.getTeamMatch(FIXTURES.eventCode, playedTeamMatchCode);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe("getGames at draw level → XmlTeamMatch[]", () => {
    it("returns a non-empty array (one item per encounter in the draw)", () => {
      expect(Array.isArray(drawEncounters)).toBe(true);
      expect(drawEncounters.length).toBeGreaterThan(0);
    });

    it("each item has numeric Code (type normalization)", () => {
      for (const enc of drawEncounters) {
        expect(typeof enc.Code).toBe("number");
      }
    });

    it("items have Team1 and Team2 objects", () => {
      for (const enc of drawEncounters) {
        expect(enc.Team1).toBeDefined();
        expect(enc.Team2).toBeDefined();
      }
    });

    it("items do NOT have MatchOrder (that field is on XmlMatch only)", () => {
      for (const enc of drawEncounters) {
        expect((enc as unknown as XmlMatch).MatchOrder).toBeUndefined();
      }
    });

    it("ScoreStatus when present is a number", () => {
      for (const enc of drawEncounters) {
        if (enc.ScoreStatus != null) {
          expect(typeof enc.ScoreStatus).toBe("number");
        }
      }
    });

    it("Sets on a completed encounter represents the TEAM match score (not set scores)", () => {
      const completed = drawEncounters.find(
        (m) => (m.ScoreStatus as unknown as number) === 0 && m.Sets != null,
      );
      if (!completed?.Sets) return;
      // Draw-level `Sets.Set` holds a single `{Team1, Team2}` with the
      // encounter's aggregate game score (e.g. 6-2, not 21-19).
      const set = Array.isArray(completed.Sets.Set) ? completed.Sets.Set[0] : completed.Sets.Set;
      if (set == null) return;
      if (set.Team1 != null) expect(typeof set.Team1).toBe("number");
      if (set.Team2 != null) expect(typeof set.Team2).toBe("number");
    });
  });

  describe("getTeamMatch at encounter level → XmlMatch[]", () => {
    it("returns exactly 8 games for a played competition encounter", () => {
      expect(Array.isArray(playedGames)).toBe(true);
      expect(playedGames).toHaveLength(8);
    });

    it("each item has numeric Code, MatchOrder, MatchTypeID", () => {
      for (const game of playedGames) {
        expect(typeof game.Code).toBe("number");
        expect(typeof game.MatchOrder).toBe("number");
        expect(typeof game.MatchTypeID).toBe("number");
      }
    });

    it("MatchTypeID is one of the known XmlMatchTypeID values", () => {
      const allowed = new Set([1, 2, 3, 4, 5, 11, 12, 13, 14, 101, 102]);
      for (const game of playedGames) {
        expect(allowed.has(game.MatchTypeID)).toBe(true);
      }
    });

    it("ScoreStatus is a number in range 0–4", () => {
      for (const game of playedGames) {
        expect(typeof game.ScoreStatus).toBe("number");
        expect(game.ScoreStatus).toBeGreaterThanOrEqual(0);
        expect(game.ScoreStatus).toBeLessThanOrEqual(4);
      }
    });

    it("Winner is a number or undefined (never a string)", () => {
      for (const game of playedGames) {
        if (game.Winner !== undefined && game.Winner !== null) {
          expect(typeof game.Winner).toBe("number");
        }
      }
    });

    it("Sets.Set holds per-set scores — Team1/Team2 are numbers", () => {
      for (const game of playedGames) {
        if (!game.Sets) continue;
        const sets = Array.isArray(game.Sets.Set) ? game.Sets.Set : [game.Sets.Set];
        for (const set of sets) {
          if (set == null) continue;
          if (set.Team1 != null) expect(typeof set.Team1).toBe("number");
          if (set.Team2 != null) expect(typeof set.Team2).toBe("number");
        }
      }
    });

    it("MatchOrder values are all in 1–8", () => {
      for (const game of playedGames) {
        expect(game.MatchOrder).toBeGreaterThanOrEqual(1);
        expect(game.MatchOrder).toBeLessThanOrEqual(8);
      }
    });

    it("player MemberIDs are strings (not coerced to number)", () => {
      let checked = 0;
      for (const game of playedGames) {
        const memberIds = [
          game.Team1?.Player1?.MemberID,
          game.Team1?.Player2?.MemberID,
          game.Team2?.Player1?.MemberID,
          game.Team2?.Player2?.MemberID,
        ].filter((id) => id != null);
        for (const id of memberIds) {
          expect(typeof id).toBe("string");
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(0);
    });

    it("documents the ScoreStatus values present in real data", () => {
      const statuses = new Set<number>();
      for (const game of playedGames) {
        statuses.add(game.ScoreStatus);
      }
      // eslint-disable-next-line no-console
      console.log(
        `[integration] TeamMatch ${playedTeamMatchCode} ScoreStatus values:`,
        Array.from(statuses).sort(),
      );
      for (const s of statuses) {
        expect(typeof s).toBe("number");
      }
    });
  });

  describe("getGames at encounter code → WRONG endpoint (documentation)", () => {
    it("treats encounter code as a draw code — returns TeamMatch[], NOT individual games", async () => {
      // This documents that calling getGames with an encounter/TeamMatch code
      // hits /Draw/{id}/Match, which the VR API interprets as a draw lookup.
      // Use getTeamMatch for encounter-level game retrieval.
      const result = (await service.getGames(
        FIXTURES.eventCode,
        `${playedTeamMatchCode}`,
        false,
      )) as XmlTeamMatch[];
      if (result.length > 0) {
        // Items look like TeamMatches, NOT XmlMatches — no MatchOrder.
        expect((result[0] as unknown as XmlMatch).MatchOrder).toBeUndefined();
      }
    });
  });
});
