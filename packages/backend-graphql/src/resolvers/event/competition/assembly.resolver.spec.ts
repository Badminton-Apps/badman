import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Assembly, EncounterCompetition, Player, Team } from "@badman/backend-database";
import { AssemblyValidationService } from "@badman/backend-assembly";
import { EncounterGamesGenerationService } from "@badman/backend-encounter-games";
import { RankingSystemService } from "@badman/backend-ranking";
import { AssemblyResolver } from "./assembly.resolver";

describe("AssemblyResolver", () => {
  let resolver: AssemblyResolver;
  let mockAssemblyService: { validate: jest.Mock };
  let mockRankingSystemService: { getPrimary: jest.Mock; getById: jest.Mock };
  let mockEncounterGamesService: { generateGames: jest.Mock };

  const buildUser = (id = "user-uuid", allowed = true) =>
    ({
      id,
      fullName: "Test User",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  beforeEach(async () => {
    mockAssemblyService = { validate: jest.fn() };
    mockRankingSystemService = { getPrimary: jest.fn(), getById: jest.fn() };
    mockEncounterGamesService = { generateGames: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssemblyResolver,
        { provide: AssemblyValidationService, useValue: mockAssemblyService },
        { provide: RankingSystemService, useValue: mockRankingSystemService },
        { provide: EncounterGamesGenerationService, useValue: mockEncounterGamesService },
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
    const input = { encounterId: "enc-uuid", teamId: "t-uuid" } as any;

    beforeEach(() => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue({
        id: "enc-uuid",
        homeTeamId: "t-uuid",
        awayTeamId: "other-team-uuid",
        tempHomeCaptainId: "temp-home-uuid",
        tempAwayCaptainId: "temp-away-uuid",
      } as unknown as EncounterCompetition);
      jest.spyOn(Team, "findByPk").mockResolvedValue({
        id: "t-uuid",
        clubId: "club-uuid",
        captainId: "captain-uuid",
      } as unknown as Team);
    });

    it("throws NotFoundException when the encounter does not exist", async () => {
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(null);
      await expect(resolver.createAssembly(buildUser(), input)).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when the team does not exist", async () => {
      jest.spyOn(Team, "findByPk").mockResolvedValue(null);
      await expect(resolver.createAssembly(buildUser(), input)).rejects.toThrow(NotFoundException);
    });

    it("rejects a user who is not the captain and lacks permissions, without saving", async () => {
      const findOrCreate = jest.spyOn(Assembly, "findOrCreate");
      const user = buildUser("stranger-uuid", false);

      await expect(resolver.createAssembly(user, input)).rejects.toThrow(UnauthorizedException);

      expect(user.hasAnyPermission).toHaveBeenCalledWith([
        "change-any:encounter",
        "edit-any:club",
        "club-uuid_edit:team",
        "club-uuid_enter:results",
      ]);
      expect(findOrCreate).not.toHaveBeenCalled();
    });

    it("rejects the other side's temporary captain", async () => {
      const findOrCreate = jest.spyOn(Assembly, "findOrCreate");

      await expect(
        resolver.createAssembly(buildUser("temp-away-uuid", false), input)
      ).rejects.toThrow(UnauthorizedException);
      expect(findOrCreate).not.toHaveBeenCalled();
    });

    it.each([
      ["the team captain", "captain-uuid"],
      ["the team's temporary captain", "temp-home-uuid"],
    ])("allows %s without any permission", async (_role, userId) => {
      const newAssembly = { id: "a-new" } as unknown as Assembly;
      jest.spyOn(Assembly, "findOrCreate").mockResolvedValue([newAssembly, true]);
      const user = buildUser(userId, false);

      await expect(resolver.createAssembly(user, input)).resolves.toBe(newAssembly);
      expect(user.hasAnyPermission).not.toHaveBeenCalled();
    });

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
