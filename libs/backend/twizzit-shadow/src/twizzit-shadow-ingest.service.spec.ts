import type { FederationGateway, FederationMembership } from "@badman/integrations-twizzit-client";
import { Test, TestingModule } from "@nestjs/testing";
import { Sequelize } from "sequelize-typescript";
import { RecordSkipTracker } from "./record-skip-tracker";
import { RunModeService } from "./run-mode.service";
import { ShadowUpsertService } from "./shadow-upsert.service";
import { SyncCheckpointService } from "./sync-checkpoint.service";
import { SyncRunService } from "./sync-run.service";
import { FEDERATION_GATEWAY } from "./tokens";
import { TwizzitShadowIngestService } from "./twizzit-shadow-ingest.service";

const mockMembership: FederationMembership = {
  id: 100,
  contactId: 1,
  membershipTypeId: 10,
  clubId: null,
  seasonId: null,
  startDate: "2024-01-01",
  endDate: null,
  extraFields: [],
};

function makeMockGateway(): jest.Mocked<FederationGateway> {
  return {
    fetchOrganizations: jest.fn().mockResolvedValue([{ id: 1, name: "Org" }]),
    fetchExtraFields: jest.fn().mockResolvedValue([]),
    fetchMembershipTypes: jest.fn().mockResolvedValue([]),
    fetchContacts: jest.fn().mockResolvedValue([]),
    fetchMemberships: jest.fn().mockResolvedValue([]),
  };
}

describe("TwizzitShadowIngestService", () => {
  let service: TwizzitShadowIngestService;
  let gateway: jest.Mocked<FederationGateway>;
  let syncRunService: jest.Mocked<SyncRunService>;
  let checkpointService: jest.Mocked<SyncCheckpointService>;
  let upsertService: jest.Mocked<ShadowUpsertService>;
  let runModeService: jest.Mocked<RunModeService>;
  let sequelize: jest.Mocked<Sequelize>;
  let skipTracker: RecordSkipTracker;

  const mockRun = { id: "run-test-1", status: "pending", save: jest.fn() };
  const mockTx = { commit: jest.fn(), rollback: jest.fn() };

  beforeEach(async () => {
    gateway = makeMockGateway();
    syncRunService = {
      create: jest.fn().mockResolvedValue(mockRun),
      markRunning: jest.fn().mockResolvedValue(undefined),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      findLastCompleted: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<SyncRunService>;

    checkpointService = {
      upsert: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue(null),
      findLatestForEntity: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<SyncCheckpointService>;

    upsertService = {
      upsertOrganization: jest.fn().mockResolvedValue(1),
      upsertExtraField: jest.fn().mockResolvedValue(0),
      upsertMembershipType: jest.fn().mockResolvedValue(0),
      upsertMembership: jest.fn().mockResolvedValue(1),
      upsertContact: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<ShadowUpsertService>;

    runModeService = {
      resolveMode: jest.fn().mockResolvedValue({ mode: "full-refetch", resumeFromRunId: null }),
    } as unknown as jest.Mocked<RunModeService>;

    sequelize = {
      transaction: jest.fn().mockResolvedValue(mockTx),
    } as unknown as jest.Mocked<Sequelize>;

    skipTracker = new RecordSkipTracker();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwizzitShadowIngestService,
        { provide: FEDERATION_GATEWAY, useValue: gateway },
        { provide: Sequelize, useValue: sequelize },
        { provide: SyncRunService, useValue: syncRunService },
        { provide: SyncCheckpointService, useValue: checkpointService },
        { provide: ShadowUpsertService, useValue: upsertService },
        { provide: RunModeService, useValue: runModeService },
        { provide: RecordSkipTracker, useValue: skipTracker },
      ],
    }).compile();

    service = module.get(TwizzitShadowIngestService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("runFullBackfill", () => {
    it("creates run, marks running, then marks completed on success", async () => {
      const result = await service.runFullBackfill({ pageSize: 100, interPageDelayMs: 0 });
      expect(syncRunService.create).toHaveBeenCalledTimes(1);
      expect(syncRunService.markRunning).toHaveBeenCalledWith(mockRun);
      expect(syncRunService.markCompleted).toHaveBeenCalledWith(
        mockRun,
        expect.objectContaining({ organizations: expect.any(Number) })
      );
      expect(result.status).toBe("completed");
      expect(result.runId).toBe("run-test-1");
    });

    it("marks run failed and returns failed status when pipeline throws", async () => {
      upsertService.upsertOrganization.mockRejectedValueOnce(new Error("DB exploded"));
      const result = await service.runFullBackfill({ pageSize: 100, interPageDelayMs: 0 });
      expect(syncRunService.markFailed).toHaveBeenCalledWith(mockRun, expect.any(Error));
      expect(result.status).toBe("failed");
    });

    it("calls gateway in correct order: org → extraFields → membershipTypes → memberships → contacts", async () => {
      const order: string[] = [];
      gateway.fetchOrganizations.mockImplementation(async () => { order.push("org"); return []; });
      gateway.fetchExtraFields.mockImplementation(async () => { order.push("ef"); return []; });
      gateway.fetchMembershipTypes.mockImplementation(async () => { order.push("mt"); return []; });
      // Paginated — return empty page so loop exits
      gateway.fetchMemberships.mockImplementation(async () => { order.push("mem"); return []; });
      gateway.fetchContacts.mockImplementation(async () => { order.push("con"); return []; });

      await service.runFullBackfill({ pageSize: 100, interPageDelayMs: 0 });
      expect(order).toEqual(["org", "ef", "mt", "mem", "con"]);
    });
  });

  describe("checkpoint resume", () => {
    it("reads checkpoint and starts paginated fetch from checkpoint offset + pageSize", async () => {
      runModeService.resolveMode.mockResolvedValueOnce({ mode: "resume", resumeFromRunId: "prev-run" });
      checkpointService.find.mockResolvedValueOnce({
        syncRunId: "prev-run",
        entityType: "membership",
        lastOffset: 200,
        pageSize: 100,
        recordsWritten: 200,
      } as never);
      checkpointService.find.mockResolvedValueOnce(null); // for contacts

      // Return one page then empty
      const gatewayWithPage = gateway as unknown as {
        getMembershipsPage: jest.Mock;
        getContactsPage: jest.Mock;
      };
      gatewayWithPage.getMembershipsPage = jest.fn().mockImplementation(async (opts: { offset: number }) => {
        if (opts.offset === 300) return [mockMembership];
        return [];
      });
      gatewayWithPage.getContactsPage = jest.fn().mockResolvedValue([]);

      await service.runFullBackfill({ pageSize: 100, interPageDelayMs: 0 });

      // Should start from offset 200 + 100 = 300
      expect(gatewayWithPage.getMembershipsPage).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 300 })
      );
    });

    it("writes checkpoint after each committed page", async () => {
      const gatewayWithPage = gateway as unknown as {
        getMembershipsPage: jest.Mock;
        getContactsPage: jest.Mock;
      };
      let membershipPage = 0;
      gatewayWithPage.getMembershipsPage = jest.fn().mockImplementation(async () => {
        membershipPage++;
        return membershipPage === 1 ? [mockMembership] : [];
      });
      gatewayWithPage.getContactsPage = jest.fn().mockResolvedValue([]);

      await service.runFullBackfill({ pageSize: 100, interPageDelayMs: 0 });

      expect(checkpointService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: "membership" })
      );
    });
  });
});
