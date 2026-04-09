import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException, NotFoundException } from "@nestjs/common";
import { CpController } from "./cp.controller";
import { CpDataCollector } from "@badman/backend-generator";
import { Player } from "@badman/backend-database";
import { CpPayload } from "@badman/backend-generator";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockUser(overrides = {}): Player {
  return {
    id: "user-1",
    email: "user@test.be",
    fullName: "Test User",
    hasAnyPermission: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as Player;
}

function minimalPayload(): CpPayload {
  return {
    event: { name: "Test", season: 2025 },
    subEvents: [],
    clubs: [],
    locations: [],
    teams: [],
    players: [],
    teamPlayers: [],
    entries: [],
    memos: [],
    settings: { tournamentName: "Test" },
  };
}

describe("CpController", () => {
  let controller: CpController;
  let mockDataCollector: jest.Mocked<CpDataCollector>;
  let mockConfigService: Record<string, any>;

  beforeEach(async () => {
    mockDataCollector = {
      collect: jest.fn().mockResolvedValue(minimalPayload()),
    } as any;

    mockConfigService = {
      GITHUB_TOKEN_CP: "ghp_test_token",
      GITHUB_REPO_OWNER: "Badminton-Apps",
      GITHUB_REPO_NAME: "badman",
      CP_CALLBACK_URL: "https://api.test.com/cp/webhook",
      CP_WEBHOOK_SECRET: "test-secret",
      CLIENT_URL: "https://badman.app",
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CpController],
      providers: [
        { provide: CpDataCollector, useValue: mockDataCollector },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigService[key]),
          },
        },
      ],
    }).compile();

    controller = module.get<CpController>(CpController);
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /cp/generate", () => {
    it("should reject unauthenticated requests", async () => {
      const noUser = { id: undefined } as unknown as Player;

      await expect(controller.generate(noUser, { eventId: "event-1" })).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should reject users without export-cp:competition permission", async () => {
      const user = mockUser({
        hasAnyPermission: jest.fn().mockResolvedValue(false),
      });

      await expect(controller.generate(user, { eventId: "event-1" })).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should call CpDataCollector and trigger workflow_dispatch", async () => {
      const user = mockUser();
      mockFetch.mockResolvedValue({ status: 204 });

      const result = await controller.generate(user, {
        eventId: "event-1",
      });

      expect(mockDataCollector.collect).toHaveBeenCalledWith("event-1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("actions/workflows/generate-cp.yml/dispatches"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer ghp_test_token",
          }),
        })
      );
      expect(result.message).toContain("started");
      expect(result.trackingId).toBeDefined();
    });

    it("should return 400 if eventId is missing", async () => {
      const user = mockUser();

      await expect(controller.generate(user, { eventId: "" })).rejects.toThrow();
    });

    it("should base64-encode the payload in the workflow dispatch", async () => {
      const user = mockUser();
      mockFetch.mockResolvedValue({ status: 204 });

      await controller.generate(user, { eventId: "event-1" });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // Verify payload input is base64
      const decoded = Buffer.from(body.inputs.payload, "base64").toString("utf-8");
      const payload = JSON.parse(decoded);
      expect(payload.event.name).toBe("Test");
    });

    it("should return 502 if GitHub API fails", async () => {
      const user = mockUser();
      mockFetch.mockResolvedValue({
        status: 422,
        text: jest.fn().mockResolvedValue("Validation failed"),
      });

      await expect(controller.generate(user, { eventId: "event-1" })).rejects.toThrow(/502/);
    });

    it("should return 503 if GITHUB_TOKEN_CP is not configured", async () => {
      mockConfigService.GITHUB_TOKEN_CP = undefined;
      const user = mockUser();

      await expect(controller.generate(user, { eventId: "event-1" })).rejects.toThrow(/503/);
    });

    it("should return 409 if generation is already in progress for same event", async () => {
      const user = mockUser();
      mockFetch.mockResolvedValue({ status: 204 });

      // First call succeeds
      await controller.generate(user, { eventId: "event-1" });

      // Second call should be rejected
      await expect(controller.generate(user, { eventId: "event-1" })).rejects.toThrow(/409/);
    });
  });

  describe("POST /cp/webhook", () => {
    it("should reject requests with invalid webhook secret", async () => {
      await expect(
        controller.webhook("wrong-secret", {
          run_id: "123",
          user_id: "user-1",
          status: "completed",
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should reject requests with missing webhook secret", async () => {
      await expect(
        controller.webhook("", {
          run_id: "123",
          user_id: "user-1",
          status: "completed",
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should accept valid webhook and update generation record", async () => {
      // First, trigger a generation to create a pending record
      const user = mockUser();
      mockFetch.mockResolvedValue({ status: 204 });
      await controller.generate(user, { eventId: "event-1" });

      jest.spyOn(Player, "findByPk").mockResolvedValue({
        email: "user@test.be",
        fullName: "Test User",
      } as any);

      const result = await controller.webhook("test-secret", {
        run_id: "gh-run-456",
        user_id: "user-1",
        status: "completed",
      });

      expect(result).toEqual({ ok: true });
    });

    it("should handle failed status", async () => {
      const user = mockUser();
      mockFetch.mockResolvedValue({ status: 204 });
      await controller.generate(user, { eventId: "event-1" });

      jest.spyOn(Player, "findByPk").mockResolvedValue({
        email: "user@test.be",
        fullName: "Test User",
      } as any);

      const result = await controller.webhook("test-secret", {
        run_id: "gh-run-789",
        user_id: "user-1",
        status: "failed",
      });

      expect(result).toEqual({ ok: true });
    });
  });

  describe("GET /cp/download/:runId", () => {
    it("should reject unauthenticated requests", async () => {
      const noUser = { id: undefined } as unknown as Player;
      const mockRes = {} as any;

      await expect(controller.download(noUser, "run-123", mockRes)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should reject users without permission", async () => {
      const user = mockUser({
        hasAnyPermission: jest.fn().mockResolvedValue(false),
      });
      const mockRes = {} as any;

      await expect(controller.download(user, "run-123", mockRes)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should return 404 for unknown runId", async () => {
      const user = mockUser();
      const mockRes = {} as any;

      await expect(controller.download(user, "unknown-run", mockRes)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should return 410 for failed generation", async () => {
      // Set up a completed webhook first
      const user = mockUser();
      mockFetch.mockResolvedValue({ status: 204 });
      await controller.generate(user, { eventId: "event-1" });

      jest.spyOn(Player, "findByPk").mockResolvedValue({
        email: "user@test.be",
        fullName: "Test User",
      } as any);

      await controller.webhook("test-secret", {
        run_id: "gh-run-failed",
        user_id: "user-1",
        status: "failed",
      });

      const mockRes = {} as any;

      await expect(controller.download(user, "gh-run-failed", mockRes)).rejects.toThrow(/failed/i);
    });

    it("should fetch artifact from GitHub and stream to response", async () => {
      // Set up a completed generation
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({ status: 204 }) // workflow dispatch
        .mockResolvedValueOnce({
          // artifacts list
          ok: true,
          json: jest.fn().mockResolvedValue({
            artifacts: [
              {
                id: 1,
                name: "cp-file",
                archive_download_url:
                  "https://api.github.com/repos/test/test/actions/artifacts/1/zip",
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          // artifact download
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
        });

      await controller.generate(user, { eventId: "event-1" });

      jest.spyOn(Player, "findByPk").mockResolvedValue({
        email: "user@test.be",
        fullName: "Test User",
      } as any);

      await controller.webhook("test-secret", {
        run_id: "gh-run-ok",
        user_id: "user-1",
        status: "completed",
      });

      const mockRes = {
        header: jest.fn(),
        type: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;

      await controller.download(user, "gh-run-ok", mockRes);

      expect(mockRes.header).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("cp-file")
      );
      expect(mockRes.type).toHaveBeenCalledWith("application/zip");
      expect(mockRes.send).toHaveBeenCalled();
    });
  });
});
