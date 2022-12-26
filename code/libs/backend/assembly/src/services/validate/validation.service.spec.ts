import {
  DatabaseModule,
  SystemGroupBuilder,
  SystemBuilder,
  RankingSystems,
  RankingSystem,
  PlayerBuilder,
  TeamBuilder,
  EventCompetitionEntryBuilder,
  DrawCompetition,
  DrawCompetitionBuilder,
  EncounterCompetitionBuilder,
  SubEventCompetitionBuilder,
  EventCompetitionBuilder,
  SubEventCompetition,
  SubEventType,
  ClubBuilder,
  Player,
  Team,
  EncounterCompetition,
} from '@badman/backend-database';
import { Sequelize } from 'sequelize-typescript';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

import { AssemblyValidationService } from './validation.service';
import {
  TeamBaseIndexRule,
  CompetitionStatusRule,
  PlayerMinLevelRule,
  PlayerOrderRule,
  TeamSubeventIndexRule,
  PlayerMaxGamesRule,
  PlayerGenderRule,
  TeamClubBaseRule,
  SubTeamIndexRule,
} from './rules';

describe('ValidationService', () => {
  let service: AssemblyValidationService;
  let system: RankingSystem;
  let draw: DrawCompetition;
  let subEvent: SubEventCompetition;
  let encounter: EncounterCompetition;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [AssemblyValidationService],
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
    }).compile();

    service = module.get<AssemblyValidationService>(AssemblyValidationService);

    // Setup db
    const sequelize = module.get<Sequelize>(Sequelize);
    await sequelize.sync({ force: true });

    const group = SystemGroupBuilder.Create();
    system = await SystemBuilder.Create(RankingSystems.BVL, 12, 75, 50)
      .AsPrimary()
      .WithGroup(group)
      .Build();

    const drawBuilder = DrawCompetitionBuilder.Create().WithName('Test draw');

    const subEventBuilder = SubEventCompetitionBuilder.Create()
      .WithName('Test SubEvent')
      .WithIndex(53, 70)
      .WitnMaxLevel(6);
    const encounterBuilder = EncounterCompetitionBuilder.Create();

    await EventCompetitionBuilder.Create()
      .WithName('Test Event')
      .WithSubEvent(
        subEventBuilder.WithDraw(drawBuilder.WithEnouncter(encounterBuilder))
      )
      .Build();

    draw = await drawBuilder.Build();
    subEvent = await subEventBuilder.Build();
    encounter = await encounterBuilder.Build();
  }, 50000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Doubles Male team checks', () => {
    let player666: Player;
    let player555: Player;
    let player777: Player;
    let player888: Player;
    let player999: Player;

    let player111: Player;

    let team: Team;

    beforeEach(async () => {
      player111 = await PlayerBuilder.Create()
        .WithName('player 1 - 1 - 1', 'team 1')
        .WithCompetitionStatus(false)
        .WithRanking(1, 1, 1, new Date(), system.id)
        .Build();

      const player555B = PlayerBuilder.Create()
        .WithName('player 5 - 5 - 5', 'team 1')
        .WithCompetitionStatus(false)
        .WithGender('F')
        .WithRanking(5, 5, 5, new Date(), system.id);

      const player666B = PlayerBuilder.Create()
        .WithName('player 6 - 6 - 6', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('M')
        .WithRanking(6, 6, 6, new Date(), system.id);

      const player777B = PlayerBuilder.Create()
        .WithName('player 7 - 7 - 7', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('M')
        .WithRanking(7, 7, 7, new Date(), system.id);

      const player888B = PlayerBuilder.Create()
        .WithName('player 8 - 8 - 8', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('M')
        .WithRanking(8, 8, 8, new Date(), system.id);

      const player999B = PlayerBuilder.Create()
        .WithName('player 9 - 9 - 9', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('M')
        .WithRanking(9, 9, 9, new Date(), system.id);

      const teamB = TeamBuilder.Create(SubEventType.M).WithName('team 1');

      await ClubBuilder.Create()
        .WithName('club 1')
        .WithTeam(
          teamB
            .WithTeamNumber(2)
            .WithPlayer(player777B)
            .WithPlayer(player888B)
            .WithPlayer(player999B)
            .WithPlayer(player666B)
            .WithEntry(
              EventCompetitionEntryBuilder.Create('competition')
                .ForDraw(draw)
                .ForSubEvent(subEvent)
                .WithBasePlayer(player666B, 6, 6, 6)
                .WithBasePlayer(player777B, 7, 7, 7)
                .WithBasePlayer(player888B, 8, 8, 8)
                .WithBasePlayer(player999B, 9, 9, 9)
                .WithBaseIndex(60)
            )
        )
        .Build();

      player555 = await player555B.Build();
      player666 = await player666B.Build();
      player777 = await player777B.Build();
      player888 = await player888B.Build();
      player999 = await player999B.Build();

      team = await teamB.Build();
    });

    it('should be a valid assembly', async () => {
      const validation = await service.fetchAndValidate(
        {
          systemId: system.id,
          teamId: team?.id,
          encounterId: encounter.id,
          single1: player666.id,
          single2: player777.id,
          single3: player888.id,
          single4: player999.id,
          double1: [player666.id, player777.id],
          double2: [player666.id, player888.id],
          double3: [player777.id, player999.id],
          double4: [player888.id, player999.id],
        },
        AssemblyValidationService.defaultValidators()
      );

      expect(validation).toBeDefined();
      expect(validation.valid).toBeTruthy();
    });

    describe('Rule [PlayerOrderRule]', () => {
      describe('valid', () => {
        const valid = [
          [1, 2],
          [2, 3],
          [3, 4],
        ];

        test.each(valid)(
          'Single %p is better then Single %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`single${p2}`]: player888.id,
                [`single${p1}`]: player777.id,
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();

            const error = validation.errors?.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeUndefined();
          }
        );

        test.each(valid)(
          'Double %p is  better then Double %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${p2}`]: [player777.id, player888.id],
                [`double${p1}`]: [player666.id, player888.id],
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();

            const error = validation.errors?.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeUndefined();
          }
        );

        test.each(valid)(
          'Double %p is not better then Double %p by level',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${p2}`]: [player777.id, player888.id],
                [`double${p1}`]: [player666.id, player999.id],
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();

            const error = validation.errors?.find(
              (e) => e.message === 'team-assembly.error.player-order-highest'
            );
            expect(error).toBeUndefined();
          }
        );
      });

      describe('invalid', () => {
        const invalid = [
          [1, 2],
          [2, 3],
          [3, 4],
        ];

        test.each(invalid)(
          'Single %p is not better then Single %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`single${p1}`]: player888.id,
                [`single${p2}`]: player777.id,
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeDefined();
            expect(error?.params?.['game']).toBe(`single${p1}`);
            expect(error?.params?.['player1']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['player1']?.['ranking']).toBe(8);

            expect(error?.params?.['player2']?.['fullName']).toBe(
              player777.fullName
            );
            expect(error?.params?.['player2']?.['ranking']).toBe(7);
          }
        );

        test.each(invalid)(
          'Double %p is better then Double %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${p1}`]: [player777.id, player888.id],
                [`double${p2}`]: [player666.id, player888.id],
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeDefined();
            expect(error?.params?.['game']).toBe(`double${p1}`);
            // Team 1
            expect(error?.params?.['team1player1']?.['fullName']).toBe(
              player777.fullName
            );
            expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
            expect(error?.params?.['team1player2']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

            // Team 2
            expect(error?.params?.['team2player1']?.['fullName']).toBe(
              player666.fullName
            );
            expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
            expect(error?.params?.['team2player2']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['team2player2']?.['ranking']).toBe(8);
          }
        );

        test.each(invalid)(
          'Double %p is not better then Double %p by level',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${p1}`]: [player777.id, player888.id],
                [`double${p2}`]: [player666.id, player999.id],
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly.error.player-order-highest'
            );
            expect(error).toBeDefined();
            expect(error?.params?.['game']).toBe(`double${p1}`);
            // Team 1
            expect(error?.params?.['team1player1']?.['fullName']).toBe(
              player777.fullName
            );
            expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
            expect(error?.params?.['team1player2']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

            // Team 2
            expect(error?.params?.['team2player1']?.['fullName']).toBe(
              player666.fullName
            );
            expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
            expect(error?.params?.['team2player2']?.['fullName']).toBe(
              player999.fullName
            );
            expect(error?.params?.['team2player2']?.['ranking']).toBe(9);
          }
        );
      });
    });

    describe('Rule [TeamSubeventIndexRule]', () => {
      describe('valid', () => {
        it('should be valid', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new TeamSubeventIndexRule()]
          );

          expect(validation).toBeDefined();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.team-to-strong'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it('should be invalid if team index lower then the base', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player111.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new TeamSubeventIndexRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.team-to-strong'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['baseTeamIndex']).toBe(50);
          expect(error?.params?.['minIndex']).toBe(53);
          expect(error?.params?.['maxIndex']).toBe(70);
        });
      });
    });

    describe('Rule [SubTeamIndexRule]', () => {
      describe('warning', () => {
        it.skip('should give warning if the sub is better than one of the players', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
              subtitudes: [player888.id],
            },
            [new SubTeamIndexRule()]
          );

          expect(validation).toBeDefined();

          const warning = validation.warnings?.find(
            (e) => e.message === 'team-assembly.warning.subtitute-team-index'
          );

          expect(warning).toBeDefined();
          expect(warning?.params?.['sub']).toBe(player888.fullName);
          expect(warning?.params?.['players']?.find((p) => p.id === player999.id)).toBeDefined();
        });
      });
    });



    describe('Rule [CompetitionStatusRule]', () => {
      describe('valid', () => {
        it('should be valid', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new CompetitionStatusRule()]
          );

          expect(validation).toBeDefined();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.competition-status'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it("should be invalid if the player doesn't have competition status on true ", async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new CompetitionStatusRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.competition-status'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player555.fullName);
        });

        it("should be invalid if the players doesn't have competition status on true ", async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player111.id,
              single2: player555.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new CompetitionStatusRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const errors = validation.errors.filter(
            (e) => e.message === 'team-assembly.error.competition-status'
          );

          expect(errors).toBeDefined();
          expect(errors.length).toBe(2);
        });
      });
    });

    describe('Rule [PlayerMaxGamesRule]', () => {
      describe('valid', () => {
        it('should be valid single', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.player-max-single-games'
          );
          expect(error).toBeUndefined();
        });

        it('should be valid double', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double1: [player666.id, player777.id],
              double2: [player666.id, player888.id],
              double3: [player777.id, player999.id],
              double4: [player888.id, player999.id],
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.player-max-double-games'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it('should be invalid if the player has more then 1 single game ', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: player555.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-max-single-games'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player555.fullName);
        });

        it('should be invalid if the player has more then 2 doubles', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double1: [player666.id, player777.id],
              double2: [player666.id, player888.id],
              double3: [player666.id, player999.id],
              double4: [player888.id, player999.id],
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-max-double-games'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player666.fullName);
        });
      });
    });

    describe('Rule [PlayerGenderRule]', () => {
      describe('valid', () => {
        it('should be valid single', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double1: [player666.id, player777.id],
              double2: [player666.id, player888.id],
              double3: [player777.id, player999.id],
              double4: [player888.id, player999.id],
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new PlayerGenderRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) =>
              e.message === 'team-assembly.error.player-genders' ||
              e.message === 'team-assembly.error.player-gender'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        // const games = [[1], [2], [3], [4]];
        const games = [[2]];

        test.each(games)(
          'should be invalid single if the player the wrong gender',
          async (g) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`single${g}`]: player555.id,
              },
              [new PlayerGenderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly-error.player-gender'
            );

            expect(error).toBeDefined();
            expect(error?.params?.['fullName']).toBe(player555.fullName);
          }
        );

        test.each(games)(
          'should be invalid double if the player the wrong gender',
          async (g) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${g}`]: [player555.id, player666.id],
              },
              [new PlayerGenderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly-error.player-gender'
            );

            expect(error).toBeDefined();
            expect(error?.params?.['fullName']).toBe(player555.fullName);
          }
        );
      });
    });
  });

  describe('Mixed team checks', () => {
    let player555: Player;

    let player666: Player;
    let player777: Player;
    let player888: Player;
    let player999: Player;

    let team: Team;

    beforeEach(async () => {
      const player555B = PlayerBuilder.Create()
        .WithName('player 5 - 5 - 5', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('M')
        .WithRanking(5, 5, 5, new Date(), system.id);

      const player666B = PlayerBuilder.Create()
        .WithName('player 6 - 6 - 6', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('M')
        .WithRanking(6, 6, 6, new Date(), system.id);

      const player777B = PlayerBuilder.Create()
        .WithName('player 7 - 7 - 7', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('M')
        .WithRanking(7, 7, 7, new Date(), system.id);

      const player888B = PlayerBuilder.Create()
        .WithName('player 8 - 8 - 8', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('F')
        .WithRanking(8, 8, 8, new Date(), system.id);

      const player999B = PlayerBuilder.Create()
        .WithName('player 9 - 9 - 9', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('F')
        .WithRanking(9, 9, 9, new Date(), system.id);

      const teamB = TeamBuilder.Create(SubEventType.MX).WithName('team 1');

      await ClubBuilder.Create()
        .WithName('club 1')
        .WithTeam(
          teamB
            .WithTeamNumber(2)
            .WithPlayer(player777B)
            .WithPlayer(player888B)
            .WithPlayer(player999B)
            .WithPlayer(player666B)
            .WithEntry(
              EventCompetitionEntryBuilder.Create('competition')
                .ForDraw(draw)
                .ForSubEvent(subEvent)
                .WithBasePlayer(player666B, 6, 6, 6)
                .WithBasePlayer(player777B, 7, 7, 7)
                .WithBasePlayer(player888B, 8, 8, 8)
                .WithBasePlayer(player999B, 9, 9, 9)
                .WithBaseIndex(60)
            )
        )
        .Build();

      player555 = await player555B.Build();
      player666 = await player666B.Build();
      player777 = await player777B.Build();
      player888 = await player888B.Build();
      player999 = await player999B.Build();

      team = await teamB.Build();
    });
    describe('Rule [PlayerOrderRule]', () => {
      describe('valid', () => {
        it('Double 3 is better then Double 4', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double3: [player666.id, player999.id],
              double4: [player777.id, player888.id],
            },
            [new PlayerOrderRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.player-order-highest'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        const invalid = [
          [1, 2],
          [3, 4],
        ];

        test.each(invalid)(
          'Single %p is not better then Single %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`single${p1}`]: player888.id,
                [`single${p2}`]: player777.id,
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeDefined();
            expect(error?.params?.['game']).toBe(`single${p1}`);
            expect(error?.params?.['player1']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['player1']?.['ranking']).toBe(8);

            expect(error?.params?.['player2']?.['fullName']).toBe(
              player777.fullName
            );
            expect(error?.params?.['player2']?.['ranking']).toBe(7);
          }
        );

        it('Mixed double is better then other', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double3: [player777.id, player888.id],
              double4: [player666.id, player888.id],
            },
            [new PlayerOrderRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-order'
          );
          expect(error).toBeDefined();
          expect(error?.params?.['game']).toBe(`double3`);
          // Team 1
          expect(error?.params?.['team1player1']?.['fullName']).toBe(
            player777.fullName
          );
          expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
          expect(error?.params?.['team1player2']?.['fullName']).toBe(
            player888.fullName
          );
          expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

          // Team 2
          expect(error?.params?.['team2player1']?.['fullName']).toBe(
            player666.fullName
          );
          expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
          expect(error?.params?.['team2player2']?.['fullName']).toBe(
            player888.fullName
          );
          expect(error?.params?.['team2player2']?.['ranking']).toBe(8);
        });

        it('Mixed double is better then other by level', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double3: [player777.id, player888.id],
              double4: [player666.id, player999.id],
            },
            [new PlayerOrderRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-order-highest'
          );
          expect(error).toBeDefined();
          expect(error?.params?.['game']).toBe(`double3`);
          // Team 1
          expect(error?.params?.['team1player1']?.['fullName']).toBe(
            player777.fullName
          );
          expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
          expect(error?.params?.['team1player2']?.['fullName']).toBe(
            player888.fullName
          );
          expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

          // Team 2
          expect(error?.params?.['team2player1']?.['fullName']).toBe(
            player666.fullName
          );
          expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
          expect(error?.params?.['team2player2']?.['fullName']).toBe(
            player999.fullName
          );
          expect(error?.params?.['team2player2']?.['ranking']).toBe(9);
        });
      });
    });

    describe('Rule [PlayerMaxGamesRule]', () => {
      describe('valid', () => {
        it('should be valid doubles', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double1: [player666.id, player888.id],
              double2: [player777.id, player999.id],
              double3: [player666.id, player777.id],
              double4: [player888.id, player999.id],
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.player-max-double-games'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it('should be invalid if the player has more then 1 mixed', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double3: [player666.id, player999.id],
              double4: [player888.id, player999.id],
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-max-mix-games'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player999.fullName);
        });
      });
    });

    describe('Rule [PlayerGenderRule]', () => {
      describe('valid', () => {
        it('should be valid doubles', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double1: [player666.id, player777.id],
              double2: [player888.id, player999.id],
              double3: [player666.id, player888.id],
              double4: [player777.id, player999.id],
            },
            [new PlayerGenderRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) =>
              e.message === 'team-assembly.error.player-genders' ||
              e.message === 'team-assembly-error.player-gender'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it('should be invalid if a mixed 3 has 2 of the same gender', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double3: [player666.id, player777.id],
              double4: [player888.id, player777.id],
            },
            [new PlayerGenderRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-genders'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['gender']).toBe(player777.gender);
          expect(error?.params?.['game']).toBe('double3');
        });

        it('should be invalid if a mixed 4 has 2 of the same gender', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double3: [player666.id, player999.id],
              double4: [player888.id, player999.id],
            },
            [new PlayerGenderRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-genders'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['gender']).toBe(player999.gender);
          expect(error?.params?.['game']).toBe('double4');
        });
      });
    });

    describe('Rule [PlayerMinLevel]', () => {
      describe('valid', () => {
        it('should be valid', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new PlayerMinLevelRule()]
          );

          expect(validation).toBeDefined();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.player-min-level'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it("should be invalid if the player doesn't have competition status on true ", async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new PlayerMinLevelRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-min-level'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player555.fullName);
        });
      });
    });
  });

  describe('Multiple teams in club', () => {
    let player555: Player;

    let playerT1r666: Player;
    let playerT1r777: Player;
    let playerT1r888: Player;
    let playerT1r999: Player;

    let playerT2r666: Player;
    let playerT2r777: Player;
    let playerT2r888: Player;
    let playerT2r999: Player;

    let teamA: Team;
    let teamB: Team;

    beforeEach(async () => {
      const player555B = PlayerBuilder.Create()
        .WithName('player 5 - 5 - 5', 'team 1')
        .WithCompetitionStatus(false)
        .WithRanking(5, 5, 5, new Date(), system.id);

      const playerT1r666B = PlayerBuilder.Create()
        .WithName('player 6 - 6 - 6', 'team A')
        .WithCompetitionStatus(true)
        .WithRanking(6, 6, 6, new Date(), system.id);

      const playerT1r777B = PlayerBuilder.Create()
        .WithName('player 7 - 7 - 7', 'team A')
        .WithCompetitionStatus(true)
        .WithRanking(7, 7, 7, new Date(), system.id);

      const playerT1r888B = PlayerBuilder.Create()
        .WithName('player 8 - 8 - 8', 'team A')
        .WithCompetitionStatus(true)
        .WithRanking(8, 8, 8, new Date(), system.id);

      const playerT1r999B = PlayerBuilder.Create()
        .WithName('player 9 - 9 - 9', 'team A')
        .WithCompetitionStatus(true)
        .WithRanking(9, 9, 9, new Date(), system.id);

      const playerT2r666B = PlayerBuilder.Create()
        .WithName('player 6 - 6 - 6', 'team B')
        .WithCompetitionStatus(true)
        .WithRanking(6, 6, 6, new Date(), system.id);

      const playerT2r777B = PlayerBuilder.Create()
        .WithName('player 7 - 7 - 7', 'team B')
        .WithCompetitionStatus(true)
        .WithRanking(7, 7, 7, new Date(), system.id);

      const playerT2r888B = PlayerBuilder.Create()
        .WithName('player 8 - 8 - 8', 'team B')
        .WithCompetitionStatus(true)
        .WithRanking(8, 8, 8, new Date(), system.id);

      const playerT2r999B = PlayerBuilder.Create()
        .WithName('player 9 - 9 - 9', 'team B')
        .WithCompetitionStatus(true)
        .WithRanking(9, 9, 9, new Date(), system.id);

      const teamAB = TeamBuilder.Create(SubEventType.M)
        .WithTeamNumber(1)
        .WithName('team 1');
      const teamBB = TeamBuilder.Create(SubEventType.M)
        .WithTeamNumber(2)
        .WithName('team 2');

      await ClubBuilder.Create()
        .WithName('club 1')
        .WithTeam(
          teamAB
            .WithPlayer(playerT1r777B)
            .WithPlayer(playerT1r888B)
            .WithPlayer(playerT1r999B)
            .WithPlayer(playerT1r666B)
            .WithEntry(
              EventCompetitionEntryBuilder.Create(
                'competition',
                '287a088e-14b1-47c5-9086-e728c6615664'
              )
                .ForDraw(draw)
                .ForSubEvent(subEvent)
                .WithBasePlayer(playerT1r666B, 6, 6, 6)
                .WithBasePlayer(playerT1r777B, 7, 7, 7)
                .WithBasePlayer(playerT1r888B, 8, 8, 8)
                .WithBasePlayer(playerT1r999B, 9, 9, 9)
                .WithBaseIndex(60)
            )
        )

        .WithTeam(
          teamBB
            .WithPlayer(playerT2r777B)
            .WithPlayer(playerT2r888B)
            .WithPlayer(playerT2r999B)
            .WithPlayer(playerT2r666B)
            .WithEntry(
              EventCompetitionEntryBuilder.Create(
                'competition',
                '246f21b8-8eab-4597-b9c5-4ef712991cc3'
              )
                .ForDraw(draw)
                .ForSubEvent(subEvent)
                .WithBasePlayer(playerT2r666B, 6, 6, 6)
                .WithBasePlayer(playerT2r777B, 7, 7, 7)
                .WithBasePlayer(playerT2r888B, 8, 8, 8)
                .WithBasePlayer(playerT2r999B, 9, 9, 9)
                .WithBaseIndex(60)
            )
        )
        .Build();

      player555 = await player555B.Build();

      playerT1r666 = await playerT1r666B.Build();
      playerT1r777 = await playerT1r777B.Build();
      playerT1r888 = await playerT1r888B.Build();
      playerT1r999 = await playerT1r999B.Build();

      playerT2r666 = await playerT2r666B.Build();
      playerT2r777 = await playerT2r777B.Build();
      playerT2r888 = await playerT2r888B.Build();
      playerT2r999 = await playerT2r999B.Build();

      teamA = await teamAB.Build();
      teamB = await teamBB.Build();
    });

    describe('Rule [TeamBaseIndexRule]', () => {
      describe('valid', () => {
        it('First team is allowed to have higher team index then base', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: teamA?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: playerT1r777.id,
              single3: playerT1r888.id,
              single4: playerT1r999.id,
            },
            [new TeamBaseIndexRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.team-index'
          );
          expect(error).toBeUndefined();
        });

        it('Second team not', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: teamA?.id,
              encounterId: encounter.id,
              single1: playerT1r666.id,
              single2: playerT1r777.id,
              single3: playerT1r888.id,
              single4: playerT1r999.id,
            },
            [new TeamBaseIndexRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();
        });
      });

      describe('invalid', () => {
        it.skip('Second team not', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: teamB?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: playerT1r777.id,
              single3: playerT1r888.id,
              single4: playerT1r999.id,
            },
            [new TeamBaseIndexRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.team-index'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['baseTeamIndex']).toBe(58);
          expect(error?.params?.['baseIndex']).toBe(60);
        });
      });
    });

    describe('Rule [TeamBaseIndexRule]', () => {
      describe('invalid', () => {
        it('Second team not', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: teamA?.id,
              encounterId: encounter.id,
              single1: playerT2r666.id,
              single2: playerT1r777.id,
              single3: playerT1r888.id,
              single4: playerT1r999.id,
            },
            [new TeamClubBaseRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.club-base-other-team'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['player']).toBe(playerT2r666.fullName);
        });
      });
    });

    describe('Rule [PlayerMinLevel]', () => {
      describe('valid', () => {
        it('should be valid', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: teamA?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: playerT1r777.id,
              single3: playerT1r888.id,
              single4: playerT1r999.id,
            },
            [new PlayerMinLevelRule()]
          );

          expect(validation).toBeDefined();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.player-min-level'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it("should be invalid if the player doesn't have competition status on true ", async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: teamB?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: playerT2r777.id,
              single3: playerT2r888.id,
              single4: playerT2r999.id,
            },
            [new PlayerMinLevelRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-min-level'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player555.fullName);
        });
      });
    });
  });

  describe('Doubles Female team checks', () => {
    let player666: Player;
    let player555: Player;
    let player777: Player;
    let player888: Player;
    let player999: Player;

    let player111: Player;

    let team: Team;

    beforeEach(async () => {
      player111 = await PlayerBuilder.Create()
        .WithName('player 1 - 1 - 1', 'team 1')
        .WithCompetitionStatus(false)
        .WithRanking(1, 1, 1, new Date(), system.id)
        .Build();

      const player555B = PlayerBuilder.Create()
        .WithName('player 5 - 5 - 5', 'team 1')
        .WithCompetitionStatus(false)
        .WithGender('M')
        .WithRanking(5, 5, 5, new Date(), system.id);

      const player666B = PlayerBuilder.Create()
        .WithName('player 6 - 6 - 6', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('F')
        .WithRanking(6, 6, 6, new Date(), system.id);

      const player777B = PlayerBuilder.Create()
        .WithName('player 7 - 7 - 7', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('F')
        .WithRanking(7, 7, 7, new Date(), system.id);

      const player888B = PlayerBuilder.Create()
        .WithName('player 8 - 8 - 8', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('F')
        .WithRanking(8, 8, 8, new Date(), system.id);

      const player999B = PlayerBuilder.Create()
        .WithName('player 9 - 9 - 9', 'team 1')
        .WithCompetitionStatus(true)
        .WithGender('F')
        .WithRanking(9, 9, 9, new Date(), system.id);

      const teamB = TeamBuilder.Create(SubEventType.F).WithName('team 1');

      await ClubBuilder.Create()
        .WithName('club 1')
        .WithTeam(
          teamB
            .WithTeamNumber(2)
            .WithPlayer(player777B)
            .WithPlayer(player888B)
            .WithPlayer(player999B)
            .WithPlayer(player666B)
            .WithEntry(
              EventCompetitionEntryBuilder.Create('competition')
                .ForDraw(draw)
                .ForSubEvent(subEvent)
                .WithBasePlayer(player666B, 6, 6, 6)
                .WithBasePlayer(player777B, 7, 7, 7)
                .WithBasePlayer(player888B, 8, 8, 8)
                .WithBasePlayer(player999B, 9, 9, 9)
                .WithBaseIndex(60)
            )
        )
        .Build();

      player555 = await player555B.Build();
      player666 = await player666B.Build();
      player777 = await player777B.Build();
      player888 = await player888B.Build();
      player999 = await player999B.Build();

      team = await teamB.Build();
    });

    it('should be a valid assembly', async () => {
      const validation = await service.fetchAndValidate(
        {
          systemId: system.id,
          teamId: team?.id,
          encounterId: encounter.id,
          single1: player666.id,
          single2: player777.id,
          single3: player888.id,
          single4: player999.id,
          double1: [player666.id, player777.id],
          double2: [player666.id, player888.id],
          double3: [player777.id, player999.id],
          double4: [player888.id, player999.id],
        },
        AssemblyValidationService.defaultValidators()
      );

      expect(validation).toBeDefined();
      expect(validation.valid).toBeTruthy();
    });

    describe('Rule [PlayerOrderRule]', () => {
      describe('valid', () => {
        const valid = [
          [1, 2],
          [2, 3],
          [3, 4],
        ];

        test.each(valid)(
          'Single %p is better then Single %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`single${p2}`]: player888.id,
                [`single${p1}`]: player777.id,
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();

            const error = validation.errors?.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeUndefined();
          }
        );

        test.each(valid)(
          'Double %p is  better then Double %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${p2}`]: [player777.id, player888.id],
                [`double${p1}`]: [player666.id, player888.id],
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();

            const error = validation.errors?.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeUndefined();
          }
        );

        test.each(valid)(
          'Double %p is not better then Double %p by level',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${p2}`]: [player777.id, player888.id],
                [`double${p1}`]: [player666.id, player999.id],
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();

            const error = validation.errors?.find(
              (e) => e.message === 'team-assembly.error.player-order-highest'
            );
            expect(error).toBeUndefined();
          }
        );
      });

      describe('invalid', () => {
        const invalid = [
          [1, 2],
          [2, 3],
          [3, 4],
        ];

        test.each(invalid)(
          'Single %p is not better then Single %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`single${p1}`]: player888.id,
                [`single${p2}`]: player777.id,
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeDefined();
            expect(error?.params?.['game']).toBe(`single${p1}`);
            expect(error?.params?.['player1']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['player1']?.['ranking']).toBe(8);

            expect(error?.params?.['player2']?.['fullName']).toBe(
              player777.fullName
            );
            expect(error?.params?.['player2']?.['ranking']).toBe(7);
          }
        );

        test.each(invalid)(
          'Double %p is better then Double %p',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${p1}`]: [player777.id, player888.id],
                [`double${p2}`]: [player666.id, player888.id],
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly.error.player-order'
            );
            expect(error).toBeDefined();
            expect(error?.params?.['game']).toBe(`double${p1}`);
            // Team 1
            expect(error?.params?.['team1player1']?.['fullName']).toBe(
              player777.fullName
            );
            expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
            expect(error?.params?.['team1player2']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

            // Team 2
            expect(error?.params?.['team2player1']?.['fullName']).toBe(
              player666.fullName
            );
            expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
            expect(error?.params?.['team2player2']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['team2player2']?.['ranking']).toBe(8);
          }
        );

        test.each(invalid)(
          'Double %p is not better then Double %p by level',
          async (p1, p2) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${p1}`]: [player777.id, player888.id],
                [`double${p2}`]: [player666.id, player999.id],
              },
              [new PlayerOrderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly.error.player-order-highest'
            );
            expect(error).toBeDefined();
            expect(error?.params?.['game']).toBe(`double${p1}`);
            // Team 1
            expect(error?.params?.['team1player1']?.['fullName']).toBe(
              player777.fullName
            );
            expect(error?.params?.['team1player1']?.['ranking']).toBe(7);
            expect(error?.params?.['team1player2']?.['fullName']).toBe(
              player888.fullName
            );
            expect(error?.params?.['team1player2']?.['ranking']).toBe(8);

            // Team 2
            expect(error?.params?.['team2player1']?.['fullName']).toBe(
              player666.fullName
            );
            expect(error?.params?.['team2player1']?.['ranking']).toBe(6);
            expect(error?.params?.['team2player2']?.['fullName']).toBe(
              player999.fullName
            );
            expect(error?.params?.['team2player2']?.['ranking']).toBe(9);
          }
        );
      });
    });

    describe('Rule [TeamSubeventIndexRule]', () => {
      describe('valid', () => {
        it('should be valid', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new TeamSubeventIndexRule()]
          );

          expect(validation).toBeDefined();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.team-to-strong'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it('should be invalid if team index lower then the base', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player111.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new TeamSubeventIndexRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.team-to-strong'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['baseTeamIndex']).toBe(50);
          expect(error?.params?.['minIndex']).toBe(53);
          expect(error?.params?.['maxIndex']).toBe(70);
        });
      });
    });

    describe('Rule [CompetitionStatusRule]', () => {
      describe('valid', () => {
        it('should be valid', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new CompetitionStatusRule()]
          );

          expect(validation).toBeDefined();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.competition-status'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it("should be invalid if the player doesn't have competition status on true ", async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new CompetitionStatusRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.competition-status'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player555.fullName);
        });

        it("should be invalid if the players doesn't have competition status on true ", async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player111.id,
              single2: player555.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new CompetitionStatusRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const errors = validation.errors.filter(
            (e) => e.message === 'team-assembly.error.competition-status'
          );

          expect(errors).toBeDefined();
          expect(errors.length).toBe(2);
        });
      });
    });

    describe('Rule [PlayerMaxGamesRule]', () => {
      describe('valid', () => {
        it('should be valid single', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.player-max-single-games'
          );
          expect(error).toBeUndefined();
        });

        it('should be valid double', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double1: [player666.id, player777.id],
              double2: [player666.id, player888.id],
              double3: [player777.id, player999.id],
              double4: [player888.id, player999.id],
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) => e.message === 'team-assembly.error.player-max-double-games'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        it('should be invalid if the player has more then 1 single game ', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              single1: player555.id,
              single2: player555.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-max-single-games'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player555.fullName);
        });

        it('should be invalid if the player has more then 2 doubles', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double1: [player666.id, player777.id],
              double2: [player666.id, player888.id],
              double3: [player666.id, player999.id],
              double4: [player888.id, player999.id],
            },
            [new PlayerMaxGamesRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeFalsy();

          const error = validation.errors.find(
            (e) => e.message === 'team-assembly.error.player-max-double-games'
          );

          expect(error).toBeDefined();
          expect(error?.params?.['fullName']).toBe(player666.fullName);
        });
      });
    });

    describe('Rule [PlayerGenderRule]', () => {
      describe('valid', () => {
        it('should be valid single', async () => {
          const validation = await service.fetchAndValidate(
            {
              systemId: system.id,
              teamId: team?.id,
              encounterId: encounter.id,
              double1: [player666.id, player777.id],
              double2: [player666.id, player888.id],
              double3: [player777.id, player999.id],
              double4: [player888.id, player999.id],
              single1: player666.id,
              single2: player777.id,
              single3: player888.id,
              single4: player999.id,
            },
            [new PlayerGenderRule()]
          );

          expect(validation).toBeDefined();
          expect(validation.valid).toBeTruthy();

          const error = validation.errors?.find(
            (e) =>
              e.message === 'team-assembly.error.player-genders' ||
              e.message === 'team-assembly.error.player-gender'
          );
          expect(error).toBeUndefined();
        });
      });

      describe('invalid', () => {
        // const games = [[1], [2], [3], [4]];
        const games = [[2]];

        test.each(games)(
          'should be invalid single if the player the wrong gender',
          async (g) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`single${g}`]: player555.id,
              },
              [new PlayerGenderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly-error.player-gender'
            );

            expect(error).toBeDefined();
            expect(error?.params?.['fullName']).toBe(player555.fullName);
          }
        );

        test.each(games)(
          'should be invalid double if the player the wrong gender',
          async (g) => {
            const validation = await service.fetchAndValidate(
              {
                systemId: system.id,
                teamId: team?.id,
                encounterId: encounter.id,
                [`double${g}`]: [player555.id, player666.id],
              },
              [new PlayerGenderRule()]
            );

            expect(validation).toBeDefined();
            expect(validation.valid).toBeFalsy();

            const error = validation.errors.find(
              (e) => e.message === 'team-assembly-error.player-gender'
            );

            expect(error).toBeDefined();
            expect(error?.params?.['fullName']).toBe(player555.fullName);
          }
        );
      });
    });
  });
});
