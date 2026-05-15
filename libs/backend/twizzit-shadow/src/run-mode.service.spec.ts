import { SyncRun } from "@badman/backend-database";
import { Test, TestingModule } from "@nestjs/testing";
import { RunModeService } from "./run-mode.service";
import { SyncRunService } from "./sync-run.service";
import { TruncateShadowTablesService } from "./truncate-shadow-tables.service";

function mockSyncRunService(lastCompleted: SyncRun | null): jest.Mocked<SyncRunService> {
  return {
    findLastCompleted: jest.fn().mockResolvedValue(lastCompleted),
    create: jest.fn(),
    markRunning: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
  } as unknown as jest.Mocked<SyncRunService>;
}

function mockTruncateService(): jest.Mocked<TruncateShadowTablesService> {
  return { truncate: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<TruncateShadowTablesService>;
}

describe("RunModeService", () => {
  afterEach(() => {
    delete process.env["TWIZZIT_SHADOW_FORCE_FULL_REFETCH"];
    jest.restoreAllMocks();
  });

  async function build(
    syncRunSvc: jest.Mocked<SyncRunService>,
    truncateSvc: jest.Mocked<TruncateShadowTablesService>
  ): Promise<RunModeService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunModeService,
        { provide: SyncRunService, useValue: syncRunSvc },
        { provide: TruncateShadowTablesService, useValue: truncateSvc },
      ],
    }).compile();
    return module.get(RunModeService);
  }

  it("returns full-refetch and truncates when no previous completed run", async () => {
    const truncate = mockTruncateService();
    const service = await build(mockSyncRunService(null), truncate);

    const result = await service.resolveMode();
    expect(result.mode).toBe("full-refetch");
    expect(result.resumeFromRunId).toBeNull();
    expect(truncate.truncate).toHaveBeenCalledTimes(1);
  });

  it("returns resume when last completed run < 7 days ago", async () => {
    const recentRun = {
      id: "recent-run",
      status: "completed",
      finishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    } as unknown as SyncRun;
    const truncate = mockTruncateService();
    const service = await build(mockSyncRunService(recentRun), truncate);

    const result = await service.resolveMode();
    expect(result.mode).toBe("resume");
    expect(result.resumeFromRunId).toBe("recent-run");
    expect(truncate.truncate).not.toHaveBeenCalled();
  });

  it("returns full-refetch and truncates when last completed run >= 7 days ago", async () => {
    const oldRun = {
      id: "old-run",
      status: "completed",
      finishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    } as unknown as SyncRun;
    const truncate = mockTruncateService();
    const service = await build(mockSyncRunService(oldRun), truncate);

    const result = await service.resolveMode();
    expect(result.mode).toBe("full-refetch");
    expect(result.resumeFromRunId).toBeNull();
    expect(truncate.truncate).toHaveBeenCalledTimes(1);
  });

  it("returns full-refetch and truncates when TWIZZIT_SHADOW_FORCE_FULL_REFETCH=1", async () => {
    process.env["TWIZZIT_SHADOW_FORCE_FULL_REFETCH"] = "1";
    const recentRun = {
      id: "recent-run",
      status: "completed",
      finishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    } as unknown as SyncRun;
    const truncate = mockTruncateService();
    const service = await build(mockSyncRunService(recentRun), truncate);

    const result = await service.resolveMode();
    expect(result.mode).toBe("full-refetch");
    expect(result.resumeFromRunId).toBeNull();
    expect(truncate.truncate).toHaveBeenCalledTimes(1);
    // Should short-circuit before calling findLastCompleted
    expect(mockSyncRunService(recentRun).findLastCompleted).not.toHaveBeenCalled();
  });
});
