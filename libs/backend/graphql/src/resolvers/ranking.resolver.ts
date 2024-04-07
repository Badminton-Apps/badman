import { RankingSystem } from '@badman/models';
import { Logger, NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class RankingResolver {
  private readonly logger = new Logger(RankingResolver.name);
  
  @Query(() => RankingSystem)
  async rankingSystem(
    @Args('id', { type: () => ID, nullable: true }) id?: string,
    @Args('isServer', { type: () => Boolean, nullable: true })
    isServer?: boolean,
  ): Promise<RankingSystem> {
    const where = id ? { id } : { primary: true };
    const rankingSystem = await RankingSystem.findOne({ where });

    this.logger.log(`Found ranking system with id: ${id}, isServer: ${isServer}`);

    if (!rankingSystem) {
      throw new NotFoundException(id);
    }
    return rankingSystem;
  }
}
