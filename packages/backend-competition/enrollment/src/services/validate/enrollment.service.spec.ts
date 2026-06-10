import { Test, TestingModule } from "@nestjs/testing";
import {
  Club,
  DatabaseModule,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { ConfigModule } from "@nestjs/config";
import { EnrollmentValidationService } from "./enrollment.service";
import { IndexCalculationService } from "../index-calculation/index-calculation.service";
import { TeamContinuityRule } from "./rules";

describe("EnrollmentValidationService", () => {
  let service: EnrollmentValidationService;
  // let system: RankingSystem;
  // let draw: DrawCompetition;
  // let subEvent: SubEventCompetition;
  // let encounter: EncounterCompetition;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [EnrollmentValidationService, IndexCalculationService],
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({
          envFilePath: ".env.test",
        }),
      ],
    }).compile();

    service = module.get<EnrollmentValidationService>(EnrollmentValidationService);

    //   // Setup db
    //   const sequelize = module.get<Sequelize>(Sequelize);
    //   await sequelize.sync({ force: true });

    //   const group = SystemGroupBuilder.Create();
    //   system = await SystemBuilder.Create(RankingSystems.BVL, 12, 75, 50)
    //     .AsPrimary()
    //     .WithGroup(group)
    //     .Build();

    //   const drawBuilder = DrawCompetitionBuilder.Create().WithName('Test draw');

    //   const subEventBuilder = SubEventCompetitionBuilder.Create()
    //     .WithName('Test SubEvent')
    //     .WithIndex(53, 70)
    //     .WitnMaxLevel(6);
    //   const encounterBuilder = EncounterCompetitionBuilder.Create();

    //   await EventCompetitionBuilder.Create()
    //     .WithYear(2020)
    //     .WithUsedRanking({ amount: 4, unit: 'months' })
    //     .WithName('Test Event')
    //     .WithSubEvent(
    //       subEventBuilder.WithDraw(drawBuilder.WithEnouncter(encounterBuilder))
    //     )
    //     .Build();

    //   draw = await drawBuilder.Build();
    //   subEvent = await subEventBuilder.Build();
    //   encounter = await encounterBuilder.Build();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should be defined", () => {
    expect(service).toBeDefined();
  });

  test("reused continuity id finds previous season team", async () => {
    const system = { id: "system-1", amountOfLevels: 12 } as RankingSystem;
    const club = new Club({ id: "club-1", name: "Club 1" });
    const previousSeasonTeam = new Team({
      id: "team-prev",
      link: "continuity-1",
      season: 2023,
      name: "Team A",
      teamNumber: 1,
      type: SubEventTypeEnum.M,
    });

    jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(system);
    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    const teamFindAllMock = jest.spyOn(Team, "findAll");
    teamFindAllMock.mockResolvedValueOnce([previousSeasonTeam]);
    teamFindAllMock.mockResolvedValueOnce([previousSeasonTeam]);
    jest.spyOn(SubEventCompetition, "findAll").mockResolvedValue([]);
    jest.spyOn(Player, "findAll").mockResolvedValue([]);

    const data = await service.getValidationData({
      clubId: club.id,
      systemId: system.id,
      season: 2024,
      teams: [
        {
          id: "team-current",
          name: "Team A",
          type: SubEventTypeEnum.M,
          teamNumber: 1,
          link: "continuity-1",
        },
      ],
    });

    expect(data.teams[0].previousSeasonTeam?.link).toBe("continuity-1");
    expect(data.teams[0].isNewTeam).toBe(false);
  });

  test("missing continuity id warns when previous season match exists", async () => {
    const system = { id: "system-1", amountOfLevels: 12 } as RankingSystem;
    const club = new Club({ id: "club-1", name: "Club 1" });
    const previousSeasonTeam = new Team({
      id: "team-prev",
      link: "continuity-1",
      season: 2023,
      name: "Team A",
      teamNumber: 1,
      type: SubEventTypeEnum.M,
    });

    jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(system);
    jest.spyOn(Club, "findByPk").mockResolvedValue(club);
    // No continuity link on the team → the first conditional Team.findAll
    // (previousSeasonTeams) is skipped. Only the previousSeasonClubTeams
    // call runs, and that's the one that should return the candidate match.
    jest.spyOn(Team, "findAll").mockResolvedValue([previousSeasonTeam]);
    jest.spyOn(SubEventCompetition, "findAll").mockResolvedValue([]);
    jest.spyOn(Player, "findAll").mockResolvedValue([]);

    const data = await service.getValidationData({
      clubId: club.id,
      systemId: system.id,
      season: 2024,
      teams: [
        {
          id: "team-current",
          name: "Team A",
          type: SubEventTypeEnum.M,
          teamNumber: 1,
        },
      ],
    });

    const validation = await service.validate(data, [new TeamContinuityRule()]);
    const warningMessages = validation.teams?.[0]?.warnings?.map((w) => w.message) ?? [];

    expect(data.teams[0].previousSeasonTeam).toBeUndefined();
    expect(data.teams[0].possibleOldTeam).toBe(true);
    expect(warningMessages).toContain(
      "all.v1.entryTeamDrawer.validation.warnings.missing-continuity-link"
    );
  });

  describe("getValidationData index calculations", () => {
    const SYSTEM_ID = "system-1";
    const SEASON = 2024;
    const RANKING_DATE_BEFORE_CUTOFF = new Date(SEASON, 4, 15); // May 15 SEASON
    const RANKING_DATE_AFTER_CUTOFF = new Date(SEASON, 5, 20); // June 20 SEASON

    const stubSystem = (amountOfLevels = 12): RankingSystem =>
      ({ id: SYSTEM_ID, amountOfLevels, primary: true }) as unknown as RankingSystem;

    const stubPlayerWithRanking = (
      id: string,
      gender: "M" | "F",
      single?: number,
      double?: number,
      mix?: number,
      rankingDate: Date = RANKING_DATE_BEFORE_CUTOFF
    ): Player => {
      const player = new Player({
        id,
        gender,
        firstName: id,
        lastName: id,
        competitionPlayer: true,
      });
      const place = new RankingPlace({
        playerId: id,
        systemId: SYSTEM_ID,
        single,
        double,
        mix,
        rankingDate,
      });
      (player as unknown as { rankingPlaces: RankingPlace[] }).rankingPlaces = [place];
      return player;
    };

    const stubPlayerWithoutRanking = (id: string, gender: "M" | "F"): Player => {
      const player = new Player({
        id,
        gender,
        firstName: id,
        lastName: id,
        competitionPlayer: true,
      });
      (player as unknown as { rankingPlaces: RankingPlace[] }).rankingPlaces = [];
      return player;
    };

    const arrange = (players: Player[]) => {
      jest.spyOn(RankingSystem, "findByPk").mockResolvedValue(stubSystem());
      jest.spyOn(RankingSystem, "findOne").mockResolvedValue(stubSystem());
      jest.spyOn(RankingSystem, "findAll").mockResolvedValue([stubSystem()]);
      jest.spyOn(Club, "findByPk").mockResolvedValue(new Club({ id: "club-1", name: "Club 1" }));
      jest.spyOn(Team, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findAll").mockResolvedValue([]);
      // Player.findAll is called both by the validator (gender + names) and by
      // IndexCalculationService (gender). Same return is fine for both.
      jest.spyOn(Player, "findAll").mockResolvedValue(players);
      // IndexCalculationService now fetches latest places per player via
      // `_fetchLatestPlacesPerPlayer` (raw SQL DISTINCT ON). Mock that method
      // directly: emulate DB-side DISTINCT ON + rankingDate <= cutoff filter.
      const indexService = module.get<IndexCalculationService>(IndexCalculationService);
      jest
        .spyOn(
          indexService as unknown as { _fetchLatestPlacesPerPlayer: jest.Mock },
          "_fetchLatestPlacesPerPlayer"
        )
        .mockImplementation(((playerIds: string[], _systemId: string, cutoff: Date) => {
          const allPlaces = players.flatMap(
            (p) => (p as unknown as { rankingPlaces?: RankingPlace[] }).rankingPlaces ?? []
          );
          const wanted = new Set(playerIds);
          const eligible = allPlaces
            .filter((rp) => rp.playerId && wanted.has(rp.playerId))
            .filter((rp) => rp.rankingDate && rp.rankingDate <= cutoff)
            .sort((a, b) => (b.rankingDate?.getTime() ?? 0) - (a.rankingDate?.getTime() ?? 0));
          // DISTINCT ON (playerId) — keep first row per player in DESC date order.
          const latestByPlayer = new Map<string, RankingPlace>();
          for (const rp of eligible) {
            if (rp.playerId && !latestByPlayer.has(rp.playerId)) {
              latestByPlayer.set(rp.playerId, rp);
            }
          }
          return Promise.resolve(
            [...latestByPlayer.values()].map((rp) => ({
              playerId: rp.playerId as string,
              single: rp.single ?? null,
              double: rp.double ?? null,
              mix: rp.mix ?? null,
            }))
          );
        }) as unknown as () => Promise<unknown>);
    };

    test("M team: baseIndex sums single+double of 4 base players", async () => {
      const players = [
        stubPlayerWithRanking("p1", "M", 5, 5, 7),
        stubPlayerWithRanking("p2", "M", 6, 6, 8),
        stubPlayerWithRanking("p3", "M", 7, 7, 9),
        stubPlayerWithRanking("p4", "M", 8, 8, 10),
      ];
      arrange(players);

      const data = await service.getValidationData({
        clubId: "club-1",
        systemId: SYSTEM_ID,
        season: SEASON,
        teams: [
          {
            id: "team-1",
            name: "Team A",
            type: SubEventTypeEnum.M,
            teamNumber: 1,
            basePlayers: ["p1", "p2", "p3", "p4"],
          },
        ],
      });

      // (5+5)+(6+6)+(7+7)+(8+8) = 52
      expect(data.teams[0].baseIndex).toBe(52);
      expect(data.teams[0].basePlayers).toHaveLength(4);
    });

    test("F team: 3 base players adds (4-3)*24 penalty", async () => {
      const players = [
        stubPlayerWithRanking("p1", "F", 4, 4, 6),
        stubPlayerWithRanking("p2", "F", 5, 5, 7),
        stubPlayerWithRanking("p3", "F", 6, 6, 8),
      ];
      arrange(players);

      const data = await service.getValidationData({
        clubId: "club-1",
        systemId: SYSTEM_ID,
        season: SEASON,
        teams: [
          {
            id: "team-1",
            name: "Team A",
            type: SubEventTypeEnum.F,
            teamNumber: 1,
            basePlayers: ["p1", "p2", "p3"],
          },
        ],
      });

      // (4+4)+(5+5)+(6+6) + 1*24 = 30 + 24 = 54
      expect(data.teams[0].baseIndex).toBe(54);
    });

    test("MX team: 2M + 2F sums single+double+mix, no penalty", async () => {
      const players = [
        stubPlayerWithRanking("p1", "M", 5, 5, 7),
        stubPlayerWithRanking("p2", "M", 6, 6, 8),
        stubPlayerWithRanking("p3", "F", 4, 4, 6),
        stubPlayerWithRanking("p4", "F", 5, 5, 7),
      ];
      arrange(players);

      const data = await service.getValidationData({
        clubId: "club-1",
        systemId: SYSTEM_ID,
        season: SEASON,
        teams: [
          {
            id: "team-1",
            name: "Team A",
            type: SubEventTypeEnum.MX,
            teamNumber: 1,
            basePlayers: ["p1", "p2", "p3", "p4"],
          },
        ],
      });

      // (5+5+7)+(6+6+8)+(4+4+6)+(5+5+7) = 17+20+14+17 = 68
      expect(data.teams[0].baseIndex).toBe(68);
    });

    test("MX team: 2M + 1F adds (4-3)*36 penalty", async () => {
      const players = [
        stubPlayerWithRanking("p1", "M", 5, 5, 7),
        stubPlayerWithRanking("p2", "M", 6, 6, 8),
        stubPlayerWithRanking("p3", "F", 4, 4, 6),
      ];
      arrange(players);

      const data = await service.getValidationData({
        clubId: "club-1",
        systemId: SYSTEM_ID,
        season: SEASON,
        teams: [
          {
            id: "team-1",
            name: "Team A",
            type: SubEventTypeEnum.MX,
            teamNumber: 1,
            basePlayers: ["p1", "p2", "p3"],
          },
        ],
      });

      // (5+5+7)+(6+6+8)+(4+4+6) + 1*36 = 17+20+14+36 = 87
      expect(data.teams[0].baseIndex).toBe(87);
    });

    test("Player without RankingPlace falls back to min(s,d,m)+2 = amountOfLevels+2 per discipline", async () => {
      const players = [
        stubPlayerWithRanking("p1", "M", 5, 5, 7),
        stubPlayerWithRanking("p2", "M", 6, 6, 8),
        stubPlayerWithRanking("p3", "M", 7, 7, 9),
        stubPlayerWithoutRanking("p4", "M"),
      ];
      arrange(players);

      const data = await service.getValidationData({
        clubId: "club-1",
        systemId: SYSTEM_ID,
        season: SEASON,
        teams: [
          {
            id: "team-1",
            name: "Team A",
            type: SubEventTypeEnum.M,
            teamNumber: 1,
            basePlayers: ["p1", "p2", "p3", "p4"],
          },
        ],
      });

      // Three rated players + one unrated. Unrated: min(12,12,12)+2 = 14 per discipline → single+double = 28.
      // (5+5)+(6+6)+(7+7)+14+14 = 10+12+14+28 = 64
      expect(data.teams[0].baseIndex).toBe(64);
    });

    test("Cutoff: a RankingPlace dated after June 10 of season is ignored; players fall back to amountOfLevels+2", async () => {
      // p1-p3 have rows BEFORE cutoff. p4 has only an AFTER-cutoff row → service ignores it
      // and falls back to min(12,12,12)+2 = 14 per discipline.
      const players = [
        stubPlayerWithRanking("p1", "M", 5, 5, 7, RANKING_DATE_BEFORE_CUTOFF),
        stubPlayerWithRanking("p2", "M", 6, 6, 8, RANKING_DATE_BEFORE_CUTOFF),
        stubPlayerWithRanking("p3", "M", 7, 7, 9, RANKING_DATE_BEFORE_CUTOFF),
        stubPlayerWithRanking("p4", "M", 1, 1, 1, RANKING_DATE_AFTER_CUTOFF),
      ];
      arrange(players);

      const data = await service.getValidationData({
        clubId: "club-1",
        systemId: SYSTEM_ID,
        season: SEASON,
        teams: [
          {
            id: "team-1",
            name: "Team A",
            type: SubEventTypeEnum.M,
            teamNumber: 1,
            basePlayers: ["p1", "p2", "p3", "p4"],
          },
        ],
      });

      // Verify the IndexCalculationService was queried with the validator's June 10 cutoff.
      const indexService = module.get<IndexCalculationService>(IndexCalculationService);
      const fetchSpy = (
        indexService as unknown as { _fetchLatestPlacesPerPlayer: jest.SpyInstance }
      )._fetchLatestPlacesPerPlayer;
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(0);
      const cutoff = fetchSpy.mock.calls[0][2] as Date;
      expect(cutoff.getFullYear()).toBe(SEASON);
      expect(cutoff.getMonth()).toBe(5); // June (0-indexed)
      expect(cutoff.getDate()).toBe(10);
      expect(RANKING_DATE_AFTER_CUTOFF.getTime()).toBeGreaterThan(cutoff.getTime());

      // p4's stronger after-cutoff row is excluded; min+2 fallback yields 14+14=28 for that player.
      // (5+5)+(6+6)+(7+7)+14+14 = 64
      expect(data.teams[0].baseIndex).toBe(64);
    });

    test("Enrollment-only flow: only basePlayers populated; teamIndex defaults to 4-player penalty", async () => {
      // Current enrollment input does not populate t.players. The validator therefore feeds
      // an empty list into teamIndex, which yields the 4*24 penalty (96) for non-MX teams.
      // baseIndex still reflects the actual base roster.
      const players = [
        stubPlayerWithRanking("p1", "M", 5, 5, 7),
        stubPlayerWithRanking("p2", "M", 6, 6, 8),
        stubPlayerWithRanking("p3", "M", 7, 7, 9),
        stubPlayerWithRanking("p4", "M", 8, 8, 10),
      ];
      arrange(players);

      const data = await service.getValidationData({
        clubId: "club-1",
        systemId: SYSTEM_ID,
        season: SEASON,
        teams: [
          {
            id: "team-1",
            name: "Team A",
            type: SubEventTypeEnum.M,
            teamNumber: 2,
            basePlayers: ["p1", "p2", "p3", "p4"],
            // players + backupPlayers omitted — current enrollment shape
          },
        ],
      });

      expect(data.teams[0].baseIndex).toBe(52);
      expect(data.teams[0].teamIndex).toBe(96); // 4 * 24 penalty for empty teamPlayers
      // teamIndex >= baseIndex satisfies team-base-index.rule for non-#1 teams (rule guards against teamIndex < baseIndex).
    });
  });

  // describe('Doubles Male team checks', () => {
  //   let player666: Player;
  //   let player555: Player;
  //   let player777: Player;
  //   let player888: Player;
  //   let player999: Player;

  //   let player111: Player;

  //   let team: Team;

  //   beforeEach(async () => {
  //     player111 = await PlayerBuilder.Create()
  //       .WithName('player 1 - 1 - 1', 'team 1')
  //       .WithCompetitionStatus(false)
  //       .WithRanking(1, 1, 1, new Date('2020-05-09'), system.id)
  //       .Build();

  //     const player555B = PlayerBuilder.Create()
  //       .WithName('player 5 - 5 - 5', 'team 1')
  //       .WithCompetitionStatus(false)
  //       .WithGender('F')
  //       .WithRanking(5, 5, 5, new Date('2020-05-09'), system.id);

  //     const player666B = PlayerBuilder.Create()
  //       .WithName('player 6 - 6 - 6', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('M')
  //       .WithRanking(6, 6, 6, new Date('2020-05-09'), system.id);

  //     const player777B = PlayerBuilder.Create()
  //       .WithName('player 7 - 7 - 7', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('M')
  //       .WithRanking(7, 7, 7, new Date('2020-05-09'), system.id);

  //     const player888B = PlayerBuilder.Create()
  //       .WithName('player 8 - 8 - 8', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('M')
  //       .WithRanking(8, 8, 8, new Date('2020-05-09'), system.id);

  //     const player999B = PlayerBuilder.Create()
  //       .WithName('player 9 - 9 - 9', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('M')
  //       .WithRanking(9, 9, 9, new Date('2020-05-09'), system.id);

  //     const teamB = TeamBuilder.Create(SubEventTypeEnum.M).WithName('team 1');

  //     await ClubBuilder.Create()
  //       .WithName('club 1')
  //       .WithTeam(
  //         teamB
  //           .WithTeamNumber(2)
  //           .WithPlayer(player777B)
  //           .WithPlayer(player888B)
  //           .WithPlayer(player999B)
  //           .WithPlayer(player666B)
  //           .WithEntry(
  //             EventCompetitionEntryBuilder.Create('competition')
  //               .ForDraw(draw)
  //               .ForSubEvent(subEvent)
  //               .WithBasePlayer(player666B, 6, 6, 6)
  //               .WithBasePlayer(player777B, 7, 7, 7)
  //               .WithBasePlayer(player888B, 8, 8, 8)
  //               .WithBasePlayer(player999B, 9, 9, 9)
  //               .WithBaseIndex(60)
  //           )
  //       )
  //       .Build();

  //     player555 = await player555B.Build();
  //     player666 = await player666B.Build();
  //     player777 = await player777B.Build();
  //     player888 = await player888B.Build();
  //     player999 = await player999B.Build();

  //     team = await teamB.Build();
  //   });

  //   it('should be a valid assembly', async () => {
  //     const validation = await service.fetchAndValidate(
  //       {
  //         systemId: system.id,
  //         teamId: team?.id,
  //         encounterId: encounter.id,
  //         single1: player666.id,
  //         single2: player777.id,
  //         single3: player888.id,
  //         single4: player999.id,
  //         double1: [player666.id, player777.id],
  //         double2: [player666.id, player888.id],
  //         double3: [player777.id, player999.id],
  //         double4: [player888.id, player999.id],
  //       },
  //       AssemblyService.defaultValidators()
  //     );

  //     expect(validation).toBeDefined();
  //     expect(validation.valid).toBeTruthy();
  //   });

  //   describe('Rule [PlayerOrderRule]', () => {
  //     describe('valid', () => {
  //       const valid = [
  //         [1, 2],
  //         [2, 3],
  //         [3, 4],
  //       ];

  //       test.each(valid)(
  //         'Single %p is better then Single %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`single${p2}`]: player888.id,
  //               [`single${p1}`]: player777.id,
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();

  //           const error = validation.errors?.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-single'
  //           );
  //           expect(error).toBeUndefined();
  //         }
  //       );

  //       test.each(valid)(
  //         'Double %p is  better then Double %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${p2}`]: [player777.id, player888.id],
  //               [`double${p1}`]: [player666.id, player888.id],
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();

  //           const error = validation.errors?.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-doubles'
  //           );
  //           expect(error).toBeUndefined();
  //         }
  //       );

  //       test.each(valid)(
  //         'Double %p is not better then Double %p by level',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${p2}`]: [player777.id, player888.id],
  //               [`double${p1}`]: [player666.id, player999.id],
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();

  //           const error = validation.errors?.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-highest'
  //           );
  //           expect(error).toBeUndefined();
  //         }
  //       );
  //     });

  //     describe('invalid', () => {
  //       const invalid = [
  //         [1, 2],
  //         [2, 3],
  //         [3, 4],
  //       ];

  //       test.each(invalid)(
  //         'Single %p is not better then Single %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`single${p1}`]: player888.id,
  //               [`single${p2}`]: player777.id,
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-single'
  //           );
  //           expect(error).toBeDefined();
  //           expect(error?.params?.['game1']).toBe(`single${p1}`);
  //           expect(error?.params?.['game2']).toBe(`single${p2}`);
  //           expect(error?.params?.['player1']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['player1']?.['ranking']).toBe(8);

  //           expect(error?.params?.['player2']?.['id']).toBe(player777.id);
  //           expect(error?.params?.['player2']?.['ranking']).toBe(7);
  //         }
  //       );

  //       test.each(invalid)(
  //         'Double %p is better then Double %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${p1}`]: [player777.id, player888.id],
  //               [`double${p2}`]: [player666.id, player888.id],
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-doubles'
  //           );
  //           expect(error).toBeDefined();
  //           expect(error?.params?.['game1']).toBe(`double${p1}`);
  //           expect(error?.params?.['game2']).toBe(`double${p2}`);
  //           // Team 1
  //           expect(error?.params?.['team1player1']?.['id']).toBe(player777.id);
  //           expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
  //           expect(error?.params?.['team1player2']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

  //           // Team 2
  //           expect(error?.params?.['team2player1']?.['id']).toBe(player666.id);
  //           expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
  //           expect(error?.params?.['team2player2']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['team2player2']?.['ranking']).toBe(8);
  //         }
  //       );

  //       test.each(invalid)(
  //         'Double %p is not better then Double %p by level',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${p1}`]: [player777.id, player888.id],
  //               [`double${p2}`]: [player666.id, player999.id],
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-highest'
  //           );
  //           expect(error).toBeDefined();
  //           expect(error?.params?.['game1']).toBe(`double${p1}`);
  //           expect(error?.params?.['game2']).toBe(`double${p2}`);
  //           // Team 1
  //           expect(error?.params?.['team1player1']?.['id']).toBe(player777.id);
  //           expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
  //           expect(error?.params?.['team1player2']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

  //           // Team 2
  //           expect(error?.params?.['team2player1']?.['id']).toBe(player666.id);
  //           expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
  //           expect(error?.params?.['team2player2']?.['id']).toBe(player999.id);
  //           expect(error?.params?.['team2player2']?.['ranking']).toBe(9);
  //         }
  //       );
  //     });
  //   });

  //   describe('Rule [TeamSubeventIndexRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new TeamSubeventIndexRule()]
  //         );

  //         expect(validation).toBeDefined();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.team-to-strong'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it('should be invalid if team index lower then the base', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player111.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new TeamSubeventIndexRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.team-to-strong'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['teamIndex']).toBe(50);
  //         expect(error?.params?.['minIndex']).toBe(53);
  //         expect(error?.params?.['maxIndex']).toBe(70);
  //       });
  //     });
  //   });

  //   describe('Rule [SubTeamIndexRule]', () => {
  //     describe('warning', () => {
  //       it.skip('should give warning if the sub is better than one of the players', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //             subtitudes: [player888.id],
  //           },
  //           [new SubTeamIndexRule()]
  //         );

  //         expect(validation).toBeDefined();

  //         const warning = validation.warnings?.find(
  //           (e) =>
  //             e.message ===
  //             'all.competition.team-assembly.warnings.subtitute-team-index'
  //         );

  //         expect(warning).toBeDefined();
  //         expect(warning?.params?.['sub']).toBe(player888.id);
  //         expect(
  //           warning?.params?.['players']?.find((p) => p.id === player999.id)
  //         ).toBeDefined();
  //       });
  //     });
  //   });

  //   describe('Rule [CompetitionStatusRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new CompetitionStatusRule()]
  //         );

  //         expect(validation).toBeDefined();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message === 'all.v1.teamFormation.errors.comp-status-html'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it("should be invalid if the player doesn't have competition status on true ", async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new CompetitionStatusRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message === 'all.v1.teamFormation.errors.comp-status-html'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['id']).toBe(player555.id);
  //       });

  //       it("should be invalid if the players doesn't have competition status on true ", async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player111.id,
  //             single2: player555.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new CompetitionStatusRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const errors = validation.errors.filter(
  //           (e) =>
  //             e.message === 'all.v1.teamFormation.errors.comp-status-html'
  //         );

  //         expect(errors).toBeDefined();
  //         expect(errors.length).toBe(2);
  //       });
  //     });
  //   });

  //   describe('Rule [PlayerMaxGamesRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid single', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-single-games'
  //         );
  //         expect(error).toBeUndefined();
  //       });

  //       it('should be valid double', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double1: [player666.id, player777.id],
  //             double2: [player666.id, player888.id],
  //             double3: [player777.id, player999.id],
  //             double4: [player888.id, player999.id],
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-double-games'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it('should be invalid if the player has more then 1 single game ', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: player555.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-single-games'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player']?.['id']).toBe(player555.id);
  //       });

  //       it('should be invalid if the player has more then 2 doubles', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double1: [player666.id, player777.id],
  //             double2: [player666.id, player888.id],
  //             double3: [player666.id, player999.id],
  //             double4: [player888.id, player999.id],
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-double-games'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player']?.['id']).toBe(player666.id);
  //       });
  //     });
  //   });

  //   describe('Rule [PlayerGenderRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid single', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double1: [player666.id, player777.id],
  //             double2: [player666.id, player888.id],
  //             double3: [player777.id, player999.id],
  //             double4: [player888.id, player999.id],
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new PlayerGenderRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //               'all.v1.teamFormation.errors.player-genders' ||
  //             e.message === 'all.v1.teamFormation.errors.player-gender'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       // const games = [[1], [2], [3], [4]];
  //       const games = [[2]];

  //       test.each(games)(
  //         'should be invalid single if the player the wrong gender',
  //         async (g) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`single${g}`]: player555.id,
  //             },
  //             [new PlayerGenderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-gender'
  //           );

  //           expect(error).toBeDefined();
  //           expect(error?.params?.['player']?.['id']).toBe(player555.id);
  //         }
  //       );

  //       test.each(games)(
  //         'should be invalid double if the player the wrong gender',
  //         async (g) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${g}`]: [player555.id, player666.id],
  //             },
  //             [new PlayerGenderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-gender'
  //           );

  //           expect(error).toBeDefined();
  //           expect(error?.params?.['player']?.['id']).toBe(player555.id);
  //         }
  //       );
  //     });
  //   });
  // });

  // describe('Mixed team checks', () => {
  //   let player555: Player;

  //   let player666: Player;
  //   let player777: Player;
  //   let player888: Player;
  //   let player999: Player;

  //   let team: Team;

  //   beforeEach(async () => {
  //     const player555B = PlayerBuilder.Create()
  //       .WithName('player 5 - 5 - 5', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('M')
  //       .WithRanking(5, 5, 5, new Date('2020-05-09'), system.id);

  //     const player666B = PlayerBuilder.Create()
  //       .WithName('player 6 - 6 - 6', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('M')
  //       .WithRanking(6, 6, 6, new Date('2020-05-09'), system.id);

  //     const player777B = PlayerBuilder.Create()
  //       .WithName('player 7 - 7 - 7', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('M')
  //       .WithRanking(7, 7, 7, new Date('2020-05-09'), system.id);

  //     const player888B = PlayerBuilder.Create()
  //       .WithName('player 8 - 8 - 8', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('F')
  //       .WithRanking(8, 8, 8, new Date('2020-05-09'), system.id);

  //     const player999B = PlayerBuilder.Create()
  //       .WithName('player 9 - 9 - 9', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('F')
  //       .WithRanking(9, 9, 9, new Date('2020-05-09'), system.id);

  //     const teamB = TeamBuilder.Create(SubEventTypeEnum.MX).WithName('team 1');

  //     await ClubBuilder.Create()
  //       .WithName('club 1')
  //       .WithTeam(
  //         teamB
  //           .WithTeamNumber(2)
  //           .WithPlayer(player777B)
  //           .WithPlayer(player888B)
  //           .WithPlayer(player999B)
  //           .WithPlayer(player666B)
  //           .WithEntry(
  //             EventCompetitionEntryBuilder.Create('competition')
  //               .ForDraw(draw)
  //               .ForSubEvent(subEvent)
  //               .WithBasePlayer(player666B, 6, 6, 6)
  //               .WithBasePlayer(player777B, 7, 7, 7)
  //               .WithBasePlayer(player888B, 8, 8, 8)
  //               .WithBasePlayer(player999B, 9, 9, 9)
  //               .WithBaseIndex(60)
  //           )
  //       )
  //       .Build();

  //     player555 = await player555B.Build();
  //     player666 = await player666B.Build();
  //     player777 = await player777B.Build();
  //     player888 = await player888B.Build();
  //     player999 = await player999B.Build();

  //     team = await teamB.Build();
  //   });
  //   describe('Rule [PlayerOrderRule]', () => {
  //     describe('valid', () => {
  //       it('Double 3 is better then Double 4', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double3: [player666.id, player999.id],
  //             double4: [player777.id, player888.id],
  //           },
  //           [new PlayerOrderRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-order-highest'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       const invalid = [
  //         [1, 2],
  //         [3, 4],
  //       ];

  //       test.each(invalid)(
  //         'Single %p is not better then Single %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`single${p1}`]: player888.id,
  //               [`single${p2}`]: player777.id,
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-single'
  //           );
  //           expect(error).toBeDefined();
  //           expect(error?.params?.['game1']).toBe(`single${p1}`);
  //           expect(error?.params?.['game2']).toBe(`single${p2}`);
  //           expect(error?.params?.['player1']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['player1']?.['ranking']).toBe(8);

  //           expect(error?.params?.['player2']?.['id']).toBe(player777.id);
  //           expect(error?.params?.['player2']?.['ranking']).toBe(7);
  //         }
  //       );

  //       it('Mixed double is better then other', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double3: [player777.id, player888.id],
  //             double4: [player666.id, player888.id],
  //           },
  //           [new PlayerOrderRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-order-doubles'
  //         );
  //         expect(error).toBeDefined();
  //         expect(error?.params?.['game1']).toBe(`double3`);
  //         expect(error?.params?.['game2']).toBe(`double4`);
  //         // Team 1
  //         expect(error?.params?.['team1player1']?.['id']).toBe(player777.id);
  //         expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
  //         expect(error?.params?.['team1player2']?.['id']).toBe(player888.id);
  //         expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

  //         // Team 2
  //         expect(error?.params?.['team2player1']?.['id']).toBe(player666.id);
  //         expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
  //         expect(error?.params?.['team2player2']?.['id']).toBe(player888.id);
  //         expect(error?.params?.['team2player2']?.['ranking']).toBe(8);
  //       });

  //       it('Mixed double is better then other by level', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double3: [player777.id, player888.id],
  //             double4: [player666.id, player999.id],
  //           },
  //           [new PlayerOrderRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-order-highest'
  //         );
  //         expect(error).toBeDefined();
  //         expect(error?.params?.['game1']).toBe(`double3`);
  //         expect(error?.params?.['game2']).toBe(`double4`);
  //         // Team 1
  //         expect(error?.params?.['team1player1']?.['id']).toBe(player777.id);
  //         expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
  //         expect(error?.params?.['team1player2']?.['id']).toBe(player888.id);
  //         expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

  //         // Team 2
  //         expect(error?.params?.['team2player1']?.['id']).toBe(player666.id);
  //         expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
  //         expect(error?.params?.['team2player2']?.['id']).toBe(player999.id);
  //         expect(error?.params?.['team2player2']?.['ranking']).toBe(9);
  //       });
  //     });
  //   });

  //   describe('Rule [PlayerMaxGamesRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid doubles', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double1: [player666.id, player888.id],
  //             double2: [player777.id, player999.id],
  //             double3: [player666.id, player777.id],
  //             double4: [player888.id, player999.id],
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-double-games'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it('should be invalid if the player has more then 1 mixed', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double3: [player666.id, player999.id],
  //             double4: [player888.id, player999.id],
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-mix-games'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player']?.['id']).toBe(player999.id);
  //       });
  //     });
  //   });

  //   describe('Rule [PlayerGenderRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid doubles', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double1: [player666.id, player777.id],
  //             double2: [player888.id, player999.id],
  //             double3: [player666.id, player888.id],
  //             double4: [player777.id, player999.id],
  //           },
  //           [new PlayerGenderRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //               'all.v1.teamFormation.errors.player-genders' ||
  //             e.message === 'all.v1.teamFormation.errors.player-gender'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it('should be invalid if a mixed 3 has 2 of the same gender', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double3: [player666.id, player777.id],
  //             double4: [player888.id, player777.id],
  //           },
  //           [new PlayerGenderRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-genders'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player2']?.['gender']).toBe(player777.gender);
  //         expect(error?.params?.['game']).toBe('double3');
  //       });

  //       it('should be invalid if a mixed 4 has 2 of the same gender', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double3: [player666.id, player999.id],
  //             double4: [player888.id, player999.id],
  //           },
  //           [new PlayerGenderRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-genders'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player2']?.['gender']).toBe(player999.gender);
  //         expect(error?.params?.['game']).toBe('double4');
  //       });
  //     });
  //   });

  //   describe('Rule [PlayerMinLevel]', () => {
  //     describe('valid', () => {
  //       it('should be valid', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new PlayerMinLevelRule()]
  //         );

  //         expect(validation).toBeDefined();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-min-level'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it("should be invalid if the player doesn't have competition status on true ", async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new PlayerMinLevelRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-min-level'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player']?.['id']).toBe(player555.id);
  //       });
  //     });
  //   });
  // });

  // describe('Multiple teams in club', () => {
  //   let player555: Player;

  //   let playerT1r666: Player;
  //   let playerT1r777: Player;
  //   let playerT1r888: Player;
  //   let playerT1r999: Player;

  //   let playerT2r666: Player;
  //   let playerT2r777: Player;
  //   let playerT2r888: Player;
  //   let playerT2r999: Player;

  //   let teamA: Team;
  //   let teamB: Team;

  //   beforeEach(async () => {
  //     const player555B = PlayerBuilder.Create()
  //       .WithName('player 5 - 5 - 5', 'team 1')
  //       .WithCompetitionStatus(false)
  //       .WithRanking(5, 5, 5, new Date('2020-05-09'), system.id);

  //     const playerT1r666B = PlayerBuilder.Create()
  //       .WithName('player 6 - 6 - 6', 'team A')
  //       .WithCompetitionStatus(true)
  //       .WithRanking(6, 6, 6, new Date('2020-05-09'), system.id);

  //     const playerT1r777B = PlayerBuilder.Create()
  //       .WithName('player 7 - 7 - 7', 'team A')
  //       .WithCompetitionStatus(true)
  //       .WithRanking(7, 7, 7, new Date('2020-05-09'), system.id);

  //     const playerT1r888B = PlayerBuilder.Create()
  //       .WithName('player 8 - 8 - 8', 'team A')
  //       .WithCompetitionStatus(true)
  //       .WithRanking(8, 8, 8, new Date('2020-05-09'), system.id);

  //     const playerT1r999B = PlayerBuilder.Create()
  //       .WithName('player 9 - 9 - 9', 'team A')
  //       .WithCompetitionStatus(true)
  //       .WithRanking(9, 9, 9, new Date('2020-05-09'), system.id);

  //     const playerT2r666B = PlayerBuilder.Create()
  //       .WithName('player 6 - 6 - 6', 'team B')
  //       .WithCompetitionStatus(true)
  //       .WithRanking(6, 6, 6, new Date('2020-05-09'), system.id);

  //     const playerT2r777B = PlayerBuilder.Create()
  //       .WithName('player 7 - 7 - 7', 'team B')
  //       .WithCompetitionStatus(true)
  //       .WithRanking(7, 7, 7, new Date('2020-05-09'), system.id);

  //     const playerT2r888B = PlayerBuilder.Create()
  //       .WithName('player 8 - 8 - 8', 'team B')
  //       .WithCompetitionStatus(true)
  //       .WithRanking(8, 8, 8, new Date('2020-05-09'), system.id);

  //     const playerT2r999B = PlayerBuilder.Create()
  //       .WithName('player 9 - 9 - 9', 'team B')
  //       .WithCompetitionStatus(true)
  //       .WithRanking(9, 9, 9, new Date('2020-05-09'), system.id);

  //     const teamAB = TeamBuilder.Create(SubEventTypeEnum.M)
  //       .WithTeamNumber(1)
  //       .WithName('team 1');
  //     const teamBB = TeamBuilder.Create(SubEventTypeEnum.M)
  //       .WithTeamNumber(2)
  //       .WithName('team 2');

  //     await ClubBuilder.Create()
  //       .WithName('club 1')
  //       .WithTeam(
  //         teamAB
  //           .WithPlayer(playerT1r777B)
  //           .WithPlayer(playerT1r888B)
  //           .WithPlayer(playerT1r999B)
  //           .WithPlayer(playerT1r666B)
  //           .WithEntry(
  //             EventCompetitionEntryBuilder.Create(
  //               'competition',
  //               '287a088e-14b1-47c5-9086-e728c6615664'
  //             )
  //               .ForDraw(draw)
  //               .ForSubEvent(subEvent)
  //               .WithBasePlayer(playerT1r666B, 6, 6, 6)
  //               .WithBasePlayer(playerT1r777B, 7, 7, 7)
  //               .WithBasePlayer(playerT1r888B, 8, 8, 8)
  //               .WithBasePlayer(playerT1r999B, 9, 9, 9)
  //               .WithBaseIndex(60)
  //           )
  //       )

  //       .WithTeam(
  //         teamBB
  //           .WithPlayer(playerT2r777B)
  //           .WithPlayer(playerT2r888B)
  //           .WithPlayer(playerT2r999B)
  //           .WithPlayer(playerT2r666B)
  //           .WithEntry(
  //             EventCompetitionEntryBuilder.Create(
  //               'competition',
  //               '246f21b8-8eab-4597-b9c5-4ef712991cc3'
  //             )
  //               .ForDraw(draw)
  //               .ForSubEvent(subEvent)
  //               .WithBasePlayer(playerT2r666B, 6, 6, 6)
  //               .WithBasePlayer(playerT2r777B, 7, 7, 7)
  //               .WithBasePlayer(playerT2r888B, 8, 8, 8)
  //               .WithBasePlayer(playerT2r999B, 9, 9, 9)
  //               .WithBaseIndex(60)
  //           )
  //       )
  //       .Build();

  //     player555 = await player555B.Build();

  //     playerT1r666 = await playerT1r666B.Build();
  //     playerT1r777 = await playerT1r777B.Build();
  //     playerT1r888 = await playerT1r888B.Build();
  //     playerT1r999 = await playerT1r999B.Build();

  //     playerT2r666 = await playerT2r666B.Build();
  //     playerT2r777 = await playerT2r777B.Build();
  //     playerT2r888 = await playerT2r888B.Build();
  //     playerT2r999 = await playerT2r999B.Build();

  //     teamA = await teamAB.Build();
  //     teamB = await teamBB.Build();
  //   });

  //   describe('Rule [TeamBaseIndexRule]', () => {
  //     describe('valid', () => {
  //       it('First team is allowed to have higher team index then base', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: teamA?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: playerT1r777.id,
  //             single3: playerT1r888.id,
  //             single4: playerT1r999.id,
  //           },
  //           [new TeamBaseIndexRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message === 'all.v1.teamFormation.errors.team-index'
  //         );
  //         expect(error).toBeUndefined();
  //       });

  //       it('Second team not', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: teamA?.id,
  //             encounterId: encounter.id,
  //             single1: playerT1r666.id,
  //             single2: playerT1r777.id,
  //             single3: playerT1r888.id,
  //             single4: playerT1r999.id,
  //           },
  //           [new TeamBaseIndexRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it.skip('Second team not', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: teamB?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: playerT1r777.id,
  //             single3: playerT1r888.id,
  //             single4: playerT1r999.id,
  //           },
  //           [new TeamBaseIndexRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message === 'all.v1.teamFormation.errors.team-index'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['baseTeamIndex']).toBe(58);
  //         expect(error?.params?.['baseIndex']).toBe(60);
  //       });
  //     });
  //   });

  //   describe('Rule [TeamBaseIndexRule]', () => {
  //     describe('invalid', () => {
  //       it('Second team not', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: teamA?.id,
  //             encounterId: encounter.id,
  //             single1: playerT2r666.id,
  //             single2: playerT1r777.id,
  //             single3: playerT1r888.id,
  //             single4: playerT1r999.id,
  //           },
  //           [new TeamClubBaseRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.club-base-other-team'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player']?.['id']).toBe(playerT2r666.id);
  //       });
  //     });
  //   });

  //   describe('Rule [PlayerMinLevel]', () => {
  //     describe('valid', () => {
  //       it('should be valid', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: teamA?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: playerT1r777.id,
  //             single3: playerT1r888.id,
  //             single4: playerT1r999.id,
  //           },
  //           [new PlayerMinLevelRule()]
  //         );

  //         expect(validation).toBeDefined();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-min-level'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it("should be invalid if the player doesn't have competition status on true ", async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: teamB?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: playerT2r777.id,
  //             single3: playerT2r888.id,
  //             single4: playerT2r999.id,
  //           },
  //           [new PlayerMinLevelRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-min-level'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player']?.['id']).toBe(player555.id);
  //       });
  //     });
  //   });
  // });

  // describe('Doubles Female team checks', () => {
  //   let player666: Player;
  //   let player555: Player;
  //   let player777: Player;
  //   let player888: Player;
  //   let player999: Player;

  //   let player111: Player;

  //   let team: Team;

  //   beforeEach(async () => {
  //     player111 = await PlayerBuilder.Create()
  //       .WithName('player 1 - 1 - 1', 'team 1')
  //       .WithCompetitionStatus(false)
  //       .WithRanking(1, 1, 1, new Date('2020-05-09'), system.id)
  //       .Build();

  //     const player555B = PlayerBuilder.Create()
  //       .WithName('player 5 - 5 - 5', 'team 1')
  //       .WithCompetitionStatus(false)
  //       .WithGender('M')
  //       .WithRanking(5, 5, 5, new Date('2020-05-09'), system.id);

  //     const player666B = PlayerBuilder.Create()
  //       .WithName('player 6 - 6 - 6', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('F')
  //       .WithRanking(6, 6, 6, new Date('2020-05-09'), system.id);

  //     const player777B = PlayerBuilder.Create()
  //       .WithName('player 7 - 7 - 7', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('F')
  //       .WithRanking(7, 7, 7, new Date('2020-05-09'), system.id);

  //     const player888B = PlayerBuilder.Create()
  //       .WithName('player 8 - 8 - 8', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('F')
  //       .WithRanking(8, 8, 8, new Date('2020-05-09'), system.id);

  //     const player999B = PlayerBuilder.Create()
  //       .WithName('player 9 - 9 - 9', 'team 1')
  //       .WithCompetitionStatus(true)
  //       .WithGender('F')
  //       .WithRanking(9, 9, 9, new Date('2020-05-09'), system.id);

  //     const teamB = TeamBuilder.Create(SubEventTypeEnum.F).WithName('team 1');

  //     await ClubBuilder.Create()
  //       .WithName('club 1')
  //       .WithTeam(
  //         teamB
  //           .WithTeamNumber(2)
  //           .WithPlayer(player777B)
  //           .WithPlayer(player888B)
  //           .WithPlayer(player999B)
  //           .WithPlayer(player666B)
  //           .WithEntry(
  //             EventCompetitionEntryBuilder.Create('competition')
  //               .ForDraw(draw)
  //               .ForSubEvent(subEvent)
  //               .WithBasePlayer(player666B, 6, 6, 6)
  //               .WithBasePlayer(player777B, 7, 7, 7)
  //               .WithBasePlayer(player888B, 8, 8, 8)
  //               .WithBasePlayer(player999B, 9, 9, 9)
  //               .WithBaseIndex(60)
  //           )
  //       )
  //       .Build();

  //     player555 = await player555B.Build();
  //     player666 = await player666B.Build();
  //     player777 = await player777B.Build();
  //     player888 = await player888B.Build();
  //     player999 = await player999B.Build();

  //     team = await teamB.Build();
  //   });

  //   it('should be a valid assembly', async () => {
  //     const validation = await service.fetchAndValidate(
  //       {
  //         systemId: system.id,
  //         teamId: team?.id,
  //         encounterId: encounter.id,
  //         single1: player666.id,
  //         single2: player777.id,
  //         single3: player888.id,
  //         single4: player999.id,
  //         double1: [player666.id, player777.id],
  //         double2: [player666.id, player888.id],
  //         double3: [player777.id, player999.id],
  //         double4: [player888.id, player999.id],
  //       },
  //       AssemblyService.defaultValidators()
  //     );

  //     expect(validation).toBeDefined();
  //     expect(validation.valid).toBeTruthy();
  //   });

  //   describe('Rule [PlayerOrderRule]', () => {
  //     describe('valid', () => {
  //       const valid = [
  //         [1, 2],
  //         [2, 3],
  //         [3, 4],
  //       ];

  //       test.each(valid)(
  //         'Single %p is better then Single %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`single${p2}`]: player888.id,
  //               [`single${p1}`]: player777.id,
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();

  //           const error = validation.errors?.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-single'
  //           );
  //           expect(error).toBeUndefined();
  //         }
  //       );

  //       test.each(valid)(
  //         'Double %p is  better then Double %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${p2}`]: [player777.id, player888.id],
  //               [`double${p1}`]: [player666.id, player888.id],
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();

  //           const error = validation.errors?.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-doubles'
  //           );
  //           expect(error).toBeUndefined();
  //         }
  //       );

  //       test.each(valid)(
  //         'Double %p is not better then Double %p by level',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${p2}`]: [player777.id, player888.id],
  //               [`double${p1}`]: [player666.id, player999.id],
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();

  //           const error = validation.errors?.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-highest'
  //           );
  //           expect(error).toBeUndefined();
  //         }
  //       );
  //     });

  //     describe('invalid', () => {
  //       const invalid = [
  //         [1, 2],
  //         [2, 3],
  //         [3, 4],
  //       ];

  //       test.each(invalid)(
  //         'Single %p is not better then Single %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`single${p1}`]: player888.id,
  //               [`single${p2}`]: player777.id,
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-single'
  //           );
  //           expect(error).toBeDefined();
  //           expect(error?.params?.['game1']).toBe(`single${p1}`);
  //           expect(error?.params?.['game2']).toBe(`single${p2}`);
  //           expect(error?.params?.['player1']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['player1']?.['ranking']).toBe(8);

  //           expect(error?.params?.['player2']?.['id']).toBe(player777.id);
  //           expect(error?.params?.['player2']?.['ranking']).toBe(7);
  //         }
  //       );

  //       test.each(invalid)(
  //         'Double %p is better then Double %p',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${p1}`]: [player777.id, player888.id],
  //               [`double${p2}`]: [player666.id, player888.id],
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-doubles'
  //           );
  //           expect(error).toBeDefined();
  //           expect(error?.params?.['game1']).toBe(`double${p1}`);
  //           expect(error?.params?.['game2']).toBe(`double${p2}`);
  //           // Team 1
  //           expect(error?.params?.['team1player1']?.['id']).toBe(player777.id);
  //           expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
  //           expect(error?.params?.['team1player2']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

  //           // Team 2
  //           expect(error?.params?.['team2player1']?.['id']).toBe(player666.id);
  //           expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
  //           expect(error?.params?.['team2player2']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['team2player2']?.['ranking']).toBe(8);
  //         }
  //       );

  //       test.each(invalid)(
  //         'Double %p is not better then Double %p by level',
  //         async (p1, p2) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${p1}`]: [player777.id, player888.id],
  //               [`double${p2}`]: [player666.id, player999.id],
  //             },
  //             [new PlayerOrderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-order-highest'
  //           );
  //           expect(error).toBeDefined();
  //           expect(error?.params?.['game1']).toBe(`double${p1}`);
  //           expect(error?.params?.['game2']).toBe(`double${p2}`);
  //           // Team 1
  //           expect(error?.params?.['team1player1']?.['id']).toBe(player777.id);
  //           expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
  //           expect(error?.params?.['team1player2']?.['id']).toBe(player888.id);
  //           expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

  //           // Team 2
  //           expect(error?.params?.['team2player1']?.['id']).toBe(player666.id);
  //           expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
  //           expect(error?.params?.['team2player2']?.['id']).toBe(player999.id);
  //           expect(error?.params?.['team2player2']?.['ranking']).toBe(9);
  //         }
  //       );
  //     });
  //   });

  //   describe('Rule [TeamSubeventIndexRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new TeamSubeventIndexRule()]
  //         );

  //         expect(validation).toBeDefined();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.team-to-strong'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it('should be invalid if team index lower then the base', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player111.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new TeamSubeventIndexRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.team-to-strong'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['teamIndex']).toBe(50);
  //         expect(error?.params?.['minIndex']).toBe(53);
  //         expect(error?.params?.['maxIndex']).toBe(70);
  //       });
  //     });
  //   });

  //   describe('Rule [CompetitionStatusRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new CompetitionStatusRule()]
  //         );

  //         expect(validation).toBeDefined();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message === 'all.v1.teamFormation.errors.comp-status-html'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it("should be invalid if the player doesn't have competition status on true ", async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new CompetitionStatusRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message === 'all.v1.teamFormation.errors.comp-status-html'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['id']).toBe(player555.id);
  //       });

  //       it("should be invalid if the players doesn't have competition status on true ", async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player111.id,
  //             single2: player555.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new CompetitionStatusRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const errors = validation.errors.filter(
  //           (e) =>
  //             e.message === 'all.v1.teamFormation.errors.comp-status-html'
  //         );

  //         expect(errors).toBeDefined();
  //         expect(errors.length).toBe(2);
  //       });
  //     });
  //   });

  //   describe('Rule [PlayerMaxGamesRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid single', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-single-games'
  //         );
  //         expect(error).toBeUndefined();
  //       });

  //       it('should be valid double', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double1: [player666.id, player777.id],
  //             double2: [player666.id, player888.id],
  //             double3: [player777.id, player999.id],
  //             double4: [player888.id, player999.id],
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-double-games'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       it('should be invalid if the player has more then 1 single game ', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             single1: player555.id,
  //             single2: player555.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-single-games'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player']?.['id']).toBe(player555.id);
  //       });

  //       it('should be invalid if the player has more then 2 doubles', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double1: [player666.id, player777.id],
  //             double2: [player666.id, player888.id],
  //             double3: [player666.id, player999.id],
  //             double4: [player888.id, player999.id],
  //           },
  //           [new PlayerMaxGamesRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeFalsy();

  //         const error = validation.errors.find(
  //           (e) =>
  //             e.message ===
  //             'all.v1.teamFormation.errors.player-max-double-games'
  //         );

  //         expect(error).toBeDefined();
  //         expect(error?.params?.['player']?.['id']).toBe(player666.id);
  //       });
  //     });
  //   });

  //   describe('Rule [PlayerGenderRule]', () => {
  //     describe('valid', () => {
  //       it('should be valid single', async () => {
  //         const validation = await service.fetchAndValidate(
  //           {
  //             systemId: system.id,
  //             teamId: team?.id,
  //             encounterId: encounter.id,
  //             double1: [player666.id, player777.id],
  //             double2: [player666.id, player888.id],
  //             double3: [player777.id, player999.id],
  //             double4: [player888.id, player999.id],
  //             single1: player666.id,
  //             single2: player777.id,
  //             single3: player888.id,
  //             single4: player999.id,
  //           },
  //           [new PlayerGenderRule()]
  //         );

  //         expect(validation).toBeDefined();
  //         expect(validation.valid).toBeTruthy();

  //         const error = validation.errors?.find(
  //           (e) =>
  //             e.message ===
  //               'all.v1.teamFormation.errors.player-genders' ||
  //             e.message === 'all.v1.teamFormation.errors.player-gender'
  //         );
  //         expect(error).toBeUndefined();
  //       });
  //     });

  //     describe('invalid', () => {
  //       // const games = [[1], [2], [3], [4]];
  //       const games = [[2]];

  //       test.each(games)(
  //         'should be invalid single if the player the wrong gender',
  //         async (g) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`single${g}`]: player555.id,
  //             },
  //             [new PlayerGenderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-gender'
  //           );

  //           expect(error).toBeDefined();
  //           expect(error?.params?.['player']?.['id']).toBe(player555.id);
  //         }
  //       );

  //       test.each(games)(
  //         'should be invalid double if the player the wrong gender',
  //         async (g) => {
  //           const validation = await service.fetchAndValidate(
  //             {
  //               systemId: system.id,
  //               teamId: team?.id,
  //               encounterId: encounter.id,
  //               [`double${g}`]: [player555.id, player666.id],
  //             },
  //             [new PlayerGenderRule()]
  //           );

  //           expect(validation).toBeDefined();
  //           expect(validation.valid).toBeFalsy();

  //           const error = validation.errors.find(
  //             (e) =>
  //               e.message ===
  //               'all.v1.teamFormation.errors.player-gender'
  //           );

  //           expect(error).toBeDefined();
  //           expect(error?.params?.['player']?.['id']).toBe(player555.id);
  //         }
  //       );
  //     });
  //   });
  // });
});
