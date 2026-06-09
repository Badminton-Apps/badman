import { Test, TestingModule } from "@nestjs/testing";
import { Club, EnrollmentRemark, Player } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { SaveEnrollmentRemarksResolver } from "./save-enrollment-remarks.resolver";
import { SaveEnrollmentRemarksInput } from "./save-enrollment-remarks.input";
import { ErrorCode } from "../../../utils";

const CLUB_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const USER_UUID = "a1b2c3d4-0000-4000-8000-000000000001";

describe("SaveEnrollmentRemarksResolver.saveEnrollmentRemarks", () => {
  let resolver: SaveEnrollmentRemarksResolver;
  let notificationService: jest.Mocked<NotificationService>;

  const commitSpy = jest.fn().mockResolvedValue(undefined);
  const rollbackSpy = jest.fn().mockResolvedValue(undefined);
  const fakeTransaction = { commit: commitSpy, rollback: rollbackSpy };
  const fakeSequelize = { transaction: jest.fn().mockResolvedValue(fakeTransaction) };

  const fakeClub = { id: CLUB_UUID, name: "Test Club" } as Club;

  const makeUser = (id: string | null = USER_UUID) =>
    ({
      id: id ?? undefined,
      hasAnyPermission: jest.fn().mockResolvedValue(true),
    }) as unknown as Player;

  const makeInput = (
    overrides: Partial<SaveEnrollmentRemarksInput> = {}
  ): SaveEnrollmentRemarksInput => ({
    clubId: CLUB_UUID,
    season: 2025,
    remarks: "Wij spelen enkel op maandag.",
    ...overrides,
  });

  beforeEach(async () => {
    commitSpy.mockClear();
    rollbackSpy.mockClear();
    (fakeSequelize.transaction as jest.Mock).mockClear();
    (fakeSequelize.transaction as jest.Mock).mockResolvedValue(fakeTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveEnrollmentRemarksResolver,
        {
          provide: NotificationService,
          useValue: { notifyRescueRemarks: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: Sequelize, useValue: fakeSequelize },
      ],
    }).compile();

    resolver = module.get<SaveEnrollmentRemarksResolver>(SaveEnrollmentRemarksResolver);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => jest.restoreAllMocks());

  // --- US1 Happy Path ---

  // AC1: valid input → create called, returns true
  it("AC1: valid input → EnrollmentRemark.create called, returns true", async () => {
    const user = makeUser();
    jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub);
    const createSpy = jest
      .spyOn(EnrollmentRemark, "create")
      .mockResolvedValue({ createdAt: new Date() } as EnrollmentRemark);

    const result = await resolver.saveEnrollmentRemarks(user, makeInput());

    expect(result).toBe(true);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: CLUB_UUID,
        season: 2025,
        remarks: "Wij spelen enkel op maandag.",
        source: "rescue",
      }),
      expect.objectContaining({ transaction: fakeTransaction })
    );
    expect(commitSpy).toHaveBeenCalled();
    expect(rollbackSpy).not.toHaveBeenCalled();
  });

  // AC2: duplicate submission → second create succeeds (no uniqueness constraint)
  it("AC2: duplicate submission → second EnrollmentRemark.create also succeeds", async () => {
    const user = makeUser();
    jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub);
    const createSpy = jest
      .spyOn(EnrollmentRemark, "create")
      .mockResolvedValue({ createdAt: new Date() } as EnrollmentRemark);

    await resolver.saveEnrollmentRemarks(user, makeInput());
    await resolver.saveEnrollmentRemarks(user, makeInput());

    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  // AC3: adminEmail provided → stored in create args
  it("AC3: adminEmail provided → create called with adminEmail value", async () => {
    const user = makeUser();
    jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub);
    const createSpy = jest
      .spyOn(EnrollmentRemark, "create")
      .mockResolvedValue({ createdAt: new Date() } as EnrollmentRemark);

    await resolver.saveEnrollmentRemarks(user, makeInput({ adminEmail: "admin@myclub.be" }));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ adminEmail: "admin@myclub.be" }),
      expect.anything()
    );
  });

  // AC4: no adminEmail → create called with adminEmail: null
  it("AC4: no adminEmail → create called with adminEmail: null", async () => {
    const user = makeUser();
    jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub);
    const createSpy = jest
      .spyOn(EnrollmentRemark, "create")
      .mockResolvedValue({ createdAt: new Date() } as EnrollmentRemark);

    await resolver.saveEnrollmentRemarks(user, makeInput({ adminEmail: undefined }));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ adminEmail: null }),
      expect.anything()
    );
  });

  // --- US2 Error Paths ---

  // US2-AC1: Club.findByPk returns null → throws CLUB_NOT_FOUND
  it("US2-AC1: Club.findByPk returns null → throws CLUB_NOT_FOUND", async () => {
    const user = makeUser();
    jest.spyOn(Club, "findByPk").mockResolvedValue(null);
    const createSpy = jest.spyOn(EnrollmentRemark, "create");

    try {
      await resolver.saveEnrollmentRemarks(user, makeInput());
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions["code"]).toBe(ErrorCode.CLUB_NOT_FOUND);
    }

    expect(createSpy).not.toHaveBeenCalled();
    expect(fakeSequelize.transaction).not.toHaveBeenCalled();
  });

  // US2-AC2: remarks: '' → throws BAD_USER_INPUT, no DB write
  it("US2-AC2: empty remarks → throws BAD_USER_INPUT, no DB write", async () => {
    const user = makeUser();
    const createSpy = jest.spyOn(EnrollmentRemark, "create");

    try {
      await resolver.saveEnrollmentRemarks(user, makeInput({ remarks: "" }));
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
    }

    expect(createSpy).not.toHaveBeenCalled();
    expect(fakeSequelize.transaction).not.toHaveBeenCalled();
  });

  // US2-AC3: remarks: '   ' → throws BAD_USER_INPUT, no DB write
  it("US2-AC3: whitespace-only remarks → throws BAD_USER_INPUT, no DB write", async () => {
    const user = makeUser();
    const createSpy = jest.spyOn(EnrollmentRemark, "create");

    try {
      await resolver.saveEnrollmentRemarks(user, makeInput({ remarks: "   " }));
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
    }

    expect(createSpy).not.toHaveBeenCalled();
    expect(fakeSequelize.transaction).not.toHaveBeenCalled();
  });

  // US2-AC4: user.id undefined → throws PERMISSION_DENIED
  it("US2-AC4: unauthenticated user (id undefined) → throws PERMISSION_DENIED", async () => {
    const user = makeUser(null);

    try {
      await resolver.saveEnrollmentRemarks(user, makeInput());
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e).toBeInstanceOf(GraphQLError);
      expect(e.extensions["code"]).toBe(ErrorCode.PERMISSION_DENIED);
    }

    expect(fakeSequelize.transaction).not.toHaveBeenCalled();
  });

  // US2-AC5: EnrollmentRemark.create throws → transaction.rollback() called, error propagated
  it("US2-AC5: create throws unexpected error → rollback called, error propagated", async () => {
    const user = makeUser();
    jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub);
    jest.spyOn(EnrollmentRemark, "create").mockRejectedValue(new Error("db-boom"));

    await expect(resolver.saveEnrollmentRemarks(user, makeInput())).rejects.toThrow("db-boom");

    expect(rollbackSpy).toHaveBeenCalled();
    expect(commitSpy).not.toHaveBeenCalled();
    expect(notificationService.notifyRescueRemarks).not.toHaveBeenCalled();
  });
});
