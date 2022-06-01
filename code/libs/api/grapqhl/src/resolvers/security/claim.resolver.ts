import { Claim } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../utils';

@Resolver(() => Claim)
export class ClaimResolver {
  @Query(() => Claim)
  async claim(@Args('id', { type: () => ID }) id: string): Promise<Claim> {
    let claim = await Claim.findByPk(id);

    if (!claim) {
      claim = await Claim.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!claim) {
      throw new NotFoundException(id);
    }
    return claim;
  }

  @Query(() => [Claim])
  async claims(@Args() listArgs: ListArgs): Promise<Claim[]> {
    return Claim.findAll(ListArgs.toFindOptions(listArgs));
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
