import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, NotFoundException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { SettingResolver } from "./setting.resolver";
import { AdminSetting, Player } from "@badman/backend-database";

describe("SettingResolver", () => {
  let resolver: SettingResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  beforeEach(async () => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingResolver,
        {
          provide: Sequelize,
          useValue: {
            transaction: jest.fn().mockResolvedValue(mockTransaction),
          },
        },
      ],
    }).compile();

    resolver = module.get<SettingResolver>(SettingResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("setting (query)", () => {
    it("should return a setting by key", async () => {
      const mockSetting = {
        id: "some-uuid",
        key: "enrollment",
        enabled: false,
        startDate: null,
        endDate: null,
      };

      jest.spyOn(AdminSetting, "findOne").mockResolvedValue(mockSetting as any);

      const result = await resolver.setting("enrollment");

      expect(result).toEqual(mockSetting);
      expect(AdminSetting.findOne).toHaveBeenCalledWith({ where: { key: "enrollment" } });
    });

    it("should return null when no setting exists for the key", async () => {
      jest.spyOn(AdminSetting, "findOne").mockResolvedValue(null);

      const result = await resolver.setting("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("settings (query)", () => {
    it("should return all settings", async () => {
      const mockSettings = [
        { id: "uuid-1", key: "enrollment", enabled: false },
        { id: "uuid-2", key: "transfers", enabled: true },
      ];

      jest.spyOn(AdminSetting, "findAll").mockResolvedValue(mockSettings as any);

      const result = await resolver.settings();

      expect(result).toEqual(mockSettings);
      expect(AdminSetting.findAll).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no settings exist", async () => {
      jest.spyOn(AdminSetting, "findAll").mockResolvedValue([]);

      const result = await resolver.settings();

      expect(result).toEqual([]);
    });
  });

  describe("updateSetting (mutation)", () => {
    const mockUser = (hasPermission: boolean) =>
      ({
        hasAnyPermission: jest.fn().mockResolvedValue(hasPermission),
      }) as unknown as Player;

    it("should throw NotFoundException when setting does not exist", async () => {
      const user = mockUser(true);
      const updateData = { id: "some-uuid", enabled: true } as any;

      jest.spyOn(AdminSetting, "findByPk").mockResolvedValue(null);

      await expect(resolver.updateSetting(user, updateData)).rejects.toThrow(NotFoundException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("should throw NotFoundException when no permissions are configured for the setting key", async () => {
      const user = mockUser(true);
      const updateData = { id: "some-uuid", enabled: true } as any;

      const mockSettingInstance = {
        key: "unknown-key",
        update: jest.fn(),
      };

      jest.spyOn(AdminSetting, "findByPk").mockResolvedValue(mockSettingInstance as any);

      await expect(resolver.updateSetting(user, updateData)).rejects.toThrow(NotFoundException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when user lacks permission", async () => {
      const user = mockUser(false);
      const updateData = { id: "some-uuid", enabled: true } as any;

      const mockSettingInstance = {
        key: "enrollment",
        update: jest.fn(),
      };

      jest.spyOn(AdminSetting, "findByPk").mockResolvedValue(mockSettingInstance as any);

      await expect(resolver.updateSetting(user, updateData)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(user.hasAnyPermission).toHaveBeenCalledWith(["change:enrollment"]);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("should check the correct permission for the setting key", async () => {
      const user = mockUser(false);
      const updateData = { id: "some-uuid", enabled: true } as any;

      const mockSettingInstance = {
        key: "enrollment",
        update: jest.fn(),
      };

      jest.spyOn(AdminSetting, "findByPk").mockResolvedValue(mockSettingInstance as any);

      await expect(resolver.updateSetting(user, updateData)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(user.hasAnyPermission).toHaveBeenCalledWith(["change:enrollment"]);
    });

    it("should update and commit when authorized and setting exists", async () => {
      const user = mockUser(true);
      const updateData = { id: "some-uuid", enabled: true, startDate: "2026-04-01" } as any;

      const updatedSetting = { ...updateData, key: "enrollment" };
      const mockSettingInstance = {
        key: "enrollment",
        update: jest.fn().mockResolvedValue(updatedSetting),
      };

      jest.spyOn(AdminSetting, "findByPk").mockResolvedValue(mockSettingInstance as any);

      const result = await resolver.updateSetting(user, updateData);

      expect(result).toEqual(updatedSetting);
      expect(mockSettingInstance.update).toHaveBeenCalledWith(updateData, {
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it("should rollback on unexpected errors", async () => {
      const user = mockUser(true);
      const updateData = { id: "some-uuid", enabled: true } as any;

      const mockSettingInstance = {
        key: "enrollment",
        update: jest.fn().mockRejectedValue(new Error("DB error")),
      };

      jest.spyOn(AdminSetting, "findByPk").mockResolvedValue(mockSettingInstance as any);

      await expect(resolver.updateSetting(user, updateData)).rejects.toThrow("DB error");

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
