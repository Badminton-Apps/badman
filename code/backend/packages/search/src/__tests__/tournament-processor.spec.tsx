import { DataBaseHandler, GameType, RankingPoint, RankingSystems } from '@badvlasim/shared';
import { TournamentSyncPointProcessor } from '../models/jobs/get-scores-visual/tournament-sync/processors';
import {
  DrawTournamentBuilder,
  EventTournamentBuilder,
  GameBuilder,
  PlayerBuilder,
  SubEventTournamentBuilder,
  SystemBuilder,
  SystemGroupBuilder
} from '../test-utils';

describe('Tournament processor', () => {
  beforeAll(async () => {
    new DataBaseHandler({
      dialect: 'sqlite',
      storage: ':memory:'
    });
  });

  beforeEach(async () => {
    // Clear eveything
    await DataBaseHandler.sequelizeInstance.sync({ force: true });
  });

  describe('TournamentSyncPointProcessor', () => {
    let processor: TournamentSyncPointProcessor;

    beforeEach(() => {
      processor = new TournamentSyncPointProcessor(null);
    });

    describe('Single', () => {
      it('type: S - Won: 1 - LevelDiff: 0', async () => {
        // Arrange
        const group = SystemGroupBuilder.Create();

        const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
          .AsPrimary()
          .WithGroup(group)
          .Build();

        // Create game
        const game1 = GameBuilder.Create()
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
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            1,
            PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
              .WithName('player1', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          );

        // Create event and assign game
        const event = await EventTournamentBuilder.Create('738e888f-562d-49ec-9ace-5dcce8aafe0f')
          .WithName('event1')
          .WithSubEvent(
            SubEventTournamentBuilder.Create()
              .WithGroup(group)
              .WithName('sub event 1')
              .WithDraw(DrawTournamentBuilder.Create().WithName('draw1').WithGame(game1))
          )
          .Build();

        // Build group (we could )
        await group.Build();

        // Assign event to processor
        processor.event = event;

        // Act
        await processor.process();

        // Assert
        const points = await RankingPoint.findAll();
        expect(points.length).toBe(2);

        const t1p1Points = points.find(
          (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e'
        );
        expect(t1p1Points?.points).toBe(253);

        const t2p1Points = points.find(
          (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b'
        );
        expect(t2p1Points?.points).toBe(0);
      });

      it('type: S - Won: 2 - LevelDiff: 0', async () => {
        // Arrange
        const group = SystemGroupBuilder.Create();

        const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
          .AsPrimary()
          .WithGroup(group)
          .Build();

        // Create game
        const game1 = GameBuilder.Create()
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
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            1,
            PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
              .WithName('player1', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          );

        // Create event and assign game
        const event = await EventTournamentBuilder.Create()
          .WithName('event1')
          .WithSubEvent(
            SubEventTournamentBuilder.Create().WithGroup(group).WithName('sub event 1').WithDraw(
              DrawTournamentBuilder.Create()
                .WithName('draw1')

                .WithGame(game1)
            )
          )
          .Build();

        // Build group
        await group.Build();

        // Assign event to processor
        processor.event = event;

        // Act
        await processor.process();

        // Assert
        const points = await RankingPoint.findAll();
        expect(points.length).toBe(2);

        const t1p1Points = points.find(
          (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e'
        );
        expect(t1p1Points?.points).toBe(0);

        const t2p1Points = points.find(
          (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b'
        );
        expect(t2p1Points?.points).toBe(253);
      });

      it('type: S - Won: 1 - LevelDiff: +2', async () => {
        // Arrange
        const group = SystemGroupBuilder.Create();

        const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
          .AsPrimary()
          .WithGroup(group)
          .Build();

        // Create game
        const game1 = GameBuilder.Create()
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
              .WithRanking(9, 8, 8, new Date('2021-10-01'), system.id)
              .WithRanking(6, 8, 8, new Date('2021-10-10'), system.id)
              .WithRanking(9, 8, 8, new Date('2021-10-20'), system.id)
          )
          .WithPlayer(
            2,
            1,
            PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
              .WithName('player1', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          );

        // Create event and assign game
        const event = await EventTournamentBuilder.Create()
          .WithName('event1')
          .WithSubEvent(
            SubEventTournamentBuilder.Create()
              .WithGroup(group)
              .WithName('sub event 1')
              .WithDraw(DrawTournamentBuilder.Create().WithName('draw1').WithGame(game1))
          )
          .Build();

        // Build group
        await group.Build();

        // Assign event to processor
        processor.event = event;

        // Act
        await processor.process();

        // Assert
        const points = await RankingPoint.findAll();
        expect(points.length).toBe(2);

        const t1p1Points = points.find(
          (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e'
        );
        expect(t1p1Points?.points).toBe(253);

        const t2p1Points = points.find(
          (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b'
        );
        expect(t2p1Points?.points).toBe(0);
        expect(t2p1Points?.differenceInLevel).toBe(-2);
      });

      it('type: S - Won: 2 - LevelDiff: +2', async () => {
        // Arrange
        const group = SystemGroupBuilder.Create();

        const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
          .AsPrimary()
          .WithGroup(group)
          .Build();

        // Create game
        const game1 = GameBuilder.Create()
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
              .WithRanking(6, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            1,
            PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
              .WithName('player1', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          );

        // Create event and assign game
        const event = await EventTournamentBuilder.Create()
          .WithName('event1')
          .WithSubEvent(
            SubEventTournamentBuilder.Create()
              .WithGroup(group)
              .WithName('sub event 1')
              .WithDraw(DrawTournamentBuilder.Create().WithName('draw1').WithGame(game1))
          )
          .Build();

        // Build group
        await group.Build();

        // Assign event to processor
        processor.event = event;

        // Act
        await processor.process();

        // Assert
        const points = await RankingPoint.findAll();
        expect(points.length).toBe(2);

        const t1p1Points = points.find(
          (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e'
        );
        expect(t1p1Points?.points).toBe(0);
        expect(t1p1Points?.differenceInLevel).toBe(2);

        const t2p1Points = points.find(
          (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b'
        );
        expect(t2p1Points?.points).toBe(570);
        expect(t2p1Points?.differenceInLevel).toBe(0);
      });
    });

    describe('Double', () => {
      it('type: D - Won: 1 - LevelDiff: 0', async () => {
        // Arrange
        const group = SystemGroupBuilder.Create();

        const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
          .AsPrimary()
          .WithGroup(group)
          .Build();

        // Create game
        const game1 = GameBuilder.Create()
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
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            1,
            2,
            PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
              .WithName('player2', 'team1')
              .WithRanking(8, 5, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            1,
            PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
              .WithName('player1', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            2,
            PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
              .WithName('player2', 'team2')
              .WithRanking(8, 5, 8, new Date('2021-10-10'), system.id)
          );

        // Create event and assign game
        const event = await EventTournamentBuilder.Create('738e888f-562d-49ec-9ace-5dcce8aafe0f')
          .WithName('event1')
          .WithSubEvent(
            SubEventTournamentBuilder.Create()
              .WithGroup(group)
              .WithName('sub event 1')
              .WithDraw(DrawTournamentBuilder.Create().WithName('draw1').WithGame(game1))
          )
          .Build();

        // Build group (we could )
        await group.Build();

        // Assign event to processor
        processor.event = event;

        // Act
        await processor.process();

        // Assert
        const points = await RankingPoint.findAll();
        expect(points.length).toBe(4);

        const t1p1Points = points.find(
          (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e'
        );
        expect(t1p1Points?.points).toBe(554);
        const t1p2Points = points.find(
          (p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289'
        );
        expect(t1p2Points?.points).toBe(554);

        const t2p1Points = points.find(
          (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b'
        );
        expect(t2p1Points?.points).toBe(0);
        const t2p2Points = points.find(
          (p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6'
        );
        expect(t2p2Points?.points).toBe(0);
      });

      it('type: D - Won: 2 - LevelDiff: 0', async () => {
        // Arrange
        const group = SystemGroupBuilder.Create();

        const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
          .AsPrimary()
          .WithGroup(group)
          .Build();

        // Create game
        const game1 = GameBuilder.Create()
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
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            1,
            2,
            PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
              .WithName('player2', 'team1')
              .WithRanking(8, 5, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            1,
            PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
              .WithName('player1', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            2,
            PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
              .WithName('player2', 'team2')
              .WithRanking(8, 5, 8, new Date('2021-10-10'), system.id)
          );

        // Create event and assign game
        const event = await EventTournamentBuilder.Create()
          .WithName('event1')
          .WithSubEvent(
            SubEventTournamentBuilder.Create()
              .WithGroup(group)
              .WithName('sub event 1')
              .WithDraw(DrawTournamentBuilder.Create().WithName('draw1').WithGame(game1))
          )
          .Build();

        // Build group
        await group.Build();

        // Assign event to processor
        processor.event = event;

        // Act
        await processor.process();

        // Assert
        const points = await RankingPoint.findAll();
        expect(points.length).toBe(4);

        const t1p1Points = points.find(
          (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e'
        );
        expect(t1p1Points?.points).toBe(0);
        const t1p2Points = points.find(
          (p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289'
        );
        expect(t1p2Points?.points).toBe(0);

        const t2p1Points = points.find(
          (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b'
        );
        expect(t2p1Points?.points).toBe(554);
        const t2p2Points = points.find(
          (p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6'
        );
        expect(t2p2Points?.points).toBe(554);
      });

      it('type: D - Won: 1 - LevelDiff: +2', async () => {
        // Arrange
        const group = SystemGroupBuilder.Create();

        const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
          .AsPrimary()
          .WithGroup(group)
          .Build();

        // Create game
        const game1 = GameBuilder.Create()
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
              .WithRanking(8, 6, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            1,
            2,
            PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
              .WithName('player2', 'team1')
              .WithRanking(8, 6, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            1,
            PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
              .WithName('player1', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            2,
            PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
              .WithName('player2', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          );

        // Create event and assign game
        const event = await EventTournamentBuilder.Create()
          .WithName('event1')
          .WithSubEvent(
            SubEventTournamentBuilder.Create()
              .WithGroup(group)
              .WithName('sub event 1')
              .WithDraw(DrawTournamentBuilder.Create().WithName('draw1').WithGame(game1))
          )
          .Build();

        // Build group
        await group.Build();

        // Assign event to processor
        processor.event = event;

        // Act
        await processor.process();

        // Assert
        const points = await RankingPoint.findAll();
        expect(points.length).toBe(4);

        const t1p1Points = points.find(
          (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e'
        );
        expect(t1p1Points?.points).toBe(253);
        expect(t1p1Points?.differenceInLevel).toBe(0);
        const t1p2Points = points.find(
          (p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289'
        );
        expect(t1p2Points?.points).toBe(253);
        expect(t1p2Points?.differenceInLevel).toBe(0);

        const t2p1Points = points.find(
          (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b'
        );
        expect(t2p1Points?.points).toBe(0);
        expect(t2p1Points?.differenceInLevel).toBe(-2);
        const t2p2Points = points.find(
          (p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6'
        );
        expect(t2p2Points?.points).toBe(0);
        expect(t2p2Points?.differenceInLevel).toBe(-2);
      });

      it('type: D - Won: 2 - LevelDiff: +2', async () => {
        // Arrange
        const group = SystemGroupBuilder.Create();

        const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
          .AsPrimary()
          .WithGroup(group)
          .Build();

        // Create game
        const game1 = GameBuilder.Create()
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
              .WithRanking(8, 6, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            1,
            2,
            PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
              .WithName('player2', 'team1')
              .WithRanking(8, 6, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            1,
            PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
              .WithName('player1', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          )
          .WithPlayer(
            2,
            2,
            PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
              .WithName('player2', 'team2')
              .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
          );

        // Create event and assign game
        const event = await EventTournamentBuilder.Create()
          .WithName('event1')
          .WithSubEvent(
            SubEventTournamentBuilder.Create()
              .WithGroup(group)
              .WithName('sub event 1')
              .WithDraw(DrawTournamentBuilder.Create().WithName('draw1').WithGame(game1))
          )
          .Build();

        // Build group
        await group.Build();

        // Assign event to processor
        processor.event = event;

        // Act
        await processor.process();

        // Assert
        const points = await RankingPoint.findAll();
        expect(points.length).toBe(4);

        const t1p1Points = points.find(
          (p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e'
        );
        expect(t1p1Points?.points).toBe(0);
        expect(t1p1Points?.differenceInLevel).toBe(2);
        const t1p2Points = points.find(
          (p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289'
        );
        expect(t1p2Points?.points).toBe(0);
        expect(t1p2Points?.differenceInLevel).toBe(2);

        const t2p1Points = points.find(
          (p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b'
        );
        expect(t2p1Points?.points).toBe(570);
        expect(t2p1Points?.differenceInLevel).toBe(0);
        const t2p2Points = points.find(
          (p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6'
        );
        expect(t2p2Points?.points).toBe(570);
        expect(t2p2Points?.differenceInLevel).toBe(0);
      });
    });

    it('Run multiple times, should not add new points', async () => {
      // Arrange
      const group = SystemGroupBuilder.Create();

      const system = await SystemBuilder.Create(RankingSystems.VISUAL, 12, 75, 50)
        .AsPrimary()
        .WithGroup(group)
        .Build();

      // Create game
      const game1 = GameBuilder.Create()
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
            .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
        )
        .WithPlayer(
          1,
          2,
          PlayerBuilder.Create('0d5ba7bc-7bc7-42c6-b96f-8572674c3289')
            .WithName('player2', 'team1')
            .WithRanking(8, 5, 8, new Date('2021-10-10'), system.id)
        )
        .WithPlayer(
          2,
          1,
          PlayerBuilder.Create('e7010758-286c-441a-b942-96d49446cb4b')
            .WithName('player1', 'team2')
            .WithRanking(8, 8, 8, new Date('2021-10-10'), system.id)
        )
        .WithPlayer(
          2,
          2,
          PlayerBuilder.Create('0d91912b-d31c-4d02-915e-ef00007c9ca6')
            .WithName('player2', 'team2')
            .WithRanking(8, 5, 8, new Date('2021-10-10'), system.id)
        );

      // Create event and assign game
      const event = await EventTournamentBuilder.Create('738e888f-562d-49ec-9ace-5dcce8aafe0f')
        .WithName('event1')
        .WithSubEvent(
          SubEventTournamentBuilder.Create()
            .WithGroup(group)
            .WithName('sub event 1')
            .WithDraw(DrawTournamentBuilder.Create().WithName('draw1').WithGame(game1))
        )
        .Build();

      // Build group (we could )
      await group.Build();

      // Assign event to processor
      processor.event = event;

      // Act
      await processor.process();
      await processor.process();
      await processor.process();
      await processor.process();

      // Assert
      const points = await RankingPoint.findAll();
      expect(points.length).toBe(4);

      const t1p1Points = points.find((p) => p.playerId === '3cb27f2f-6f38-4dcd-b189-eeaf86df9e4e');
      expect(t1p1Points?.points).toBe(554);
      const t1p2Points = points.find((p) => p.playerId === '0d5ba7bc-7bc7-42c6-b96f-8572674c3289');
      expect(t1p2Points?.points).toBe(554);

      const t2p1Points = points.find((p) => p.playerId === 'e7010758-286c-441a-b942-96d49446cb4b');
      expect(t2p1Points?.points).toBe(0);
      const t2p2Points = points.find((p) => p.playerId === '0d91912b-d31c-4d02-915e-ef00007c9ca6');
      expect(t2p2Points?.points).toBe(0);
    });
  });
});
