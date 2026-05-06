import { Test, TestingModule } from "@nestjs/testing";
import { Club, Comment, SubEventCompetition } from "@badman/backend-database";
import { ClubMembershipType, SubEventTypeEnum } from "@badman/utils";
import { GraphQLError } from "graphql";
import { ClubMembershipService } from "../../club/club-membership.service";
import { EnrollmentEntryService } from "./enrollment-entry.service";
import { EnrollmentFinalizeService } from "../enrollment-finalize.service";
import { TeamWriteService } from "../../team/team-write.service";
import { SubmitEnrollmentService } from "./submit-enrollment.service";
import { SubmitEnrollmentInput, SubmitEnrollmentTeamInput } from "./submit-enrollment.input";
import { ErrorCode } from "../../../utils";

describe("SubmitEnrollmentService", () => {
  let service: SubmitEnrollmentService;
  let clubMembershipService: jest.Mocked<ClubMembershipService>;
  let teamWriteService: jest.Mocked<TeamWriteService>;
  let enrollmentEntryService: jest.Mocked<EnrollmentEntryService>;
  let enrollmentFinalizeService: jest.Mocked<EnrollmentFinalizeService>;

  const fakeTransaction = { LOCK: { UPDATE: "UPDATE" } } as never;
  const fakeUser = {
    id: "user-uuid",
    hasAnyPermission: jest.fn().mockResolvedValue(false),
  } as never;

  const makeTeam = (
    overrides: Partial<SubmitEnrollmentTeamInput> = {}
  ): SubmitEnrollmentTeamInput => ({
    type: SubEventTypeEnum.MX,
    subEventId: "subevent-uuid",
    teamNumber: 1,
    basePlayers: [],
    players: [],
    ...overrides,
  });

  const makeInput = (overrides: Partial<SubmitEnrollmentInput> = {}): SubmitEnrollmentInput => ({
    clubId: "club-uuid",
    season: 2025,
    adminEmail: "admin@test.com",
    loans: [],
    transfers: [],
    teams: [makeTeam()],
    ...overrides,
  });

  const defaultCoreResult = { teamId: "team-uuid", link: "link-uuid", alreadyExisted: false };
  const defaultNumberedResult = {
    teamId: "team-uuid",
    teamNumber: 1,
    name: "Club 1H",
    abbreviation: "CL 1H",
  };
  const defaultEntryResult = {
    teamId: "team-uuid",
    entryId: "entry-uuid",
    subEventCompetitionId: "subevent-uuid",
    alreadyExisted: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitEnrollmentService,
        { provide: ClubMembershipService, useValue: { upsertMembership: jest.fn() } },
        {
          provide: TeamWriteService,
          useValue: { upsertTeamCore: jest.fn(), applyTeamNumbersTwoPhase: jest.fn() },
        },
        { provide: EnrollmentEntryService, useValue: { createEntry: jest.fn() } },
        { provide: EnrollmentFinalizeService, useValue: { finalize: jest.fn() } },
      ],
    }).compile();

    service = module.get<SubmitEnrollmentService>(SubmitEnrollmentService);
    clubMembershipService = module.get(ClubMembershipService);
    teamWriteService = module.get(TeamWriteService);
    enrollmentEntryService = module.get(EnrollmentEntryService);
    enrollmentFinalizeService = module.get(EnrollmentFinalizeService);

    // Default happy-path mocks
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue({ eventType: "MX" } as never);
    jest.spyOn(Club, "findByPk").mockResolvedValue({ id: "club-uuid" } as never);
    teamWriteService.upsertTeamCore.mockResolvedValue(defaultCoreResult);
    teamWriteService.applyTeamNumbersTwoPhase.mockResolvedValue([defaultNumberedResult]);
    enrollmentEntryService.createEntry.mockResolvedValue(defaultEntryResult);
    enrollmentFinalizeService.finalize.mockResolvedValue({ alreadyFinalised: false });
  });

  afterEach(() => jest.restoreAllMocks());

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("happy path — 1 new team — returns full result", async () => {
    const result = await service.run({
      input: makeInput(),
      user: fakeUser,
      confirmed: false,
      transaction: fakeTransaction,
    });

    expect(result.alreadyFinalised).toBe(false);
    expect(result.teams).toHaveLength(1);
    expect(result.teams[0]).toMatchObject({
      inputIndex: 0,
      teamId: "team-uuid",
      link: "link-uuid",
      teamNumber: 1,
      name: "Club 1H",
      entryId: "entry-uuid",
      alreadyExisted: false,
    });
  });

  it("happy path — existing team — alreadyExisted: true in result", async () => {
    teamWriteService.upsertTeamCore.mockResolvedValue({
      ...defaultCoreResult,
      alreadyExisted: true,
    });

    const result = await service.run({
      input: makeInput({ teams: [makeTeam({ link: "existing-link" })] }),
      user: fakeUser,
      confirmed: false,
      transaction: fakeTransaction,
    });

    expect(result.teams[0].alreadyExisted).toBe(true);
  });

  it("alreadyFinalised: true propagated from finalize", async () => {
    enrollmentFinalizeService.finalize.mockResolvedValue({ alreadyFinalised: true });

    const result = await service.run({
      input: makeInput(),
      user: fakeUser,
      confirmed: false,
      transaction: fakeTransaction,
    });

    expect(result.alreadyFinalised).toBe(true);
  });

  // ── Transfers and loans ────────────────────────────────────────────────────

  it("calls upsertMembership for each transfer with NORMAL type", async () => {
    const input = makeInput({
      transfers: [
        { playerId: "p1", start: new Date("2025-09-01") },
        { playerId: "p2", start: new Date("2025-09-01") },
      ],
    });

    await service.run({ input, user: fakeUser, confirmed: true, transaction: fakeTransaction });

    expect(clubMembershipService.upsertMembership).toHaveBeenCalledTimes(2);
    expect(clubMembershipService.upsertMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "p1",
        membershipType: ClubMembershipType.NORMAL,
        confirmed: true,
      })
    );
  });

  it("calls upsertMembership for each loan with LOAN type", async () => {
    const input = makeInput({
      loans: [{ playerId: "loaner", start: new Date("2025-09-01") }],
    });

    await service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction });

    expect(clubMembershipService.upsertMembership).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: "loaner", membershipType: ClubMembershipType.LOAN })
    );
  });

  it("passes confirmed flag to upsertMembership", async () => {
    const input = makeInput({ transfers: [{ playerId: "p1", start: new Date() }] });

    await service.run({ input, user: fakeUser, confirmed: true, transaction: fakeTransaction });

    expect(clubMembershipService.upsertMembership).toHaveBeenCalledWith(
      expect.objectContaining({ confirmed: true })
    );
  });

  // ── Remarks ────────────────────────────────────────────────────────────────

  it("writes one Comment per distinct eventCompetition when remarks provided", async () => {
    jest
      .spyOn(SubEventCompetition, "findAll")
      .mockResolvedValue([{ id: "se1", eventId: "event-uuid" } as never]);
    const createSpy = jest.spyOn(Comment, "create").mockResolvedValue({} as never);
    const input = makeInput({ remarks: "Hello" });

    await service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        linkType: "competition",
        linkId: "event-uuid",
        clubId: "club-uuid",
        message: "Hello",
      }),
      expect.anything()
    );
  });

  it("writes two Comments when two distinct eventCompetitions", async () => {
    jest
      .spyOn(SubEventCompetition, "findAll")
      .mockResolvedValue([
        { id: "se1", eventId: "event-A" } as never,
        { id: "se2", eventId: "event-B" } as never,
      ]);
    const createSpy = jest.spyOn(Comment, "create").mockResolvedValue({} as never);
    const input = makeInput({
      remarks: "Hi",
      teams: [makeTeam({ subEventId: "se1" }), makeTeam({ subEventId: "se2", teamNumber: 2 })],
    });
    teamWriteService.upsertTeamCore
      .mockResolvedValueOnce({ teamId: "t1", link: "l1", alreadyExisted: false })
      .mockResolvedValueOnce({ teamId: "t2", link: "l2", alreadyExisted: false });
    teamWriteService.applyTeamNumbersTwoPhase.mockResolvedValue([
      { teamId: "t1", teamNumber: 1, name: "Club 1H", abbreviation: "CL 1H" },
      { teamId: "t2", teamNumber: 2, name: "Club 2H", abbreviation: "CL 2H" },
    ]);
    enrollmentEntryService.createEntry
      .mockResolvedValueOnce({
        teamId: "t1",
        entryId: "e1",
        subEventCompetitionId: "se1",
        alreadyExisted: false,
      })
      .mockResolvedValueOnce({
        teamId: "t2",
        entryId: "e2",
        subEventCompetitionId: "se2",
        alreadyExisted: false,
      });

    await service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction });

    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it("swallows Comment.create error and continues", async () => {
    jest
      .spyOn(SubEventCompetition, "findAll")
      .mockResolvedValue([{ id: "se1", eventId: "event-uuid" } as never]);
    jest.spyOn(Comment, "create").mockRejectedValue(new Error("db-write-failure"));
    const input = makeInput({ remarks: "note" });

    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).resolves.not.toThrow();
  });

  it("does not write Comment when remarks is empty string", async () => {
    const createSpy = jest.spyOn(Comment, "create").mockResolvedValue({} as never);
    const input = makeInput({ remarks: "   " });

    await service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction });

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("does not write Comment when remarks is absent", async () => {
    const createSpy = jest.spyOn(Comment, "create").mockResolvedValue({} as never);
    const input = makeInput({ remarks: undefined });

    await service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction });

    expect(createSpy).not.toHaveBeenCalled();
  });

  // ── Sanity checks ──────────────────────────────────────────────────────────

  it("throws VALIDATION_FAILED duplicate-team-number for same type", async () => {
    const input = makeInput({
      teams: [
        makeTeam({ type: SubEventTypeEnum.MX, teamNumber: 1 }),
        makeTeam({ type: SubEventTypeEnum.MX, teamNumber: 1, subEventId: "se2" }),
      ],
    });

    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).rejects.toSatisfyError(ErrorCode.VALIDATION_FAILED, "duplicate-team-number");
  });

  it("allows same teamNumber for different types", async () => {
    jest
      .spyOn(SubEventCompetition, "findByPk")
      .mockResolvedValueOnce({ eventType: "MX" } as never)
      .mockResolvedValueOnce({ eventType: "M" } as never);
    teamWriteService.upsertTeamCore
      .mockResolvedValueOnce({ teamId: "t1", link: "l1", alreadyExisted: false })
      .mockResolvedValueOnce({ teamId: "t2", link: "l2", alreadyExisted: false });
    teamWriteService.applyTeamNumbersTwoPhase.mockResolvedValue([
      { teamId: "t1", teamNumber: 1, name: "Club 1H", abbreviation: "CL 1H" },
      { teamId: "t2", teamNumber: 1, name: "Club 1H", abbreviation: "CL 1H" },
    ]);
    enrollmentEntryService.createEntry
      .mockResolvedValueOnce({
        teamId: "t1",
        entryId: "e1",
        subEventCompetitionId: "se1",
        alreadyExisted: false,
      })
      .mockResolvedValueOnce({
        teamId: "t2",
        entryId: "e2",
        subEventCompetitionId: "se2",
        alreadyExisted: false,
      });

    const input = makeInput({
      teams: [
        makeTeam({ type: SubEventTypeEnum.MX, teamNumber: 1 }),
        makeTeam({ type: SubEventTypeEnum.M, teamNumber: 1, subEventId: "se2" }),
      ],
    });

    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).resolves.not.toThrow();
  });

  it("throws VALIDATION_FAILED subevent-type-mismatch", async () => {
    jest.spyOn(SubEventCompetition, "findByPk").mockResolvedValue({ eventType: "M" } as never);
    const input = makeInput({ teams: [makeTeam({ type: SubEventTypeEnum.MX })] });

    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).rejects.toSatisfyError(ErrorCode.VALIDATION_FAILED, "subevent-type-mismatch");
  });

  it("throws VALIDATION_FAILED base-not-in-roster", async () => {
    const input = makeInput({
      teams: [makeTeam({ basePlayers: ["p-not-in-roster"], players: ["p1", "p2"] })],
    });

    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).rejects.toSatisfyError(ErrorCode.VALIDATION_FAILED, "base-not-in-roster");
  });

  it("throws NO_TEAMS_TO_FINALISE when teams array is empty", async () => {
    const input = makeInput({ teams: [] });

    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).rejects.toThrow(GraphQLError);
    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).rejects.toMatchObject({ extensions: { code: ErrorCode.NO_TEAMS_TO_FINALISE } });
  });

  it("throws VALIDATION_FAILED team-count-exceeded for 51 teams", async () => {
    const manyTeams = Array.from({ length: 51 }, (_, i) =>
      makeTeam({ teamNumber: i + 1, subEventId: `se-${i}` })
    );
    const input = makeInput({ teams: manyTeams });

    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).rejects.toSatisfyError(ErrorCode.VALIDATION_FAILED, "team-count-exceeded");
  });

  it("sanity runs before any DB write — upsertTeamCore not called on dup-number failure", async () => {
    const input = makeInput({
      teams: [makeTeam({ teamNumber: 1 }), makeTeam({ teamNumber: 1, subEventId: "se2" })],
    });

    await expect(
      service.run({ input, user: fakeUser, confirmed: false, transaction: fakeTransaction })
    ).rejects.toThrow();
    expect(teamWriteService.upsertTeamCore).not.toHaveBeenCalled();
  });
});

// Helper: extend expect to assert GraphQLError code + issue together
expect.extend({
  toSatisfyError(received: unknown, code: string, issue?: string) {
    if (!(received instanceof GraphQLError)) {
      return { pass: false, message: () => `Expected GraphQLError, got ${typeof received}` };
    }
    if (received.extensions?.["code"] !== code) {
      return {
        pass: false,
        message: () => `Expected code ${code}, got ${received.extensions?.["code"]}`,
      };
    }
    if (issue !== undefined && received.extensions?.["issue"] !== issue) {
      return {
        pass: false,
        message: () => `Expected issue ${issue}, got ${received.extensions?.["issue"]}`,
      };
    }
    return { pass: true, message: () => "GraphQLError matches" };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toSatisfyError(code: string, issue?: string): R;
    }
    interface AsymmetricMatchers {
      toSatisfyError(code: string, issue?: string): void;
    }
  }
}
