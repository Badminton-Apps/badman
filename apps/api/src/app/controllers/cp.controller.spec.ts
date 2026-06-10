import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { CpController } from "./cp.controller";
import { CpDataCollector } from "@badman/backend-generator";
import { Player } from "@badman/backend-database";
import { CpPayload } from "@badman/backend-generator";
import { MailingService } from "@badman/backend-mailing";

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
      GH_TOKEN_CP: "ghp_test_token",
      GITHUB_REPO_OWNER: "Badminton-Apps",
      GITHUB_REPO_NAME: "badman",
      CP_CALLBACK_URL: "https://api.test.com/api/v1/cp/webhook",
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
        {
          provide: MailingService,
          useValue: {
            sendCpExportReadyMail: jest.fn().mockResolvedValue(undefined),
            sendCpExportFailedMail: jest.fn().mockResolvedValue(undefined),
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

      await expect(
        controller.generate(noUser, { eventId: "a0000000-0000-4000-8000-000000000001" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should reject users without export-cp:competition permission", async () => {
      const user = mockUser({
        hasAnyPermission: jest.fn().mockResolvedValue(false),
      });

      await expect(
        controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("should call CpDataCollector and trigger workflow_dispatch", async () => {
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        }) // _createGist
        .mockResolvedValueOnce({ status: 204 }); // workflow dispatch

      const result = await controller.generate(user, {
        eventId: "a0000000-0000-4000-8000-000000000001",
      });

      expect(mockDataCollector.collect).toHaveBeenCalledWith(
        "a0000000-0000-4000-8000-000000000001"
      );
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

    it("should pass gist_id in the workflow dispatch inputs", async () => {
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-xyz" }),
        }) // _createGist
        .mockResolvedValueOnce({ status: 204 }); // workflow dispatch

      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

      const dispatchCall = mockFetch.mock.calls[1]; // second fetch = dispatch
      const body = JSON.parse(dispatchCall[1].body);

      expect(body.inputs.gist_id).toBe("gist-xyz");
      expect(body.inputs.payload).toBeUndefined();
    });

    it("should return 502 if GitHub API dispatch fails", async () => {
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        }) // _createGist
        .mockResolvedValueOnce({
          status: 422,
          text: jest.fn().mockResolvedValue("Validation failed"),
        }) // dispatch fails
        .mockResolvedValueOnce({ status: 204 }); // _deleteGist cleanup

      await expect(
        controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" })
      ).rejects.toThrow(BadGatewayException);
    });

    it("should return 502 if Gist creation fails", async () => {
      const user = mockUser();
      mockFetch.mockResolvedValueOnce({
        status: 500,
        text: jest.fn().mockResolvedValue("Server Error"),
      });

      await expect(
        controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" })
      ).rejects.toThrow(BadGatewayException);
    });

    it("should return 503 if GH_TOKEN_CP is not configured", async () => {
      mockConfigService.GH_TOKEN_CP = undefined;
      const user = mockUser();

      await expect(
        controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" })
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it("should return 409 if generation is already in progress for same event", async () => {
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        })
        .mockResolvedValueOnce({ status: 204 });

      // First call succeeds
      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

      // Second call should be rejected (no fetch needed — blocked before Gist creation)
      await expect(
        controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" })
      ).rejects.toThrow(ConflictException);
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
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        })
        .mockResolvedValueOnce({ status: 204 }) // dispatch
        .mockResolvedValueOnce({ status: 204 }); // _deleteGist on webhook
      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

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
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        })
        .mockResolvedValueOnce({ status: 204 }) // dispatch
        .mockResolvedValueOnce({ status: 204 }); // _deleteGist on webhook
      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

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

    // T012
    it("should return 400 if run_id is missing", async () => {
      await expect(
        controller.webhook("test-secret", { run_id: "", user_id: "user-1", status: "completed" })
      ).rejects.toThrow(BadRequestException);
    });

    // T013
    it("should return 400 if user_id is missing", async () => {
      await expect(
        controller.webhook("test-secret", { run_id: "run-1", user_id: "", status: "completed" })
      ).rejects.toThrow(BadRequestException);
    });

    // T014
    it("should return 400 if status is missing", async () => {
      await expect(
        controller.webhook("test-secret", { run_id: "run-1", user_id: "user-1", status: "" })
      ).rejects.toThrow(BadRequestException);
    });

    // T015
    it("should return 400 for invalid status value", async () => {
      await expect(
        controller.webhook("test-secret", {
          run_id: "run-1",
          user_id: "user-1",
          status: "success",
        })
      ).rejects.toThrow(BadRequestException);
    });

    // T016
    it("should return { ok: true } even when email dispatch throws", async () => {
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        })
        .mockResolvedValueOnce({ status: 204 }) // dispatch
        .mockResolvedValueOnce({ status: 204 }); // _deleteGist on webhook
      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

      jest.spyOn(Player, "findByPk").mockResolvedValue({
        email: "user@test.be",
        fullName: "Test User",
      } as any);

      // Make the mailing service throw
      const mailingService = (controller as any).mailingService;
      jest
        .spyOn(mailingService, "sendCpExportReadyMail")
        .mockRejectedValue(new Error("SMTP error"));

      const result = await controller.webhook("test-secret", {
        run_id: "gh-run-email-throws",
        user_id: "user-1",
        status: "completed",
      });

      expect(result).toEqual({ ok: true });
    });

    // T017
    it("should return { ok: true } for duplicate run_id without re-sending email", async () => {
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        })
        .mockResolvedValueOnce({ status: 204 }) // dispatch
        .mockResolvedValueOnce({ status: 204 }); // _deleteGist on webhook
      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

      jest.spyOn(Player, "findByPk").mockResolvedValue({
        email: "user@test.be",
        fullName: "Test User",
      } as any);

      const mailingService = (controller as any).mailingService;
      const sendMailSpy = jest.spyOn(mailingService, "sendCpExportReadyMail");

      // First delivery
      await controller.webhook("test-secret", {
        run_id: "gh-run-dup",
        user_id: "user-1",
        status: "completed",
      });

      // Second delivery with same run_id (idempotency guard)
      const result = await controller.webhook("test-secret", {
        run_id: "gh-run-dup",
        user_id: "user-1",
        status: "completed",
      });

      expect(result).toEqual({ ok: true });
      // Mail must have been sent exactly once, not twice
      expect(sendMailSpy).toHaveBeenCalledTimes(1);
    });

    // T018
    it("should return { ok: true } when Player.findByPk returns null", async () => {
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        })
        .mockResolvedValueOnce({ status: 204 }) // dispatch
        .mockResolvedValueOnce({ status: 204 }); // _deleteGist on webhook
      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

      jest.spyOn(Player, "findByPk").mockResolvedValue(null);

      const result = await controller.webhook("test-secret", {
        run_id: "gh-run-nullplayer",
        user_id: "user-1",
        status: "completed",
      });

      expect(result).toEqual({ ok: true });
    });
  });

  describe("GET /cp/download/:runId", () => {
    it("should return 404 for unknown runId", async () => {
      const mockRes = {} as any;

      await expect(controller.download("unknown-run", mockRes)).rejects.toThrow(NotFoundException);
    });

    it("should return 410 for failed generation", async () => {
      // Set up a completed webhook first
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        })
        .mockResolvedValueOnce({ status: 204 }) // dispatch
        .mockResolvedValueOnce({ status: 204 }); // _deleteGist on webhook
      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

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

      await expect(controller.download("gh-run-failed", mockRes)).rejects.toThrow(/failed/i);
    });

    it("should fetch artifact from GitHub and stream to response", async () => {
      // Set up a completed generation
      const user = mockUser();
      mockFetch
        .mockResolvedValueOnce({
          status: 201,
          json: jest.fn().mockResolvedValue({ id: "gist-abc" }),
        }) // _createGist
        .mockResolvedValueOnce({ status: 204 }) // workflow dispatch
        .mockResolvedValueOnce({ status: 204 }) // _deleteGist on webhook
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

      await controller.generate(user, { eventId: "a0000000-0000-4000-8000-000000000001" });

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

      await controller.download("gh-run-ok", mockRes);

      expect(mockRes.header).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("cp-file")
      );
      expect(mockRes.type).toHaveBeenCalledWith("application/zip");
      expect(mockRes.send).toHaveBeenCalled();
    });
  });
});
