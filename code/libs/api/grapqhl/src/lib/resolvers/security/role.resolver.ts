import { Role } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../utils';

@Resolver(() => Role)
export class RoleResolver {
  @Query(() => Role)
  async role(@Args('id', { type: () => ID }) id: string): Promise<Role> {
    let role = await Role.findByPk(id);

    if (!role) {
      role = await Role.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!role) {
      throw new NotFoundException(id);
    }
    return role;
  }

  @Query(() => [Role])
  async roles(@Args() listArgs: ListArgs): Promise<Role[]> {
    return Role.findAll(ListArgs.toFindOptions(listArgs));
  }

  // @Mutation(returns => Role)
  // async addRole(
  //   @Args('newRoleData') newRoleData: NewRoleInput,
  // ): Promise<Role> {
  //   const recipe = await this.recipesService.create(newRoleData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeRole(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
