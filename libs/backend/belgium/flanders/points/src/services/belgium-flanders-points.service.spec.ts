import {
  DatabaseModule,
  GameBuilder,
  PlayerBuilder,
  RankingPoint,
  RankingSystem,
  SystemBuilder,
  SystemGroupBuilder,
  RankingPlaceBuilder,
} from '@badman/backend-database';
import { GameType, RankingSystems } from '@badman/utils';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';

import { BelgiumFlandersPointsService } from './belgium-flanders-points.service';

describe('BelgiumFlandersPointsService', () => {
  let service: BelgiumFlandersPointsService;
  let system: RankingSystem;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [BelgiumFlandersPointsService],
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
    }).compile();

    service = module.get<BelgiumFlandersPointsService>(BelgiumFlandersPointsService);

    // Setup db
    const sequelize = module.get<Sequelize>(Sequelize);
    await sequelize.sync({ force: true });

    const group = SystemGroupBuilder.Create();
    system = await SystemBuilder.Create(RankingSystems.BVL, 12, 75, 50)
      .WithMaxDiffLevels(2)
      .AsPrimary()
      .WithGroup(group)
      .Build();
  }, 50000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Single', () => {
    it('type: S - Won: 1 - LevelDiff: 0', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(1)
        .WithGameType(GameType.S)
        .WithSet(21, 15)
        .WithSet(21, 15)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(2);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(253);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(0);
    });

    it('type: S - Won: 2 - LevelDiff: 0', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(2)
        .WithSet(15, 21)
        .WithSet(15, 21)
        .WithGameType(GameType.S)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(2);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(0);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(253);
    });

    it('type: S - Won: 1 - LevelDiff: +2', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(1)
        .WithSet(21, 15)
        .WithSet(21, 15)
        .WithGameType(GameType.S)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(6, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(2);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(253);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(0);
      expect(t2p1Points?.differenceInLevel).toBe(-2);
    });

    it('type: S - Won: 2 - LevelDiff: +2', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(2)
        .WithSet(15, 21)
        .WithSet(15, 21)
        .WithGameType(GameType.S)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(6, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(2);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(0);
      expect(t1p1Points?.differenceInLevel).toBe(2);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(570);
      expect(t2p1Points?.differenceInLevel).toBe(0);
    });
    it('type: S - Won: 2 - LevelDiff: +2 - New player', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(2)
        .WithSet(15, 21)
        .WithSet(15, 21)
        .WithGameType(GameType.S)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(6, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b').WithName(
            'player1',
            'team2',
          ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(2);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(0);
      expect(t1p1Points?.differenceInLevel).toBe(6);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(570);
      expect(t2p1Points?.differenceInLevel).toBe(0);
    });
  });

  describe('Double', () => {
    it('type: D - Won: 1 - LevelDiff: 0', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(1)
        .WithGameType(GameType.D)
        .WithSet(21, 15)
        .WithSet(21, 15)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          1,
          2,
          PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
            .WithName('player2', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 5, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          2,
          PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
            .WithName('player2', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 5, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(4);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(554);
      const t1p2Points = points.find(
        (p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289',
      );
      expect(t1p2Points?.points).toBe(554);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(0);
      const t2p2Points = points.find(
        (p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6',
      );
      expect(t2p2Points?.points).toBe(0);
    });

    it('type: D - Won: 2 - LevelDiff: 0', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(2)
        .WithSet(15, 21)
        .WithSet(15, 21)
        .WithGameType(GameType.D)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          1,
          2,
          PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
            .WithName('player2', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 5, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          2,
          PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
            .WithName('player2', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 5, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(4);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(0);
      const t1p2Points = points.find(
        (p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289',
      );
      expect(t1p2Points?.points).toBe(0);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(554);
      const t2p2Points = points.find(
        (p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6',
      );
      expect(t2p2Points?.points).toBe(554);
    });

    it('type: D - Won: 1 - LevelDiff: +2', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(1)
        .WithSet(21, 15)
        .WithSet(21, 15)
        .WithGameType(GameType.D)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 6, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          1,
          2,
          PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
            .WithName('player2', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 6, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          2,
          PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
            .WithName('player2', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(4);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(253);
      expect(t1p1Points?.differenceInLevel).toBe(0);
      const t1p2Points = points.find(
        (p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289',
      );
      expect(t1p2Points?.points).toBe(253);
      expect(t1p2Points?.differenceInLevel).toBe(0);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(0);
      expect(t2p1Points?.differenceInLevel).toBe(-2);
      const t2p2Points = points.find(
        (p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6',
      );
      expect(t2p2Points?.points).toBe(0);
      expect(t2p2Points?.differenceInLevel).toBe(-2);
    });

    it('type: D - Won: 2 - LevelDiff: +2', async () => {
      // Arrange
      const game1 = await GameBuilder.Create()
        .WithDate(new Date('2021-10-15'))
        .WithWinner(2)
        .WithSet(15, 21)
        .WithSet(15, 21)
        .WithGameType(GameType.D)
        .WithPlayer(
          1,
          1,
          PlayerBuilder.Create('3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e')
            .WithName('player1', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 6, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          1,
          2,
          PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
            .WithName('player2', 'team1')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 6, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .WithPlayer(
          2,
          2,
          PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
            .WithName('player2', 'team2')
            .WithRanking(
              RankingPlaceBuilder.Create()
                .WithSystemId(system.id)
                .WithRanking(8, 8, 8)
                .WithDate(new Date('2021-10-10')),
            ),
        )
        .Build();

      // Act
      await service.createRankingPointforGame(system, game1);

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(4);

      const t1p1Points = points.find(
        (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e',
      );
      expect(t1p1Points?.points).toBe(0);
      expect(t1p1Points?.differenceInLevel).toBe(2);
      const t1p2Points = points.find(
        (p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289',
      );
      expect(t1p2Points?.points).toBe(0);
      expect(t1p2Points?.differenceInLevel).toBe(2);

      const t2p1Points = points.find(
        (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b',
      );
      expect(t2p1Points?.points).toBe(570);
      expect(t2p1Points?.differenceInLevel).toBe(0);
      const t2p2Points = points.find(
        (p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6',
      );
      expect(t2p2Points?.points).toBe(570);
      expect(t2p2Points?.differenceInLevel).toBe(0);
    });
  });
});
