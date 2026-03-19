import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, NotFoundException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { EnrollmentSettingResolver } from "./enrollmentSetting.resolver";
import { EnrollmentSetting, Player } from "@badman/backend-database";

describe("EnrollmentSettingResolver", () => {
  let resolver: EnrollmentSettingResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  beforeEach(async () => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentSettingResolver,
        {
          provide: Sequelize,
          useValue: {
            transaction: jest.fn().mockResolvedValue(mockTransaction),
          },
        },
      ],
    }).compile();

    resolver = module.get<EnrollmentSettingResolver>(EnrollmentSettingResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("enrollmentSetting (query)", () => {
    it("should return the enrollment setting", async () => {
      const mockSetting = {
        id: "some-uuid",
        enrollmentOpen: false,
        openDate: null,
        closeDate: null,
      };

      jest.spyOn(EnrollmentSetting, "findOne").mockResolvedValue(mockSetting as any);

      const result = await resolver.enrollmentSetting();

      expect(result).toEqual(mockSetting);
      expect(EnrollmentSetting.findOne).toHaveBeenCalledTimes(1);
    });

    it("should return null when no setting exists", async () => {
      jest.spyOn(EnrollmentSetting, "findOne").mockResolvedValue(null);

      const result = await resolver.enrollmentSetting();

      expect(result).toBeNull();
    });
  });

  describe("updateEnrollmentSetting (mutation)", () => {
    const mockUser = (hasPermission: boolean) =>
      ({
        hasAnyPermission: jest.fn().mockResolvedValue(hasPermission),
      }) as unknown as Player;

    it("should throw UnauthorizedException when user lacks permission", async () => {
      const user = mockUser(false);
      const updateData = { id: "some-uuid", enrollmentOpen: true } as any;

      await expect(resolver.updateEnrollmentSetting(user, updateData)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(user.hasAnyPermission).toHaveBeenCalledWith(["change:enrollment"]);
    });

    it("should throw NotFoundException when setting does not exist", async () => {
      const user = mockUser(true);
      const updateData = { id: "some-uuid", enrollmentOpen: true } as any;

      jest.spyOn(EnrollmentSetting, "findOne").mockResolvedValue(null);

      await expect(resolver.updateEnrollmentSetting(user, updateData)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("should update and commit when authorized and setting exists", async () => {
      const user = mockUser(true);
      const updateData = { id: "some-uuid", enrollmentOpen: true, openDate: "2026-04-01" } as any;

      const updatedSetting = { ...updateData };
      const mockSettingInstance = {
        update: jest.fn().mockResolvedValue(updatedSetting),
      };

      jest.spyOn(EnrollmentSetting, "findOne").mockResolvedValue(mockSettingInstance as any);

      const result = await resolver.updateEnrollmentSetting(user, updateData);

      expect(result).toEqual(updatedSetting);
      expect(mockSettingInstance.update).toHaveBeenCalledWith(updateData, {
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it("should rollback on unexpected errors", async () => {
      const user = mockUser(true);
      const updateData = { id: "some-uuid", enrollmentOpen: true } as any;

      const mockSettingInstance = {
        update: jest.fn().mockRejectedValue(new Error("DB error")),
      };

      jest.spyOn(EnrollmentSetting, "findOne").mockResolvedValue(mockSettingInstance as any);

      await expect(resolver.updateEnrollmentSetting(user, updateData)).rejects.toThrow("DB error");

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
