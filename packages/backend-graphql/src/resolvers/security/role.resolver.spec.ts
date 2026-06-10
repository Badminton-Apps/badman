import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { Player, Role } from "@badman/backend-database";
import { RoleResolver } from "./role.resolver";

describe("RoleResolver", () => {
  let resolver: RoleResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  const fakeRole = {
    id: "role-uuid",
    linkId: "club-uuid",
    linkType: "club",
    update: jest.fn(),
    setClaims: jest.fn(),
    destroy: jest.fn(),
    addPlayer: jest.fn(),
    addPlayers: jest.fn(),
    removePlayer: jest.fn(),
    getClaims: jest.fn(),
    getPlayers: jest.fn(),
  } as unknown as Role;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();

    resolver = module.get<RoleResolver>(RoleResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("role (query)", () => {
    it("returns role by id", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      expect(await resolver.role("role-uuid")).toBe(fakeRole);
    });

    it("throws NotFoundException when role not found", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(null);
      await expect(resolver.role("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("roles (query)", () => {
    it("returns list of roles", async () => {
      const list = [fakeRole] as unknown as Role[];
      jest.spyOn(Role, "findAll").mockResolvedValue(list);
      expect(await resolver.roles({} as any)).toEqual(list);
    });
  });

  describe("updateRole (mutation)", () => {
    it("throws NotFoundException when role not found", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(null);
      await expect(resolver.updateRole(buildUser(true), { id: "missing" } as any)).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws UnauthorizedException when user lacks permission", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      await expect(
        resolver.updateRole(buildUser(false), { id: "role-uuid", claims: [] } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("updates role and commits on success", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      (fakeRole.update as jest.Mock).mockResolvedValue(fakeRole);
      (fakeRole.setClaims as jest.Mock).mockResolvedValue(undefined);
      const result = await resolver.updateRole(buildUser(true), {
        id: "role-uuid",
        claims: [{ id: "c1" }],
      } as any);
      expect(fakeRole.update).toHaveBeenCalled();
      expect(fakeRole.setClaims).toHaveBeenCalledWith(["c1"], { transaction: mockTransaction });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(fakeRole);
    });

    it("rolls back on error", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      (fakeRole.update as jest.Mock).mockRejectedValue(new Error("db fail"));
      await expect(
        resolver.updateRole(buildUser(true), { id: "role-uuid", claims: [] } as any)
      ).rejects.toThrow("db fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe("deleteRole (mutation)", () => {
    it("throws NotFoundException when role not found", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(null);
      await expect(resolver.deleteRole(buildUser(true), "missing")).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws UnauthorizedException when user lacks permission", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      await expect(resolver.deleteRole(buildUser(false), "role-uuid")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("destroys role and commits on success", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      (fakeRole.destroy as jest.Mock).mockResolvedValue(undefined);
      const result = await resolver.deleteRole(buildUser(true), "role-uuid");
      expect(fakeRole.destroy).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("createRole (mutation)", () => {
    it("throws UnauthorizedException when user lacks permission", async () => {
      await expect(
        resolver.createRole(buildUser(false), {
          linkId: "club-uuid",
          linkType: "club",
          claims: [],
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it("creates role and commits on success", async () => {
      jest.spyOn(Role, "create").mockResolvedValue(fakeRole);
      (fakeRole.setClaims as jest.Mock).mockResolvedValue(undefined);
      const result = await resolver.createRole(buildUser(true), {
        linkId: "club-uuid",
        linkType: "club",
        claims: [{ id: "c1" }],
      } as any);
      expect(Role.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(fakeRole);
    });
  });

  describe("addPlayerToRole (mutation)", () => {
    it("throws NotFoundException when role not found", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(null);
      await expect(resolver.addPlayerToRole(buildUser(true), "missing", "p1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws UnauthorizedException when user lacks permission", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      await expect(resolver.addPlayerToRole(buildUser(false), "role-uuid", "p1")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws NotFoundException when player not found", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      jest.spyOn(Player, "findByPk").mockResolvedValue(null);
      await expect(resolver.addPlayerToRole(buildUser(true), "role-uuid", "p1")).rejects.toThrow(
        NotFoundException
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("adds player to role and commits on success", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      const fakePlayer = {} as unknown as Player;
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer);
      (fakeRole.addPlayer as jest.Mock).mockResolvedValue(undefined);
      const result = await resolver.addPlayerToRole(buildUser(true), "role-uuid", "p1");
      expect(fakeRole.addPlayer).toHaveBeenCalledWith(fakePlayer, { transaction: mockTransaction });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("removePlayerFromRole (mutation)", () => {
    it("throws NotFoundException when role not found", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(null);
      await expect(resolver.removePlayerFromRole(buildUser(true), "missing", "p1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("removes player and commits on success", async () => {
      jest.spyOn(Role, "findByPk").mockResolvedValue(fakeRole);
      const fakePlayer = {} as unknown as Player;
      jest.spyOn(Player, "findByPk").mockResolvedValue(fakePlayer);
      (fakeRole.removePlayer as jest.Mock).mockResolvedValue(undefined);
      const result = await resolver.removePlayerFromRole(buildUser(true), "role-uuid", "p1");
      expect(fakeRole.removePlayer).toHaveBeenCalledWith(fakePlayer, {
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
