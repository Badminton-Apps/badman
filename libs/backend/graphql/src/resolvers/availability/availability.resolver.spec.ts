import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { Availability, Location, Player } from "@badman/backend-database";
import { AvailabilitysResolver } from "./availability.resolver";

describe("AvailabilitysResolver", () => {
  let resolver: AvailabilitysResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({ id: "user-uuid", hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilitysResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();

    resolver = module.get<AvailabilitysResolver>(AvailabilitysResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("availability (query)", () => {
    it("returns availability by id", async () => {
      const a = { id: "a-uuid" } as unknown as Availability;
      jest.spyOn(Availability, "findByPk").mockResolvedValue(a);
      expect(await resolver.availability("a-uuid")).toBe(a);
    });

    it("returns null when availability not found", async () => {
      jest.spyOn(Availability, "findByPk").mockResolvedValue(null);
      expect(await resolver.availability("missing")).toBeNull();
    });
  });

  describe("availabilities (query)", () => {
    it("returns paged availability results", async () => {
      const result = { count: 1, rows: [{ id: "a-uuid" }] } as any;
      jest.spyOn(Availability, "findAndCountAll").mockResolvedValue(result);
      expect(await resolver.availabilities({} as any)).toBe(result);
    });
  });

  describe("createAvailability (mutation)", () => {
    it("throws NotFoundException when location not found", async () => {
      jest.spyOn(Location, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.createAvailability({ locationId: "loc-uuid" } as any, buildUser(true))
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("throws UnauthorizedException when user lacks location edit permission", async () => {
      const fakeLocation = { clubId: "club-uuid" } as unknown as Location;
      jest.spyOn(Location, "findByPk").mockResolvedValue(fakeLocation);
      await expect(
        resolver.createAvailability({ locationId: "loc-uuid" } as any, buildUser(false))
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("creates availability and commits on success", async () => {
      const fakeLocation = { clubId: "club-uuid" } as unknown as Location;
      const fakeAvail = { id: "a-new" } as unknown as Availability;
      jest.spyOn(Location, "findByPk").mockResolvedValue(fakeLocation);
      jest.spyOn(Availability, "create").mockResolvedValue(fakeAvail);
      const result = await resolver.createAvailability(
        { locationId: "loc-uuid" } as any,
        buildUser(true)
      );
      expect(Availability.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(fakeAvail);
    });
  });

  describe("updateAvailability (mutation)", () => {
    it("throws NotFoundException when availability not found", async () => {
      jest.spyOn(Availability, "findByPk").mockResolvedValue(null);
      await expect(
        resolver.updateAvailability({ id: "missing" } as any, buildUser(true))
      ).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("throws UnauthorizedException when user lacks location edit permission", async () => {
      const fakeAvail = {
        location: { clubId: "club-uuid" },
        toJSON: jest.fn().mockReturnValue({}),
        update: jest.fn(),
      } as unknown as Availability;
      jest.spyOn(Availability, "findByPk").mockResolvedValue(fakeAvail);
      await expect(
        resolver.updateAvailability({ id: "a-uuid" } as any, buildUser(false))
      ).rejects.toThrow(UnauthorizedException);
    });

    it("updates availability and commits on success", async () => {
      const fakeAvail = {
        location: { clubId: "club-uuid" },
        toJSON: jest.fn().mockReturnValue({ id: "a-uuid" }),
        update: jest.fn().mockResolvedValue(undefined),
      } as unknown as Availability;
      jest.spyOn(Availability, "findByPk").mockResolvedValue(fakeAvail);
      const result = await resolver.updateAvailability(
        { id: "a-uuid", exceptions: [] } as any,
        buildUser(true)
      );
      expect(fakeAvail.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(fakeAvail);
    });

    it("rolls back on error", async () => {
      const fakeAvail = {
        location: { clubId: "club-uuid" },
        toJSON: jest.fn().mockReturnValue({}),
        update: jest.fn().mockRejectedValue(new Error("db fail")),
      } as unknown as Availability;
      jest.spyOn(Availability, "findByPk").mockResolvedValue(fakeAvail);
      await expect(
        resolver.updateAvailability({ id: "a-uuid", exceptions: [] } as any, buildUser(true))
      ).rejects.toThrow("db fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
