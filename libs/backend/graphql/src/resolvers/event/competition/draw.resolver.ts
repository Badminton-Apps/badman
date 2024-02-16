import {
  DrawCompetition,
  DrawCompetitionUpdateInput,
  EncounterCompetition,
  EventEntry,
  Player,
  Standing,
  SubEventCompetition,
} from '@badman/backend-database';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../../utils';
import { User } from '@badman/backend-authorization';
import { Sequelize } from 'sequelize-typescript';
import { sortStanding } from '@badman/utils';

@Resolver(() => DrawCompetition)
export class DrawCompetitionResolver {
  private readonly logger = new Logger(DrawCompetitionResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => DrawCompetition)
  async drawCompetition(@Args('id', { type: () => ID }) id: string): Promise<DrawCompetition> {
    const drawCompetition = await DrawCompetition.findByPk(id);

    if (!drawCompetition) {
      throw new NotFoundException(id);
    }
    return drawCompetition;
  }

  @Query(() => [DrawCompetition])
  async drawCompetitions(@Args() listArgs: ListArgs): Promise<DrawCompetition[]> {
    return DrawCompetition.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => SubEventCompetition)
  async subEventCompetition(@Parent() draw: DrawCompetition): Promise<SubEventCompetition> {
    return draw.getSubEventCompetition();
  }

  @ResolveField(() => [EventEntry])
  async eventEntries(@Parent() draw: DrawCompetition): Promise<EventEntry[]> {
    return draw.getEntries();
  }

  @ResolveField(() => [EncounterCompetition])
  async encounterCompetitions(
    @Parent() draw: DrawCompetition,
    @Args() listArgs: ListArgs,
  ): Promise<EncounterCompetition[]> {
    return draw.getEncounterCompetitions(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => DrawCompetition)
  async updateDrawCompetition(
    @User() user: Player,
    @Args('data') updateDrawCompetitionData: DrawCompetitionUpdateInput,
  ): Promise<DrawCompetition> {
    if (!(await user.hasAnyPermission([`edit:competition`]))) {
      throw new UnauthorizedException(`You do not have permission to add a competition`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const drawCompetitionDb = await DrawCompetition.findByPk(updateDrawCompetitionData.id);

      if (!drawCompetitionDb) {
        throw new NotFoundException(`${DrawCompetition.name}: ${updateDrawCompetitionData.id}`);
      }

      // if the draws risers/fallers have changed, recalculate the standings
      if (
        drawCompetitionDb.risers !== updateDrawCompetitionData.risers ||
        drawCompetitionDb.fallers !== updateDrawCompetitionData.fallers
      ) {
        const entries = await drawCompetitionDb.getEntries({ transaction });
        const standings: Standing[] = [];
        for (const entry of entries) {
          const standing = await entry.getStanding({ transaction });

          if (!standing) {
            this.logger.warn(`No standing found for entry ${entry.id}`);
          } else {
            standings.push(standing);
          }
        }

        // sort the standings by place
        standings.sort(sortStanding);

        // reset the risers and fallers
        for (const standing of standings) {
          standing.riser = false;
          standing.faller = false;
        }

        // calculate the risers and fallers

        standings
          .slice(0, updateDrawCompetitionData.risers)
          .forEach((standing) => (standing.riser = true));

        standings
          .slice(standings.length - (updateDrawCompetitionData.fallers ?? 0), standings.length)
          .forEach((standing) => (standing.faller = true));

        // save the standings
        for (const standing of standings) {
          standing.changed('faller', true);
          standing.changed('riser', true);
          await standing.save({ transaction });
        }
      }

      // Update db
      const result = await drawCompetitionDb.update(updateDrawCompetitionData, {
        transaction,
      });

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  // @Mutation(returns => DrawCompetition)
  // async addDrawCompetition(
  //   @Args('newDrawCompetitionData') newDrawCompetitionData: NewDrawCompetitionInput,
  // ): Promise<DrawCompetition> {
  //   const recipe = await this.recipesService.create(newDrawCompetitionData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeDrawCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
