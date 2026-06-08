import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { Notification, Player } from "@badman/backend-database";
import { NotificationResolver } from "./notification.resolver";

describe("NotificationResolver", () => {
  let resolver: NotificationResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const buildUser = (id: string) => ({ id }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();

    resolver = module.get<NotificationResolver>(NotificationResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("notification (query)", () => {
    it("returns notification by id", async () => {
      const n = { id: "n-uuid" } as unknown as Notification;
      jest.spyOn(Notification, "findByPk").mockResolvedValue(n);
      expect(await resolver.notification("n-uuid")).toBe(n);
    });

    it("returns null when notification not found", async () => {
      jest.spyOn(Notification, "findByPk").mockResolvedValue(null);
      expect(await resolver.notification("missing")).toBeNull();
    });
  });

  describe("notifications (query)", () => {
    it("returns list of notifications", async () => {
      const list = [{ id: "n1" }] as unknown as Notification[];
      jest.spyOn(Notification, "findAll").mockResolvedValue(list);
      expect(await resolver.notifications({} as any)).toEqual(list);
    });
  });

  describe("updateNotification (mutation)", () => {
    it("throws NotFoundException when notification not found", async () => {
      jest.spyOn(Notification, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.updateNotification({ id: "missing" } as any, buildUser("user-1"))
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("throws UnauthorizedException when sendToId does not match current user", async () => {
      const fakeNotif = {
        id: "n-uuid",
        sendToId: "other-user",
        toJSON: jest.fn().mockReturnValue({}),
        update: jest.fn(),
      } as unknown as Notification;
      jest.spyOn(Notification, "findByPk").mockResolvedValue(fakeNotif);
      await expect(
        resolver.updateNotification({ id: "n-uuid" } as any, buildUser("user-1"))
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("updates notification and commits when user is the recipient", async () => {
      const fakeNotif = {
        id: "n-uuid",
        sendToId: "user-1",
        toJSON: jest.fn().mockReturnValue({ id: "n-uuid" }),
        update: jest.fn().mockResolvedValue(undefined),
      } as unknown as Notification;
      jest.spyOn(Notification, "findByPk").mockResolvedValue(fakeNotif);
      const result = await resolver.updateNotification(
        { id: "n-uuid", read: true } as any,
        buildUser("user-1")
      );
      expect(fakeNotif.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(fakeNotif);
    });

    it("rolls back on unexpected error", async () => {
      const fakeNotif = {
        id: "n-uuid",
        sendToId: "user-1",
        toJSON: jest.fn().mockReturnValue({}),
        update: jest.fn().mockRejectedValue(new Error("db fail")),
      } as unknown as Notification;
      jest.spyOn(Notification, "findByPk").mockResolvedValue(fakeNotif);
      await expect(
        resolver.updateNotification({ id: "n-uuid" } as any, buildUser("user-1"))
      ).rejects.toThrow("db fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
