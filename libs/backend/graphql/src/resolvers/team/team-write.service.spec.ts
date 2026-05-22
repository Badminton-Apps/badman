import { Test, TestingModule } from "@nestjs/testing";
import { Team, TeamPlayerMembership } from "@badman/backend-database";
import { TeamWriteService } from "./team-write.service";

describe("TeamWriteService", () => {
  let service: TeamWriteService;

  const fakeTransaction = {
    LOCK: { UPDATE: "UPDATE" },
  } as never;

  const makeTxArgs = (overrides = {}) => ({
    clubId: "club-uuid",
    season: 2025,
    type: "MX",
    players: [],
    txId: "tx-abc",
    txIndex: 0,
    transaction: fakeTransaction,
    ...overrides,
  });

  const fakeTeam = (overrides: Partial<Team> = {}) =>
    ({
      id: "team-uuid",
      link: "link-uuid",
      clubId: "club-uuid",
      season: 2025,
      type: "MX",
      teamNumber: 1000000000,
      name: "__tmp_tx-abc_0",
      abbreviation: "__T0",
      captainId: undefined,
      email: undefined,
      phone: undefined,
      preferredDay: undefined,
      preferredTime: undefined,
      prefferedLocationId: undefined,
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as unknown as Team;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamWriteService],
    }).compile();
    service = module.get<TeamWriteService>(TeamWriteService);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── upsertTeamCore ─────────────────────────────────────────────────────────

  describe("upsertTeamCore", () => {
    it("creates new team with placeholder teamNumber/name/abbreviation", async () => {
      const team = fakeTeam();
      const createSpy = jest.spyOn(Team, "create").mockResolvedValue(team as never);
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([]);

      const result = await service.upsertTeamCore(makeTxArgs());

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          teamNumber: 1_000_000_000,
          name: "__tmp_tx-abc_0",
          abbreviation: "__T0",
          clubId: "club-uuid",
          season: 2025,
          type: "MX",
        }),
        expect.objectContaining({ hooks: false })
      );
      expect(result.alreadyExisted).toBe(false);
      expect(result.teamId).toBe("team-uuid");
    });

    it("uses existing team when link matches", async () => {
      const team = fakeTeam({ id: "existing-uuid", link: "match-link" });
      jest.spyOn(Team, "findOne").mockResolvedValue(team as never);
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([]);

      const result = await service.upsertTeamCore(makeTxArgs({ link: "match-link" }));

      expect(team.update).toHaveBeenCalled();
      expect(result.alreadyExisted).toBe(true);
      expect(result.teamId).toBe("existing-uuid");
    });

    it("does not call Team.create when link matches existing team", async () => {
      const createSpy = jest.spyOn(Team, "create");
      const team = fakeTeam({ id: "existing-uuid", link: "match-link" });
      jest.spyOn(Team, "findOne").mockResolvedValue(team as never);
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([]);

      await service.upsertTeamCore(makeTxArgs({ link: "match-link" }));

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("creates when link provided but no existing team matches", async () => {
      const team = fakeTeam({ link: "fresh-link" });
      jest.spyOn(Team, "findOne").mockResolvedValue(null);
      const createSpy = jest.spyOn(Team, "create").mockResolvedValue(team as never);
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([]);

      const result = await service.upsertTeamCore(makeTxArgs({ link: "fresh-link" }));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ link: "fresh-link" }),
        expect.anything()
      );
      expect(result.alreadyExisted).toBe(false);
    });

    it("adds new players via TeamPlayerMembership.create", async () => {
      const team = fakeTeam();
      jest.spyOn(Team, "create").mockResolvedValue(team as never);
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([]);
      const createMemberSpy = jest
        .spyOn(TeamPlayerMembership, "create")
        .mockResolvedValue({} as never);

      await service.upsertTeamCore(makeTxArgs({ players: ["player-1", "player-2"] }));

      expect(createMemberSpy).toHaveBeenCalledTimes(2);
      expect(createMemberSpy).toHaveBeenCalledWith(
        expect.objectContaining({ teamId: "team-uuid", playerId: "player-1" }),
        expect.objectContaining({ transaction: fakeTransaction })
      );
    });

    it("soft-ends removed players by setting end date", async () => {
      const team = fakeTeam({ id: "existing-uuid", link: "match-link" });
      jest.spyOn(Team, "findOne").mockResolvedValue(team as never);
      const existingMembership = {
        playerId: "player-to-remove",
        end: null,
      } as unknown as TeamPlayerMembership;
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([existingMembership]);
      const updateSpy = jest.spyOn(TeamPlayerMembership, "update").mockResolvedValue([1] as never);

      await service.upsertTeamCore(makeTxArgs({ link: "match-link", players: [] }));

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ end: expect.any(Date) }),
        expect.objectContaining({
          where: { teamId: "existing-uuid", playerId: ["player-to-remove"] },
        })
      );
    });

    it("does not touch memberships for unchanged players", async () => {
      const team = fakeTeam({ id: "existing-uuid", link: "match-link" });
      jest.spyOn(Team, "findOne").mockResolvedValue(team as never);
      const membership = {
        playerId: "unchanged-player",
        end: null,
      } as unknown as TeamPlayerMembership;
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([membership]);
      const createSpy = jest.spyOn(TeamPlayerMembership, "create").mockResolvedValue({} as never);
      const updateSpy = jest.spyOn(TeamPlayerMembership, "update").mockResolvedValue([0] as never);

      await service.upsertTeamCore(
        makeTxArgs({ link: "match-link", players: ["unchanged-player"] })
      );

      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("sets captainId on new team", async () => {
      const team = fakeTeam();
      const createSpy = jest.spyOn(Team, "create").mockResolvedValue(team as never);
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([]);

      await service.upsertTeamCore(makeTxArgs({ captainId: "captain-uuid" }));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ captainId: "captain-uuid" }),
        expect.anything()
      );
    });

    it("generates link when not provided", async () => {
      const team = fakeTeam();
      const createSpy = jest.spyOn(Team, "create").mockResolvedValue(team as never);
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([]);

      const result = await service.upsertTeamCore(makeTxArgs({ link: null }));

      const createdArgs = createSpy.mock.calls[0][0] as unknown as { link: string };
      expect(createdArgs.link).toBeTruthy();
      expect(typeof result.link).toBe("string");
    });

    it("uses provided link when given and no existing match", async () => {
      const team = fakeTeam({ link: "my-link-uuid" });
      jest.spyOn(Team, "findOne").mockResolvedValue(null);
      const createSpy = jest.spyOn(Team, "create").mockResolvedValue(team as never);
      jest.spyOn(TeamPlayerMembership, "findAll").mockResolvedValue([]);

      const result = await service.upsertTeamCore(makeTxArgs({ link: "my-link-uuid" }));

      expect((createSpy.mock.calls[0][0] as unknown as { link: string }).link).toBe("my-link-uuid");
      expect(result.link).toBe("my-link-uuid");
    });
  });

  // ── applyTeamNumbersTwoPhase ───────────────────────────────────────────────

  describe("applyTeamNumbersTwoPhase", () => {
    it("issues temp update (pass B-1) then real update (pass B-2) for each team", async () => {
      const updateCalls: unknown[] = [];
      jest.spyOn(Team, "update").mockImplementation(async (...args) => {
        updateCalls.push(args);
        return [1] as never;
      });
      const reloaded = fakeTeam({
        id: "team-A",
        teamNumber: 1,
        name: "Club 1H",
        abbreviation: "CL 1H",
      });
      jest.spyOn(Team, "findByPk").mockResolvedValue(reloaded as never);

      await service.applyTeamNumbersTwoPhase({
        teams: [{ teamId: "team-A", teamNumber: 1 }],
        clubId: "club-uuid",
        transaction: fakeTransaction,
      });

      // B-1: temp with individualHooks: false
      const b1Team = (updateCalls[0] as unknown[])[0] as { teamNumber: number };
      expect(b1Team.teamNumber).toBeGreaterThanOrEqual(1_000_000_000);
      expect(updateCalls[0]).toEqual([
        expect.objectContaining({ teamNumber: b1Team.teamNumber }),
        expect.objectContaining({ where: { id: "team-A" }, individualHooks: false }),
      ]);
      // B-2: real number with individualHooks: true
      expect(updateCalls[1]).toEqual([
        { teamNumber: 1 },
        expect.objectContaining({ where: { id: "team-A" }, individualHooks: true }),
      ]);
    });

    it("two-team swap: 4 update calls, correct temp numbers for both", async () => {
      const updateCalls: unknown[] = [];
      jest.spyOn(Team, "update").mockImplementation(async (...args) => {
        updateCalls.push(args);
        return [1] as never;
      });
      jest
        .spyOn(Team, "findByPk")
        .mockResolvedValueOnce(
          fakeTeam({ id: "team-A", teamNumber: 2, name: "Club 2H", abbreviation: "CL 2H" }) as never
        )
        .mockResolvedValueOnce(
          fakeTeam({ id: "team-B", teamNumber: 1, name: "Club 1H", abbreviation: "CL 1H" }) as never
        );

      await service.applyTeamNumbersTwoPhase({
        teams: [
          { teamId: "team-A", teamNumber: 2 },
          { teamId: "team-B", teamNumber: 1 },
        ],
        clubId: "club-uuid",
        transaction: fakeTransaction,
      });

      expect(updateCalls).toHaveLength(4);
      // B-1 passes: individualHooks: false for both
      expect((updateCalls[0] as unknown[])[1]).toEqual(
        expect.objectContaining({ individualHooks: false })
      );
      expect((updateCalls[1] as unknown[])[1]).toEqual(
        expect.objectContaining({ individualHooks: false })
      );
      // B-2 passes: individualHooks: true for both
      expect((updateCalls[2] as unknown[])[1]).toEqual(
        expect.objectContaining({ individualHooks: true })
      );
      expect((updateCalls[3] as unknown[])[1]).toEqual(
        expect.objectContaining({ individualHooks: true })
      );
    });

    it("pass B-1 uses temp teamNumber >= 1_000_000_000", async () => {
      const updateCalls: unknown[] = [];
      jest.spyOn(Team, "update").mockImplementation(async (...args) => {
        updateCalls.push(args);
        return [1] as never;
      });
      jest
        .spyOn(Team, "findByPk")
        .mockResolvedValue(fakeTeam({ id: "team-A", teamNumber: 1, name: "Club 1H" }) as never);

      await service.applyTeamNumbersTwoPhase({
        teams: [{ teamId: "team-A", teamNumber: 1 }],
        clubId: "club-uuid",
        transaction: fakeTransaction,
      });

      const b1Args = (updateCalls[0] as unknown[])[0] as { teamNumber: number };
      expect(b1Args.teamNumber).toBeGreaterThanOrEqual(1_000_000_000);
    });

    it("returns final name and abbreviation from reloaded team", async () => {
      jest.spyOn(Team, "update").mockResolvedValue([1] as never);
      const reloaded = fakeTeam({
        id: "team-A",
        teamNumber: 3,
        name: "Badman 3H",
        abbreviation: "BM 3H",
      });
      jest.spyOn(Team, "findByPk").mockResolvedValue(reloaded as never);

      const results = await service.applyTeamNumbersTwoPhase({
        teams: [{ teamId: "team-A", teamNumber: 3 }],
        clubId: "club-uuid",
        transaction: fakeTransaction,
      });

      expect(results[0].name).toBe("Badman 3H");
      expect(results[0].abbreviation).toBe("BM 3H");
      expect(results[0].teamNumber).toBe(3);
    });

    it("returns empty array for empty input", async () => {
      const results = await service.applyTeamNumbersTwoPhase({
        teams: [],
        clubId: "club-uuid",
        transaction: fakeTransaction,
      });

      expect(results).toEqual([]);
    });
  });
});
