import { User } from '@badman/backend-authorization';
import {
  DrawTournament,
  EventEntry,
  Game,
  Player,
  RankingSystem,
  SubEventTournament,
} from '@badman/backend-database';
import { PointsService } from '@badman/backend-ranking';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  InputType,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../../utils';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@InputType()
export class SyncDrawOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Deletes the exsiting draw (and childs) and re-creates with the same id',
  })
  deleteDraw?: boolean;

  @Field(() => Boolean, { nullable: true })
  deleteMatch?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateMatches?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateStanding?: boolean;
}

@Resolver(() => DrawTournament)
export class DrawTournamentResolver {
  private readonly logger = new Logger(DrawTournamentResolver.name);

  constructor(
    private readonly _sequelize: Sequelize,
    private readonly _pointService: PointsService,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
  ) {}

  @Query(() => DrawTournament)
  async drawTournament(@Args('id', { type: () => ID }) id: string): Promise<DrawTournament> {
    const draw = await DrawTournament.findByPk(id);

    if (!draw) {
      throw new NotFoundException(id);
    }
    return draw;
  }

  @Query(() => [DrawTournament])
  async drawTournaments(@Args() listArgs: ListArgs): Promise<DrawTournament[]> {
    return DrawTournament.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => SubEventTournament)
  async subEventTournament(@Parent() draw: DrawTournament): Promise<SubEventTournament> {
    return draw.getSubEventTournament();
  }

  @ResolveField(() => [EventEntry])
  async eventEntries(@Parent() draw: DrawTournament): Promise<EventEntry[]> {
    return draw.getEventEntries();
  }

  @ResolveField(() => [Game])
  async games(@Parent() draw: DrawTournament): Promise<Game[]> {
    return draw.getGames();
  }

  @Mutation(() => Boolean)
  async recalculateDrawTournamentRankingPoints(
    @User() user: Player,
    @Args('drawId', { type: () => ID }) drawId: string,
    @Args('systemId', { type: () => ID, nullable: true }) systemId: string,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['re-sync:points']))) {
      throw new UnauthorizedException(`You do not have permission to sync points`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const where = systemId ? { id: systemId } : { primary: true };
      const system = await RankingSystem.findOne({
        where,
      });

      if (!system) {
        throw new NotFoundException(`${RankingSystem.name} not found for ${systemId || 'primary'}`);
      }

      // find all games
      const enc = await DrawTournament.findByPk(drawId, {
        transaction,
      });

      if (!enc) {
        throw new NotFoundException(`${DrawTournament.name}  not found for ${drawId}`);
      }

      const games = await enc.getGames({ transaction });

      for (const game of games) {
        await this._pointService.createRankingPointforGame(system, game, {
          transaction,
        });
      }

      this.logger.log(`Recalculated ${games.length} ranking points for draw ${drawId}`);

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean, {
    description: `
    Sync a draw from the tournament\n
\n
    Codes are the visual reality code's\n
    \n
    Valid combinations:\n
    - drawId\n
    - eventId and drawCode\n
    - eventCode and drawCode\n
    - subEventId and drawCode\n
    `,
  })
  async syncDraw(
    @User() user: Player,
    @Args('drawId', { type: () => ID, nullable: true }) drawId: string,
    @Args('drawCode', { type: () => ID, nullable: true }) drawCode: string,
    @Args('eventId', { type: () => ID, nullable: true }) eventId: string,
    @Args('eventCode', { type: () => ID, nullable: true }) eventCode: string,
    @Args('subEventId', { type: () => ID, nullable: true }) subEventId: string,

    @Args('options', { nullable: true }) options: SyncDrawOptions,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:tournament']))) {
      throw new UnauthorizedException(`You do not have permission to sync tournament`);
    }

    // Any of the following combinations are valid
    if (
      !drawId &&
      !(eventId && drawCode) &&
      !(eventCode && drawCode) &&
      !(subEventId && drawCode)
    ) {
      throw new Error('Invalid arguments');
    }

    this._syncQueue.add(
      Sync.ScheduleSyncTournamentDraw,
      {
        drawId,
        drawCode,

        eventId,
        eventCode,

        options,
      },
      {
        removeOnComplete: true,
      },
    );

    return true;
  }
}
