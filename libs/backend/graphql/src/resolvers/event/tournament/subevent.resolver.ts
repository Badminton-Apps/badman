import {
  DrawTournament,
  EventTournament,
  Game,
  Player,
  RankingGroup,
  RankingSystem,
  SubEventTournament,
} from "@badman/backend-database";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
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
} from "@nestjs/graphql";
import { ListArgs } from "../../../utils";
import { User } from "@badman/backend-authorization";
import { PointsService } from "@badman/backend-ranking";
import { Sequelize } from "sequelize-typescript";
import { SyncQueue, Sync } from "@badman/backend-queue";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { SyncDrawOptions } from "./draw.resolver";

@InputType()
export class SyncSubEventOptions extends SyncDrawOptions {
  @Field(() => Boolean, {
    nullable: true,
    description: "Deletes the exsiting sub-event (and childs) and re-creates with the same id",
  })
  deleteSubEvent?: boolean;

  @Field(() => Boolean, { nullable: true })
  updateDraws?: boolean;
}

@Resolver(() => SubEventTournament)
export class SubEventTournamentResolver {
  private readonly logger = new Logger(SubEventTournamentResolver.name);

  constructor(
    private readonly _sequelize: Sequelize,
    private readonly _pointService: PointsService,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue
  ) {}

  @Query(() => SubEventTournament)
  async subEventTournament(
    @Args("id", { type: () => ID }) id: string
  ): Promise<SubEventTournament> {
    const subEventTournament = await SubEventTournament.findByPk(id);

    if (!subEventTournament) {
      throw new NotFoundException(id);
    }
    return subEventTournament;
  }

  @Query(() => [SubEventTournament])
  async subEventTournaments(@Args() listArgs: ListArgs): Promise<SubEventTournament[]> {
    return SubEventTournament.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [DrawTournament])
  async drawTournaments(
    @Parent() subEvent: SubEventTournament,
    @Args() listArgs: ListArgs
  ): Promise<DrawTournament[]> {
    return subEvent.getDrawTournaments(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EventTournament)
  async eventTournament(@Parent() subEvent: SubEventTournament): Promise<EventTournament> {
    return subEvent.getEvent();
  }

  @ResolveField(() => [RankingGroup])
  async rankingGroups(@Parent() subEvent: SubEventTournament): Promise<RankingGroup[]> {
    return subEvent.getRankingGroups();
  }

  @Mutation(() => Boolean)
  async recalculateSubEventTournamentwRankingPoints(
    @User() user: Player,
    @Args("drawId", { type: () => ID }) drawId: string,
    @Args("systemId", { type: () => ID, nullable: true }) systemId: string
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(["re-sync:points"]))) {
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
        throw new NotFoundException(`${RankingSystem.name} not found for ${systemId || "primary"}`);
      }

      // find all games
      const subEvent = await SubEventTournament.findByPk(drawId, {
        transaction,
      });

      if (!subEvent) {
        throw new NotFoundException(`${SubEventTournament.name}  not found for ${drawId}`);
      }

      const draws = await subEvent.getDrawTournaments({
        transaction,
        include: [{ model: Game }],
      });

      const games = draws.reduce((acc, draw) => {
        acc.push(...(draw.games ?? []));
        return acc;
      }, [] as Game[]);

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
    Sync a subEvent from the tournament\n
\n
    Codes are the visual reality code's\n
\n
    Valid combinations: \n
    - subeventId\n
    - eventId and subEventCode\n
    - eventCode and subEventCode\n

    `,
  })
  async syncSubEvent(
    @User() user: Player,
    @Args("eventId", { type: () => ID, nullable: true }) eventId: string,
    @Args("eventCode", { type: () => ID, nullable: true }) eventCode: string,

    @Args("subEventId", { type: () => ID, nullable: true }) subEventId: string,
    @Args("subEventCode", { type: () => ID, nullable: true }) subEventCode: string,

    @Args("options", { nullable: true }) options: SyncSubEventOptions
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(["sync:tournament"]))) {
      throw new UnauthorizedException(`You do not have permission to sync tournament`);
    }

    // Any of the following combinations are valid
    if (!subEventId && !(eventId && subEventCode) && !(eventCode && subEventCode)) {
      throw new Error("Invalid arguments");
    }

    this._syncQueue.add(
      Sync.ScheduleSyncTournamentSubEvent,
      {
        subEventId,
        subEventCode,

        options,
      },
      {
        removeOnComplete: true,
      }
    );

    return true;
  }
}
