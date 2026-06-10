import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Assembly, Player } from "@badman/backend-database";
import { AssemblyValidationService } from "@badman/backend-assembly";
import { RankingSystemService } from "@badman/backend-ranking";
import { AssemblyResolver } from "./assembly.resolver";

describe("AssemblyResolver", () => {
  let resolver: AssemblyResolver;
  let mockAssemblyService: { validate: jest.Mock };
  let mockRankingSystemService: { getPrimary: jest.Mock; getById: jest.Mock };

  const buildUser = (id = "user-uuid") => ({ id, fullName: "Test User" }) as unknown as Player;

  beforeEach(async () => {
    mockAssemblyService = { validate: jest.fn() };
    mockRankingSystemService = { getPrimary: jest.fn(), getById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssemblyResolver,
        { provide: AssemblyValidationService, useValue: mockAssemblyService },
        { provide: RankingSystemService, useValue: mockRankingSystemService },
      ],
    }).compile();

    resolver = module.get<AssemblyResolver>(AssemblyResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("validateAssembly (query)", () => {
    it("delegates validation to AssemblyValidationService", async () => {
      const fakeOutput = { valid: true, errors: [] };
      mockAssemblyService.validate.mockResolvedValue(fakeOutput);
      const result = await resolver.validateAssembly(buildUser(), {
        teamId: "t-uuid",
        encounterId: "enc-uuid",
      } as any);
      expect(mockAssemblyService.validate).toHaveBeenCalled();
      expect(result).toBe(fakeOutput);
    });
  });

  describe("createAssembly (mutation)", () => {
    it("throws Error when assembly input is null", async () => {
      await expect(resolver.createAssembly(buildUser(), null as any)).rejects.toThrow(
        "Assembly is required"
      );
    });

    it("throws Error when encounterId is missing", async () => {
      await expect(
        resolver.createAssembly(buildUser(), { teamId: "t-uuid" } as any)
      ).rejects.toThrow("Encounter is required");
    });

    it("throws Error when teamId is missing", async () => {
      await expect(
        resolver.createAssembly(buildUser(), { encounterId: "enc-uuid" } as any)
      ).rejects.toThrow("Team is required");
    });

    it("throws Error when user has no id", async () => {
      await expect(
        resolver.createAssembly(
          { fullName: "No Id" } as unknown as Player,
          { encounterId: "enc-uuid", teamId: "t-uuid" } as any
        )
      ).rejects.toThrow("User is required");
    });

    it("creates and returns new assembly when not found", async () => {
      const newAssembly = {
        id: "a-new",
        encounterId: "enc-uuid",
        teamId: "t-uuid",
      } as unknown as Assembly;
      jest.spyOn(Assembly, "findOrCreate").mockResolvedValue([newAssembly, true]);
      const result = await resolver.createAssembly(buildUser(), {
        encounterId: "enc-uuid",
        teamId: "t-uuid",
      } as any);
      expect(result).toBe(newAssembly);
    });

    it("updates and returns existing assembly when already exists", async () => {
      const existingAssembly = {
        id: "a-existing",
        encounterId: "enc-uuid",
        teamId: "t-uuid",
        assembly: {},
        update: jest.fn().mockResolvedValue({ id: "a-existing" }),
      } as unknown as Assembly;
      jest.spyOn(Assembly, "findOrCreate").mockResolvedValue([existingAssembly, false]);
      const result = await resolver.createAssembly(buildUser(), {
        encounterId: "enc-uuid",
        teamId: "t-uuid",
      } as any);
      expect(existingAssembly.update).toHaveBeenCalled();
    });

    it("returns null on unexpected error (graceful degradation)", async () => {
      jest.spyOn(Assembly, "findOrCreate").mockRejectedValue(new Error("db error"));
      const result = await resolver.createAssembly(buildUser(), {
        encounterId: "enc-uuid",
        teamId: "t-uuid",
      } as any);
      expect(result).toBeNull();
    });
  });

  describe("titularsPlayers (ResolveField)", () => {
    it("returns empty array when titularsPlayerData is null", async () => {
      const result = await resolver.titularsPlayers({ titularsPlayerData: null } as any);
      expect(result).toEqual([]);
    });

    it("throws NotFoundException when ranking system not found", async () => {
      jest.spyOn(Player, "findAll").mockResolvedValue([]);
      mockRankingSystemService.getById.mockResolvedValue(null);
      await expect(
        resolver.titularsPlayers({
          titularsPlayerData: [{ id: "p1" }],
          systemId: "sys-uuid",
        } as any)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
