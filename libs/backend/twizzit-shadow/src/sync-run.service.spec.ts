import { SyncRun } from "@badman/backend-database";
import { Test, TestingModule } from "@nestjs/testing";
import { SyncRunService } from "./sync-run.service";

describe("SyncRunService", () => {
  let service: SyncRunService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncRunService],
    }).compile();
    service = module.get(SyncRunService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("create", () => {
    it("creates a sync_run with pending status", async () => {
      const mockRun = { id: "run-1", status: "pending", save: jest.fn() } as unknown as SyncRun;
      jest.spyOn(SyncRun, "create").mockResolvedValueOnce(mockRun);
      const run = await service.create({ pageSize: 100, interPageDelayMs: 250 });
      expect(SyncRun.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending", pageSize: 100 })
      );
      expect(run.id).toBe("run-1");
    });
  });

  describe("markRunning", () => {
    it("sets status to running and saves", async () => {
      const mockRun = { id: "run-1", status: "pending", save: jest.fn() } as unknown as SyncRun;
      await service.markRunning(mockRun);
      expect(mockRun.status).toBe("running");
      expect(mockRun.startedAt).toBeInstanceOf(Date);
      expect(mockRun.save).toHaveBeenCalled();
    });
  });

  describe("markCompleted", () => {
    it("sets status to completed with counts", async () => {
      const mockRun = { id: "run-1", status: "running", save: jest.fn() } as unknown as SyncRun;
      const counts = { contacts: 1000, memberships: 500 };
      await service.markCompleted(mockRun, counts);
      expect(mockRun.status).toBe("completed");
      expect(mockRun.counts).toEqual(counts);
      expect(mockRun.finishedAt).toBeInstanceOf(Date);
      expect(mockRun.save).toHaveBeenCalled();
    });
  });

  describe("markFailed", () => {
    it("sets status to failed with error summary", async () => {
      const mockRun = { id: "run-1", status: "running", save: jest.fn() } as unknown as SyncRun;
      await service.markFailed(mockRun, new Error("Connection timeout"));
      expect(mockRun.status).toBe("failed");
      expect(mockRun.errorSummary).toContain("Connection timeout");
      expect(mockRun.save).toHaveBeenCalled();
    });

    it("truncates very long error messages to 2000 chars", async () => {
      const mockRun = { id: "run-1", status: "running", save: jest.fn() } as unknown as SyncRun;
      const longError = "x".repeat(5000);
      await service.markFailed(mockRun, longError);
      expect(mockRun.errorSummary!.length).toBeLessThanOrEqual(2000);
    });
  });

  describe("findLastCompleted", () => {
    it("returns the most recent completed run", async () => {
      const mockRun = { id: "run-completed", status: "completed" } as unknown as SyncRun;
      jest.spyOn(SyncRun, "findOne").mockResolvedValueOnce(mockRun);
      const result = await service.findLastCompleted();
      expect(result).toBe(mockRun);
      expect(SyncRun.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "completed" } })
      );
    });

    it("returns null when no completed run exists", async () => {
      jest.spyOn(SyncRun, "findOne").mockResolvedValueOnce(null);
      const result = await service.findLastCompleted();
      expect(result).toBeNull();
    });
  });
});
