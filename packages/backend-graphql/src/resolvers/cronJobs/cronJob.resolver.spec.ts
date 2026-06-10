import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { CronJob, Player } from "@badman/backend-database";
import { CronService } from "@badman/backend-orchestrator";
import { CronJobResolver } from "./cronJob.resolver";

describe("CronJobResolver", () => {
  let resolver: CronJobResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };
  let mockCronService: { onModuleInit: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    mockCronService = { onModuleInit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronJobResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
        {
          provide: CronService,
          useValue: mockCronService,
        },
      ],
    }).compile();

    resolver = module.get<CronJobResolver>(CronJobResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("cronJobs (query)", () => {
    it("returns list of cron jobs", async () => {
      const list = [{ id: "j1" }] as unknown as CronJob[];
      jest.spyOn(CronJob, "findAll").mockResolvedValue(list);
      expect(await resolver.cronJobs({} as any)).toEqual(list);
    });
  });

  describe("updateCronJob (mutation)", () => {
    it("throws UnauthorizedException when user lacks change:job permission", async () => {
      await expect(
        resolver.updateCronJob(buildUser(false), { id: "j-uuid" } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when cron job not found", async () => {
      jest.spyOn(CronJob, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.updateCronJob(buildUser(true), { id: "missing" } as any)
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("updates cron job, reinitializes cron service, and commits on success", async () => {
      const fakeCronJob = {
        update: jest.fn().mockResolvedValue({ id: "j-uuid" }),
      } as unknown as CronJob;
      jest.spyOn(CronJob, "findByPk").mockResolvedValue(fakeCronJob);
      const result = await resolver.updateCronJob(buildUser(true), { id: "j-uuid" } as any);
      expect(fakeCronJob.update).toHaveBeenCalled();
      expect(mockCronService.onModuleInit).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual({ id: "j-uuid" });
    });

    it("rolls back on error and does not commit", async () => {
      const fakeCronJob = {
        update: jest.fn().mockRejectedValue(new Error("db fail")),
      } as unknown as CronJob;
      jest.spyOn(CronJob, "findByPk").mockResolvedValue(fakeCronJob);
      await expect(
        resolver.updateCronJob(buildUser(true), { id: "j-uuid" } as any)
      ).rejects.toThrow("db fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
