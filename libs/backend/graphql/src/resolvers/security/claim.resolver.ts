import { Claim, Player } from '@badman/backend-database';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { User } from '@badman/backend-authorization';
import { ListArgs } from '../../utils';

@Resolver(() => Claim)
export class ClaimResolver {
  private readonly logger = new Logger(ClaimResolver.name);
  constructor(private _sequelize: Sequelize) {}

  @Query(() => Claim)
  async claim(@Args('id', { type: () => ID }) id: string): Promise<Claim> {
    const claim = await Claim.findByPk(id);

    if (!claim) {
      throw new NotFoundException(id);
    }
    return claim;
  }

  @Query(() => [Claim])
  async claims(@Args() listArgs: ListArgs): Promise<Claim[]> {
    return Claim.findAll(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => Boolean)
  async assignClaim(
    @User() user: Player,
    @Args('claimId', { type: () => ID }) claimId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('active') active: boolean
  ): Promise<boolean> {
    if (!await user.hasAnyPermission([`edit:claims`])) {
      throw new UnauthorizedException(
        `You do not have permission to edit claims`
      );
    }

    const transaction = await this._sequelize.transaction();
    try {
      const player = await Player.findByPk(playerId, {
        transaction,
      });

      if (!player) {
        throw new NotFoundException(`${Player.name}: ${playerId}`);
      }

      if (active) {
        await player.addClaim(claimId, { transaction });
      } else {
        await player.removeClaim(claimId, { transaction });
      }

      await transaction.commit();
      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  // @Mutation(returns => Claim)
  // async addClaim(
  //   @Args('newClaimData') newClaimData: NewClaimInput,
  // ): Promise<Claim> {
  //   const recipe = await this.recipesService.create(newClaimData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeClaim(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
