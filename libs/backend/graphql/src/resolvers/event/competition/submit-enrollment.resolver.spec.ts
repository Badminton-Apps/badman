import { Test, TestingModule } from "@nestjs/testing";
import { Player } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { SubmitEnrollmentResolver } from "./submit-enrollment.resolver";
import { SubmitEnrollmentService } from "./submit-enrollment.service";
import { SubmitEnrollmentInput, SubmitEnrollmentTeamInput } from "./submit-enrollment.input";
import { SubEventTypeEnum } from "@badman/utils";
import { ErrorCode } from "../../../utils";

describe("SubmitEnrollmentResolver.submitEnrollment", () => {
  let resolver: SubmitEnrollmentResolver;
  let submitService: jest.Mocked<SubmitEnrollmentService>;
  let notificationService: jest.Mocked<NotificationService>;

  const commitSpy = jest.fn().mockResolvedValue(undefined);
  const rollbackSpy = jest.fn().mockResolvedValue(undefined);
  const fakeTransaction = {
    commit: commitSpy,
    rollback: rollbackSpy,
    LOCK: { UPDATE: "UPDATE" },
  };
  const fakeSequelize = { transaction: jest.fn().mockResolvedValue(fakeTransaction) };

  const makeUser = (perms: string[] = []) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn((asked: string[]) =>
        Promise.resolve(asked.some((p) => perms.includes(p)))
      ),
    }) as unknown as Player;

  const makeTeam = (): SubmitEnrollmentTeamInput => ({
    type: SubEventTypeEnum.MX,
    subEventId: "sub-uuid",
    teamNumber: 1,
    basePlayers: [],
    players: [],
  });

  const makeInput = (clubId = "club-uuid"): SubmitEnrollmentInput => ({
    clubId,
    season: 2025,
    adminEmail: "admin@test.com",
    loans: [],
    transfers: [],
    teams: [makeTeam()],
  });

  const defaultServiceResult = {
    alreadyFinalised: false,
    teams: [
      {
        inputIndex: 0,
        teamId: "team-uuid",
        link: "link-uuid",
        teamNumber: 1,
        name: "Club 1H",
        abbreviation: "CL 1H",
        entryId: "entry-uuid",
        alreadyExisted: false,
      },
    ],
  };

  beforeEach(async () => {
    commitSpy.mockClear();
    rollbackSpy.mockClear();
    (fakeSequelize.transaction as jest.Mock).mockResolvedValue(fakeTransaction);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitEnrollmentResolver,
        { provide: SubmitEnrollmentService, useValue: { run: jest.fn() } },
        { provide: NotificationService, useValue: { notifyEnrollment: jest.fn() } },
        { provide: Sequelize, useValue: fakeSequelize },
      ],
    }).compile();

    resolver = module.get<SubmitEnrollmentResolver>(SubmitEnrollmentResolver);
    submitService = module.get(SubmitEnrollmentService);
    notificationService = module.get(NotificationService);

    // Default: service succeeds
    submitService.run.mockResolvedValue(defaultServiceResult);
    notificationService.notifyEnrollment.mockResolvedValue(undefined as never);
  });

  afterEach(() => jest.restoreAllMocks());

  // Case 1: anonymous user
  it("throws PERMISSION_DENIED for anonymous user (no perms)", async () => {
    const user = makeUser([]);
    const input = makeInput();

    await expect(resolver.submitEnrollment(user, input)).rejects.toMatchObject({
      extensions: { code: ErrorCode.PERMISSION_DENIED },
    });
    expect(fakeSequelize.transaction).not.toHaveBeenCalled();
  });

  // Case 2: wrong club perm
  it("throws PERMISSION_DENIED for wrong club perm", async () => {
    const user = makeUser(["other-club_edit:club"]);
    const input = makeInput("club-uuid");

    await expect(resolver.submitEnrollment(user, input)).rejects.toMatchObject({
      extensions: { code: ErrorCode.PERMISSION_DENIED },
    });
  });

  // Case 3: club-specific perm granted
  it("calls service when club-specific perm granted", async () => {
    const user = makeUser(["club-uuid_edit:club"]);
    await resolver.submitEnrollment(user, makeInput());
    expect(submitService.run).toHaveBeenCalled();
  });

  // Case 4: edit-any:club perm granted
  it("calls service when edit-any:club perm granted", async () => {
    const user = makeUser(["edit-any:club"]);
    await resolver.submitEnrollment(user, makeInput());
    expect(submitService.run).toHaveBeenCalled();
  });

  // Case 5: service throws — rollback, no notify
  it("rolls back and rethrows when service throws", async () => {
    const user = makeUser(["edit-any:club"]);
    submitService.run.mockRejectedValue(new Error("service-boom"));

    await expect(resolver.submitEnrollment(user, makeInput())).rejects.toThrow("service-boom");
    expect(rollbackSpy).toHaveBeenCalled();
    expect(commitSpy).not.toHaveBeenCalled();
    expect(notificationService.notifyEnrollment).not.toHaveBeenCalled();
  });

  // Case 6: alreadyFinalised: true — notify NOT invoked
  it("does not dispatch notification when alreadyFinalised: true", async () => {
    const user = makeUser(["edit-any:club"]);
    submitService.run.mockResolvedValue({ ...defaultServiceResult, alreadyFinalised: true });

    const result = await resolver.submitEnrollment(user, makeInput());

    expect(notificationService.notifyEnrollment).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.alreadyFinalised).toBe(true);
    expect(result.notificationDispatched).toBe(false);
  });

  // Case 7: alreadyFinalised: false, notify resolves
  it("dispatches notification and sets notificationDispatched: true", async () => {
    const user = makeUser(["edit-any:club"]);
    submitService.run.mockResolvedValue({ ...defaultServiceResult, alreadyFinalised: false });

    const result = await resolver.submitEnrollment(user, makeInput());

    expect(notificationService.notifyEnrollment).toHaveBeenCalledWith(
      "user-uuid",
      "club-uuid",
      2025,
      "admin@test.com"
    );
    expect(result.ok).toBe(true);
    expect(result.notificationDispatched).toBe(true);
  });

  // Case 8: notify rejects — DB stays committed, no rethrow
  it("sets notificationDispatched: false when notify rejects, does not rethrow", async () => {
    const user = makeUser(["edit-any:club"]);
    submitService.run.mockResolvedValue({ ...defaultServiceResult, alreadyFinalised: false });
    notificationService.notifyEnrollment.mockRejectedValue(new Error("smtp-failure"));

    const result = await resolver.submitEnrollment(user, makeInput());

    expect(commitSpy).toHaveBeenCalled();
    expect(rollbackSpy).not.toHaveBeenCalled();
    expect(result.notificationDispatched).toBe(false);
    expect(result.ok).toBe(true);
  });

  // Case 9: change:transfer absent → confirmed: false
  it("passes confirmed: false when user lacks change:transfer", async () => {
    const user = makeUser(["edit-any:club"]);

    await resolver.submitEnrollment(user, makeInput());

    expect(submitService.run).toHaveBeenCalledWith(expect.objectContaining({ confirmed: false }));
  });

  // Case 10: change:transfer present → confirmed: true
  it("passes confirmed: true when user has change:transfer", async () => {
    const user = makeUser(["edit-any:club", "change:transfer"]);

    await resolver.submitEnrollment(user, makeInput());

    expect(submitService.run).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true }));
  });

  // Case 11: idempotent retry — second call returns alreadyFinalised: true
  it("second call returns alreadyFinalised: true, notify invoked exactly once total", async () => {
    const user = makeUser(["edit-any:club"]);
    let callCount = 0;
    submitService.run.mockImplementation(async () => {
      callCount++;
      return { ...defaultServiceResult, alreadyFinalised: callCount > 1 };
    });

    const r1 = await resolver.submitEnrollment(user, makeInput());
    const r2 = await resolver.submitEnrollment(user, makeInput());

    expect(r1.notificationDispatched).toBe(true);
    expect(r2.alreadyFinalised).toBe(true);
    expect(r2.notificationDispatched).toBe(false);
    expect(notificationService.notifyEnrollment).toHaveBeenCalledTimes(1);
  });

  // Case 12: tx.commit called before notifyEnrollment
  it("commits transaction before dispatching notification", async () => {
    const user = makeUser(["edit-any:club"]);
    const callOrder: string[] = [];
    commitSpy.mockImplementation(async () => {
      callOrder.push("commit");
    });
    notificationService.notifyEnrollment.mockImplementation(async () => {
      callOrder.push("notify");
      return undefined as never;
    });

    await resolver.submitEnrollment(user, makeInput());

    expect(callOrder).toEqual(["commit", "notify"]);
  });

  // Return shape
  it("result includes teams array from service", async () => {
    const user = makeUser(["edit-any:club"]);

    const result = await resolver.submitEnrollment(user, makeInput());

    expect(result.teams).toHaveLength(1);
    expect(result.teams[0].entryId).toBe("entry-uuid");
  });

  // GraphQLErrors from service are rethrown without wrapping
  it("rethrows GraphQLError from service unchanged", async () => {
    const user = makeUser(["edit-any:club"]);
    const gqlErr = new GraphQLError("validation", {
      extensions: { code: ErrorCode.VALIDATION_FAILED, issue: "duplicate-team-number" },
    });
    submitService.run.mockRejectedValue(gqlErr);

    await expect(resolver.submitEnrollment(user, makeInput())).rejects.toBe(gqlErr);
    expect(rollbackSpy).toHaveBeenCalled();
  });
});
