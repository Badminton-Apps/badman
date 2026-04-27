import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { VisualService } from "../visual.service";
import axios from "axios";
import { formatInTimeZone } from "date-fns-tz";

jest.mock("axios", () => {
  const mockAxios: any = jest.fn().mockResolvedValue({ data: "" });
  mockAxios.create = jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: "" }),
  });
  mockAxios.get = jest.fn().mockResolvedValue({ data: "" });
  return { __esModule: true, default: mockAxios };
});
jest.mock("axios-retry", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("axios-rate-limit", () => ({
  __esModule: true,
  default: (instance: any) => instance,
}));

const VR_API = "https://api.visual.test";

function makeConfigService(overrides: Record<string, unknown> = {}) {
  const config: Record<string, unknown> = {
    VR_API,
    VR_API_USER: "user",
    VR_API_PASS: "pass",
    NODE_ENV: "production",
    VISUAL_FORCE_CACHE_DEV: false,
    ...overrides,
  };
  return { get: jest.fn((key: string) => config[key]) };
}

function makeCacheManager() {
  return {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

describe("VisualService", () => {
  let service: VisualService;
  let httpGet: jest.Mock;
  let cacheManager: ReturnType<typeof makeCacheManager>;

  beforeEach(async () => {
    cacheManager = makeCacheManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisualService,
        { provide: ConfigService, useValue: makeConfigService() },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get(VisualService);

    // Access the internal http client to mock its get method
    httpGet = (service as any)._http.get;
  });

  afterEach(() => jest.restoreAllMocks());

  describe("visualFormat", () => {
    it("should use date-fns format string", () => {
      expect(VisualService.visualFormat).toBe("yyyy-MM-dd'T'HH:mm:ss");
    });
  });

  describe("getChangeEvents", () => {
    it("should format date as yyyy-MM-dd in the URL", async () => {
      const date = new Date("2026-04-15T10:00:00Z");
      httpGet.mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result><Tournament><ID>1</ID><Name>Test</Name></Tournament></Result>`,
      });

      await service.getChangeEvents(date);

      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining("refdate=2026-04-15"),
        expect.any(Object)
      );
    });

    it("should include page and pageSize in URL", async () => {
      const date = new Date("2026-01-01T00:00:00Z");
      httpGet.mockResolvedValueOnce({ data: `<?xml version="1.0"?><Result></Result>` });

      await service.getChangeEvents(date, 2, 50);

      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining("pagesize=50&pageno=2"),
        expect.any(Object)
      );
    });

    it("should return empty array when no tournaments found", async () => {
      const date = new Date("2026-01-01T00:00:00Z");
      httpGet.mockResolvedValueOnce({ data: `<?xml version="1.0"?><Result></Result>` });

      const result = await service.getChangeEvents(date);

      expect(result).toEqual([]);
    });

    it("should return array with single tournament", async () => {
      const date = new Date("2026-01-01T00:00:00Z");
      httpGet.mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result><Tournament><ID>42</ID><Name>Open Gent</Name></Tournament></Result>`,
      });

      const result = await service.getChangeEvents(date);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ ID: 42, Name: "Open Gent" });
    });

    it("should return array with multiple tournaments", async () => {
      const date = new Date("2026-01-01T00:00:00Z");
      httpGet.mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result><Tournament><ID>1</ID><Name>A</Name></Tournament><Tournament><ID>2</ID><Name>B</Name></Tournament></Result>`,
      });

      const result = await service.getChangeEvents(date);

      expect(result).toHaveLength(2);
    });
  });

  describe("changeDate", () => {
    it("should format date in Brussels timezone in the XML body", async () => {
      // 2026-04-15 17:00 UTC = 2026-04-15 19:00 Europe/Brussels (CEST, UTC+2)
      const date = new Date("2026-04-15T17:00:00Z");
      const expectedFormatted = formatInTimeZone(
        date,
        "Europe/Brussels",
        VisualService.visualFormat
      );

      (axios as unknown as jest.Mock).mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result><Error><Code>0</Code><Message>Success.</Message></Error></Result>`,
      });

      await service.changeDate("tourney-1", "match-1", date);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.stringContaining(`<MatchDate>${expectedFormatted}</MatchDate>`),
          method: "PUT",
        })
      );
      expect(expectedFormatted).toBe("2026-04-15T19:00:00");
    });

    it("should not call API in non-production", async () => {
      const nonProdModule = await Test.createTestingModule({
        providers: [
          VisualService,
          { provide: ConfigService, useValue: makeConfigService({ NODE_ENV: "development" }) },
          { provide: CACHE_MANAGER, useValue: cacheManager },
        ],
      }).compile();

      const nonProdService = nonProdModule.get(VisualService);
      const date = new Date("2026-04-15T17:00:00Z");

      (axios as unknown as jest.Mock).mockClear();
      await nonProdService.changeDate("tourney-1", "match-1", date);

      expect(axios).not.toHaveBeenCalled();
    });

    it("should throw on API error response", async () => {
      const date = new Date("2026-04-15T17:00:00Z");

      (axios as unknown as jest.Mock).mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result><Error><Code>1</Code><Message>Invalid match.</Message></Error></Result>`,
      });

      await expect(service.changeDate("tourney-1", "match-1", date)).rejects.toThrow(
        "Invalid match."
      );
    });
  });

  describe("getPublications", () => {
    const RANKING_ID = "5CE3FF3E-3B3B-4AFD-9F62-29888F1ECD4F";

    it("hits the correct URL", async () => {
      httpGet.mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result></Result>`,
      });

      await service.getPublications(RANKING_ID, false);

      expect(httpGet).toHaveBeenCalledWith(
        `${VR_API}/Ranking/${RANKING_ID}/Publication`,
        expect.any(Object)
      );
    });

    it("returns an empty array when the API has no publications", async () => {
      httpGet.mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result></Result>`,
      });

      const result = await service.getPublications(RANKING_ID, false);

      expect(result).toEqual([]);
    });

    it("parses the XML branch (date-only PublicationDate)", async () => {
      httpGet.mockResolvedValueOnce({
        data:
          `<?xml version="1.0"?>` +
          `<Result>` +
          `<RankingPublication>` +
          `<Code>P1</Code><Name>Week 10</Name>` +
          `<Year>2024</Year><Week>10</Week>` +
          `<PublicationDate>2024-03-04</PublicationDate>` +
          `<Visible>true</Visible>` +
          `</RankingPublication>` +
          `<RankingPublication>` +
          `<Code>P2</Code><Name>Week 11</Name>` +
          `<Year>2024</Year><Week>11</Week>` +
          `<PublicationDate>2024-03-11</PublicationDate>` +
          `<Visible>true</Visible>` +
          `</RankingPublication>` +
          `</Result>`,
      });

      const result = await service.getPublications(RANKING_ID, false);

      expect(result).toHaveLength(2);
      expect(result?.[0]).toMatchObject({
        Code: "P1",
        PublicationDate: "2024-03-04",
        Visible: true,
      });
      // Year/Week may come back as numbers from fast-xml-parser; the schema
      // coerces them to strings.
      expect(typeof result?.[0].Year).toBe("string");
      expect(typeof result?.[0].Week).toBe("string");
    });

    it("parses the JSON branch (ISO-datetime PublicationDate) — regression for the publications-step crash", async () => {
      httpGet.mockResolvedValueOnce({
        data: JSON.stringify({
          RankingPublication: [
            {
              Code: "P1",
              Name: "Week 10",
              Year: 2024,
              Week: 10,
              PublicationDate: "2024-03-04T00:00:00",
              Visible: true,
            },
          ],
        }),
      });

      const result = await service.getPublications(RANKING_ID, false);

      expect(result).toHaveLength(1);
      expect(result?.[0]).toMatchObject({
        Code: "P1",
        PublicationDate: "2024-03-04T00:00:00",
        Visible: true,
        Year: "2024",
        Week: "10",
      });
    });

    it("normalises a single publication object into a 1-element array", async () => {
      // fast-xml-parser yields a single <RankingPublication> as an object,
      // not a 1-element array. Without _asArray normalisation the validator
      // would reject a perfectly valid singular response.
      httpGet.mockResolvedValueOnce({
        data:
          `<?xml version="1.0"?>` +
          `<Result>` +
          `<RankingPublication>` +
          `<Code>P1</Code><Name>Week 10</Name>` +
          `<Year>2024</Year><Week>10</Week>` +
          `<PublicationDate>2024-03-04</PublicationDate>` +
          `<Visible>true</Visible>` +
          `</RankingPublication>` +
          `</Result>`,
      });

      const result = await service.getPublications(RANKING_ID, false);

      expect(result).toHaveLength(1);
      expect(result?.[0].Code).toBe("P1");
    });

    it("throws a clear error when a publication is missing PublicationDate", async () => {
      httpGet.mockResolvedValueOnce({
        data:
          `<?xml version="1.0"?>` +
          `<Result>` +
          `<RankingPublication>` +
          `<Code>P1</Code><Name>Week 10</Name>` +
          `<Year>2024</Year><Week>10</Week>` +
          `<Visible>true</Visible>` +
          `</RankingPublication>` +
          `<RankingPublication>` +
          `<Code>P2</Code><Name>Week 11</Name>` +
          `<Year>2024</Year><Week>11</Week>` +
          `<PublicationDate>2024-03-11</PublicationDate>` +
          `<Visible>true</Visible>` +
          `</RankingPublication>` +
          `</Result>`,
      });

      const promise = service.getPublications(RANKING_ID, false);
      await expect(promise).rejects.toThrow(/Invalid RankingPublication response/);
      await expect(promise).rejects.toThrow(/PublicationDate/);
    });

    it("throws a clear error when PublicationDate is empty", async () => {
      httpGet.mockResolvedValueOnce({
        data: JSON.stringify({
          RankingPublication: [
            {
              Code: "P1",
              Name: "Week 10",
              Year: 2024,
              Week: 10,
              PublicationDate: "",
              Visible: true,
            },
          ],
        }),
      });

      await expect(service.getPublications(RANKING_ID, false)).rejects.toThrow(
        /Invalid RankingPublication response/
      );
    });
  });

  describe("getRanking", () => {
    it("returns the validated ranking list (single Ranking element)", async () => {
      httpGet.mockResolvedValueOnce({
        data:
          `<?xml version="1.0"?>` +
          `<Result>` +
          `<Ranking><Code>R1</Code><Name>Visual</Name></Ranking>` +
          `</Result>`,
      });

      const result = await service.getRanking(false);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ Code: "R1", Name: "Visual" });
    });

    it("returns an empty array when no Ranking is present", async () => {
      httpGet.mockResolvedValueOnce({ data: `<?xml version="1.0"?><Result></Result>` });

      const result = await service.getRanking(false);

      expect(result).toEqual([]);
    });

    it("throws when Name is missing", async () => {
      httpGet.mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result><Ranking><Code>R1</Code></Ranking></Result>`,
      });

      await expect(service.getRanking(false)).rejects.toThrow(/Invalid Ranking response/);
    });
  });

  describe("getCategories", () => {
    const RANKING_ID = "5CE3FF3E-3B3B-4AFD-9F62-29888F1ECD4F";

    it("returns the validated category list", async () => {
      httpGet.mockResolvedValueOnce({
        data:
          `<?xml version="1.0"?>` +
          `<Result>` +
          `<RankingCategory><Code>HE</Code><Name>HE/SM</Name></RankingCategory>` +
          `<RankingCategory><Code>DE</Code><Name>DE/SD</Name></RankingCategory>` +
          `</Result>`,
      });

      const result = await service.getCategories(RANKING_ID, false);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ Code: "HE", Name: "HE/SM" });
    });

    it("normalises a single category object to a 1-element array", async () => {
      httpGet.mockResolvedValueOnce({
        data:
          `<?xml version="1.0"?>` +
          `<Result><RankingCategory><Code>HE</Code><Name>HE/SM</Name></RankingCategory></Result>`,
      });

      const result = await service.getCategories(RANKING_ID, false);

      expect(result).toHaveLength(1);
    });

    it("throws when Name is missing", async () => {
      httpGet.mockResolvedValueOnce({
        data: `<?xml version="1.0"?><Result><RankingCategory><Code>HE</Code></RankingCategory></Result>`,
      });

      await expect(service.getCategories(RANKING_ID, false)).rejects.toThrow(
        /Invalid RankingCategory response/
      );
    });
  });

  describe("getPoints", () => {
    const RANKING_ID = "5CE3FF3E-3B3B-4AFD-9F62-29888F1ECD4F";

    it("returns the validated points list", async () => {
      httpGet.mockResolvedValueOnce({
        data: JSON.stringify({
          RankingPublicationPoints: [
            {
              Rank: 1,
              Level: 12,
              Totalpoints: 1234,
              Player1: { Code: "P1", MemberID: "M001", Name: "Test Player" },
            },
            {
              Rank: 2,
              PreviousRank: "3",
              Level: 11,
              Totalpoints: 1100,
              Player1: { Code: "P2", MemberID: "M002", Name: "Other Player" },
            },
          ],
        }),
      });

      const result = await service.getPoints(RANKING_ID, "PUB1", "CAT1", false);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ Rank: 1, Level: 12, Totalpoints: 1234 });
      expect(result[0].Player1).toMatchObject({ MemberID: "M001", Name: "Test Player" });
    });

    it("returns an empty array when no points are present", async () => {
      httpGet.mockResolvedValueOnce({ data: `<?xml version="1.0"?><Result></Result>` });

      const result = await service.getPoints(RANKING_ID, "PUB1", "CAT1", false);

      expect(result).toEqual([]);
    });

    it("throws when Player1 is missing", async () => {
      httpGet.mockResolvedValueOnce({
        data: JSON.stringify({
          RankingPublicationPoints: [
            { Rank: 1, Level: 12, Totalpoints: 1234 },
          ],
        }),
      });

      await expect(service.getPoints(RANKING_ID, "PUB1", "CAT1", false)).rejects.toThrow(
        /Invalid RankingPublicationPoints response/
      );
    });
  });
});
