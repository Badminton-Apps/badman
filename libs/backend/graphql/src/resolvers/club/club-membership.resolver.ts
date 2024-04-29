import { User } from '@badman/backend-authorization';
import { Club, ClubPlayerMembership, Player } from '@badman/backend-database';
import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  Args,
  Field,
  Int,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../utils';

@ObjectType()
export class PagedClubPlayerMembership {
  @Field(() => Int)
  count?: number;

  @Field(() => [ClubPlayerMembership])
  rows?: ClubPlayerMembership[];
}

@Resolver(() => ClubPlayerMembership)
export class ClubPlayerMembershipsResolver {
  private readonly logger = new Logger(ClubPlayerMembershipsResolver.name);

  @Query(() => PagedClubPlayerMembership)
  async clubPlayerMemberships(
    @User() user: Player,
    @Args() listArgs: ListArgs,
  ): Promise<{ count: number; rows: ClubPlayerMembership[] }> {
    if (!user || !(await user.hasAnyPermission(['change:transfer']))) {
      throw new UnauthorizedException(`You do not have permission to create a player`);
    }

    return ClubPlayerMembership.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => Club)
  async club(@Parent() membership: ClubPlayerMembership): Promise<Club> {
    return membership.getClub();
  }

  @ResolveField(() => Player)
  async player(@Parent() membership: ClubPlayerMembership): Promise<Player> {
    return membership.getPlayer();
  }
}
