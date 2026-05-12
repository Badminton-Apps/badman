import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { Club, LocationNewInput, Player } from "@badman/backend-database";
import { ErrorCode } from "../../utils";
import { LocationResolver } from "./location.resolver";

describe("LocationResolver.createLocation", () => {
  let resolver: LocationResolver;
  let mockTransaction: { commit: jest.Mock; rollback: jest.Mock };

  const userWithPermission = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  const baseInput = (overrides: Partial<LocationNewInput> = {}): LocationNewInput =>
    ({
      clubId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      name: "Sports Hall",
      ...overrides,
    }) as LocationNewInput;

  beforeEach(async () => {
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationResolver,
        {
          provide: Sequelize,
          useValue: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
        },
      ],
    }).compile();

    resolver = module.get<LocationResolver>(LocationResolver);
  });

  afterEach(() => jest.restoreAllMocks());

  // ---------------------------------------------------------------------------
  // BAD_USER_INPUT — UUID validation (T014)
  // ---------------------------------------------------------------------------

  it("throws BAD_USER_INPUT and logs warn when newLocationData.clubId is not a UUID", async () => {
    const user = userWithPermission(true);
    const txSpy = jest.spyOn(resolver["_sequelize"], "transaction");
    const warnSpy = jest.spyOn(Logger.prototype, "warn");

    try {
      await resolver.createLocation(baseInput({ clubId: "smash-for-fun" }), user);
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
      expect(e.extensions["field"]).toBe("clubId");
      expect(e.extensions["value"]).toBe("smash-for-fun");
    }

    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(txSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.BAD_USER_INPUT,
        field: "clubId",
        value: "smash-for-fun",
      })
    );
  });

  // ---------------------------------------------------------------------------
  // Existing behavior — club not found
  // ---------------------------------------------------------------------------

  it("throws NotFoundException when club does not exist (UUID path unchanged)", async () => {
    const user = userWithPermission(true);
    jest.spyOn(Club, "findByPk").mockResolvedValue(null);

    await expect(
      resolver.createLocation(baseInput(), user)
    ).rejects.toThrow();

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });
});
