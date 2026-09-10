import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { CronJob, Player } from "@badman/backend-database";
import { CronService } from "@badman/backend-orchestrator";
import { CronJobResolver } from "./cronJob.resolver";

describe("CronJobResolver", () => {
  let resolver: CronJobResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };
  let mockCronService: { onModuleInit: jest.Mock; runJob: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    mockCronService = { onModuleInit: jest.fn(), runJob: jest.fn().mockResolvedValue(undefined) };

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
      expect(await resolver.cronJobs(buildUser(true), {} as any)).toEqual(list);
    });

    it("returns an empty list when there are no cron jobs", async () => {
      jest.spyOn(CronJob, "findAll").mockResolvedValue([]);
      expect(await resolver.cronJobs(buildUser(true), {} as any)).toEqual([]);
    });

    it("throws UnauthorizedException when user lacks change:job permission", async () => {
      const findAll = jest.spyOn(CronJob, "findAll");
      await expect(resolver.cronJobs(buildUser(false), {} as any)).rejects.toThrow(
        UnauthorizedException
      );
      expect(findAll).not.toHaveBeenCalled();
    });
  });

  describe("runCronJob (mutation)", () => {
    it("throws UnauthorizedException when user lacks change:job permission", async () => {
      const findByPk = jest.spyOn(CronJob, "findByPk");
      await expect(resolver.runCronJob(buildUser(false), "j-uuid")).rejects.toThrow(
        UnauthorizedException
      );
      expect(findByPk).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when cron job not found", async () => {
      jest.spyOn(CronJob, "findByPk").mockResolvedValue(null);
      await expect(resolver.runCronJob(buildUser(true), "missing")).rejects.toThrow(
        NotFoundException
      );
      expect(mockCronService.runJob).not.toHaveBeenCalled();
    });

    it("hands the job to the cron service and returns it", async () => {
      const fakeCronJob = { id: "j-uuid" } as unknown as CronJob;
      jest.spyOn(CronJob, "findByPk").mockResolvedValue(fakeCronJob);

      const result = await resolver.runCronJob(buildUser(true), "j-uuid");

      expect(mockCronService.runJob).toHaveBeenCalledWith(fakeCronJob);
      expect(result).toBe(fakeCronJob);
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

    it("reinitializes the cron service only after the transaction commits", async () => {
      const order: string[] = [];
      mockTransaction.commit.mockImplementation(() => {
        order.push("commit");
      });
      mockCronService.onModuleInit.mockImplementation(() => {
        order.push("onModuleInit");
      });

      const fakeCronJob = {
        update: jest.fn().mockResolvedValue({ id: "j-uuid" }),
      } as unknown as CronJob;
      jest.spyOn(CronJob, "findByPk").mockResolvedValue(fakeCronJob);

      await resolver.updateCronJob(buildUser(true), { id: "j-uuid" } as any);

      expect(order).toEqual(["commit", "onModuleInit"]);
    });

    it("does not roll back a committed transaction when re-registering fails", async () => {
      mockCronService.onModuleInit.mockImplementation(() => {
        throw new Error("scheduler blew up");
      });

      const fakeCronJob = {
        update: jest.fn().mockResolvedValue({ id: "j-uuid" }),
      } as unknown as CronJob;
      jest.spyOn(CronJob, "findByPk").mockResolvedValue(fakeCronJob);

      await expect(
        resolver.updateCronJob(buildUser(true), { id: "j-uuid" } as any)
      ).resolves.toEqual({ id: "j-uuid" });

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it("swallows an async re-registration failure instead of leaking a rejection", async () => {
      mockCronService.onModuleInit.mockRejectedValue(new Error("scheduler blew up later"));

      const fakeCronJob = {
        update: jest.fn().mockResolvedValue({ id: "j-uuid" }),
      } as unknown as CronJob;
      jest.spyOn(CronJob, "findByPk").mockResolvedValue(fakeCronJob);

      await expect(
        resolver.updateCronJob(buildUser(true), { id: "j-uuid" } as any)
      ).resolves.toEqual({ id: "j-uuid" });

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
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
