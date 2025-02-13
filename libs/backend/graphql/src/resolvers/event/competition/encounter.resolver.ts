import { User } from '@badman/backend-authorization';
import {
  EncounterValidationInput,
  EncounterValidationOutput,
  EncounterValidationService,
  updateEncounterCompetitionInput,
} from '@badman/backend-change-encounter';
import {
  Assembly,
  Comment,
  DrawCompetition,
  EncounterChange,
  EncounterCompetition,
  Game,
  Location,
  Player,
  RankingSystem,
  Team,
} from '@badman/backend-database';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { PointsService } from '@badman/backend-ranking';
import { InjectQueue } from '@nestjs/bull';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Queue } from 'bull';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEncounterCompetition {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterCompetition])
  rows?: EncounterCompetition[];
}


@ObjectType()
export class PlayerEncounterCompetition {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterCompetition])
  rows?: EncounterCompetition[];
}


@Resolver(() => EncounterCompetition)
export class EncounterCompetitionResolver {
  private readonly logger = new Logger(EncounterCompetitionResolver.name);

  constructor(
    @InjectQueue(SyncQueue) private syncQueue: Queue,
    private _sequelize: Sequelize,
    private _pointService: PointsService,
    private encounterValidationService: EncounterValidationService,
  ) { }

  @Query(() => EncounterCompetition)
  async encounterCompetition(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<EncounterCompetition> {
    const encounterCompetition = await EncounterCompetition.findByPk(id);

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  // @Query(() => PagedEncounterCompetition)
  // async encounterCompetitions(
  //   @Args() listArgs: ListArgs,
  // ): Promise<{ count: number; rows: EncounterCompetition[] }> {
  //   return EncounterCompetition.findAndCountAll({
  //     ...ListArgs.toFindOptions(listArgs),
  //     include: [
  //       {
  //         model: Team,
  //         as: 'home',
  //       },
  //       {
  //         model: Team,
  //         as: 'away',
  //       },
  //     ],
  //   });
  // }

  @Query(() => PagedEncounterCompetition)
  async encounterCompetitions(
    @Args() listArgs: ListArgs,
  ): Promise<{ count: number; rows: EncounterCompetition[] }> {
    return EncounterCompetition.findAndCountAll({
      include: [
        {
          model: Team,
          as: 'home',
        },
        {
          model: Team,
          as: 'away',
        },
        {
          model: Game,
          as: 'games',
          include: [
            {
              model: Player,
              as: 'players',
              attributes: [],
            },
          ],
        },
      ],
      ...ListArgs.toFindOptions(listArgs),
    });
  }

  @ResolveField(() => DrawCompetition)
  async drawCompetition(@Parent() encounter: EncounterCompetition): Promise<DrawCompetition> {
    return encounter.getDrawCompetition();
  }

  @ResolveField(() => Location)
  async location(@Parent() encounter: EncounterCompetition): Promise<Location> {
    return encounter.getLocation();
  }

  @ResolveField(() => Team)
  async home(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getHome();
  }

  @ResolveField(() => Team)
  async away(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getAway();
  }

  @ResolveField(() => [Assembly])
  async assemblies(
    @User() user: Player,
    @Parent() encounter: EncounterCompetition,
    @Args() listArgs: ListArgs,
  ): Promise<Assembly[]> {
    if (!user?.id) {
      return [];
    }
    return encounter.getAssemblies(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EncounterChange)
  async encounterChange(@Parent() encounter: EncounterCompetition): Promise<EncounterChange> {
    return encounter.getEncounterChange();
  }

  @ResolveField(() => Boolean)
  async isPlayerPlayed(
    @Parent() encounter: EncounterCompetition,
    @Args('playerId', { type: () => ID, nullable: true }) playerId?: string, 
  ): Promise<boolean> {
    if (!playerId) {
      return false; 
    }
  
    const games = await encounter.getGames({
      include: [
        {
          model: Player,
          as: 'players',
        },
      ],
    });
    return games.some(game =>
      game?.players?.some(player => player.id === playerId)
    );
  }


  @ResolveField(() => [Game])
  async games(@Parent() encounter: EncounterCompetition): Promise<Game[]> {
    return encounter.getGames();
  }

  @ResolveField(() => Player)
  async gameLeader(@Parent() encounter: EncounterCompetition): Promise<Player> {
    return encounter.getGameLeader();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeComments(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayComments(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeCommentsChange(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayCommentsChange(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  @ResolveField(() => EncounterValidationOutput, {
    description: `Validate the ChangeEncounter`,
  })
  async validateEncounter(
    @User() user: Player,
    @Parent() encounter: EncounterCompetition,
    @Args('validationData', { nullable: true }) data: EncounterValidationInput,
  ): Promise<EncounterValidationOutput> {
    return this.encounterValidationService.validate(
      {
        ...data,
        encounterId: encounter.id,
      },
      {
        playerId: user.id,
        teamId: data.teamId,
        clubId: data.clubId,
      },
    );
  }

  @Mutation(() => Boolean)
  async changeDate(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
    @Args('date') date: Date,

    @Args('updateBadman') updateBadman: boolean,
    @Args('updateVisual') updateVisual: boolean,
    @Args('closeChangeRequests') closeChangeRequests: boolean,
  ) {
    const encounter = await EncounterCompetition.findByPk(id);

    if (!encounter) {
      throw new NotFoundException(`${EncounterCompetition.name}: ${id}`);
    }

    if (!(await user.hasAnyPermission(['change-any:encounter']))) {
      throw new UnauthorizedException(`You do not have permission to edit this encounter`);
    }

    if (updateBadman) {
      await encounter.update({ date: date });
    }

    if (updateVisual) {
      await this.syncQueue.add(
        Sync.ChangeDate,
        {
          encounterId: encounter.id,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    if (closeChangeRequests) {
      const change = await encounter.getEncounterChange();
      if (change) {
        await change.update({ accepted: true });
      }
    }

    return true;
  }

  @Mutation(() => Boolean)
  async recalculateEncounterCompetitionRankingPoints(
    @User() user: Player,
    @Args('encounterId', { type: () => ID }) encounterId: string,
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
      const enc = await EncounterCompetition.findByPk(encounterId, {
        transaction,
      });

      if (!enc) {
        throw new NotFoundException(`${EncounterCompetition.name}  not found for ${encounterId}`);
      }

      const games = await enc.getGames({ transaction });

      for (const game of games) {
        await this._pointService.createRankingPointforGame(system, game, {
          transaction,
        });
      }

      this.logger.log(`Recalculated ${games.length} ranking points for encounter ${encounterId}`);

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async updateGameLeader(
    @Args('encounterId') encounterId: string,
    @Args('gameLeaderId') gameLeaderId: string,
  ): Promise<boolean> {
    const transaction = await this._sequelize.transaction();
    try {
      const encounter = await EncounterCompetition.findByPk(encounterId, { transaction });

      if (!encounter) {
        throw new NotFoundException(`${EncounterCompetition.name}: ${encounterId}`);
      }

      await encounter.update({ gameLeaderId }, { transaction }); // Ensure transaction is passed here

      await transaction.commit();
      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

    @Mutation(() => EncounterCompetition)
    async updateEncounterCompetition(
      @User() user: Player,
      @Args('encounterId') encounterId: string,
      @Args('data') updateEncounterCompetitionData: updateEncounterCompetitionInput,
    ) {
      const encounter = await EncounterCompetition.findByPk(encounterId);

      if (!encounter) {
        throw new NotFoundException(`${EncounterCompetition.name}: ${encounterId}`);
      }

      if (!(await user.hasAnyPermission(['change-any:encounter']) || encounter.gameLeaderId === user.id)) {
        throw new UnauthorizedException(`You do not have permission to edit this encounter`);
      }

      await encounter.update(updateEncounterCompetitionData);

      return encounter;
    }
}
