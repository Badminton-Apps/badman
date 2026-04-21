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
});
