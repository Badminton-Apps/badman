import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { Faq, Player } from "@badman/backend-database";
import { FaqResolver } from "./faq.resolver";

describe("FaqResolver", () => {
  let resolver: FaqResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const buildUser = (allowed: boolean) =>
    ({ id: "user-uuid", hasAnyPermission: jest.fn().mockResolvedValue(allowed) }) as unknown as Player;

  beforeEach(async () => {
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();

    resolver = module.get<FaqResolver>(FaqResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("faq (query)", () => {
    it("returns faq by id", async () => {
      const fakeFaq = { id: "f-uuid" } as unknown as Faq;
      jest.spyOn(Faq, "findByPk").mockResolvedValue(fakeFaq);
      expect(await resolver.faq("f-uuid")).toBe(fakeFaq);
    });

    it("returns null when faq not found", async () => {
      jest.spyOn(Faq, "findByPk").mockResolvedValue(null);
      expect(await resolver.faq("missing")).toBeNull();
    });
  });

  describe("faqs (query)", () => {
    it("returns list of faqs", async () => {
      const list = [{ id: "f1" }, { id: "f2" }] as unknown as Faq[];
      jest.spyOn(Faq, "findAll").mockResolvedValue(list);
      expect(await resolver.faqs({} as any)).toEqual(list);
    });
  });

  describe("createFaq (mutation)", () => {
    it("throws UnauthorizedException when user lacks add:faq permission", async () => {
      await expect(resolver.createFaq(buildUser(false), {} as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("creates faq and commits on success", async () => {
      const newFaq = { id: "f-new" } as unknown as Faq;
      jest.spyOn(Faq, "create").mockResolvedValue(newFaq);
      const result = await resolver.createFaq(buildUser(true), { question: "Q?" } as any);
      expect(Faq.create).toHaveBeenCalledWith({ question: "Q?" }, { transaction: mockTransaction });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(newFaq);
    });

    it("rolls back on error", async () => {
      jest.spyOn(Faq, "create").mockRejectedValue(new Error("db fail"));
      await expect(resolver.createFaq(buildUser(true), {} as any)).rejects.toThrow("db fail");
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe("updateFaq (mutation)", () => {
    it("throws UnauthorizedException when user lacks edit:faq permission", async () => {
      await expect(resolver.updateFaq(buildUser(false), { id: "f-uuid" } as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws NotFoundException when faq not found", async () => {
      jest.spyOn(Faq, "findByPk").mockResolvedValue(null);
      await expect(resolver.updateFaq(buildUser(true), { id: "missing" } as any)).rejects.toThrow(
        NotFoundException
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("updates faq and commits on success", async () => {
      const fakeFaq = {
        update: jest.fn().mockResolvedValue({ id: "f-uuid", question: "New?" }),
      } as unknown as Faq;
      jest.spyOn(Faq, "findByPk").mockResolvedValue(fakeFaq);
      const result = await resolver.updateFaq(buildUser(true), { id: "f-uuid", question: "New?" } as any);
      expect(fakeFaq.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual({ id: "f-uuid", question: "New?" });
    });
  });

  describe("deleteFaq (mutation)", () => {
    it("throws UnauthorizedException when user lacks edit:faq permission", async () => {
      await expect(resolver.deleteFaq(buildUser(false), "f-uuid")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws NotFoundException when faq not found", async () => {
      jest.spyOn(Faq, "findByPk").mockResolvedValue(null);
      await expect(resolver.deleteFaq(buildUser(true), "missing")).rejects.toThrow(NotFoundException);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("destroys faq and commits on success", async () => {
      const fakeFaq = { destroy: jest.fn().mockResolvedValue(undefined) } as unknown as Faq;
      jest.spyOn(Faq, "findByPk").mockResolvedValue(fakeFaq);
      const result = await resolver.deleteFaq(buildUser(true), "f-uuid");
      expect(fakeFaq.destroy).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
