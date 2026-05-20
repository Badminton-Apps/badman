import { Player, RankingLastPlace, RankingSystem } from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { NotFoundException } from "@nestjs/common";
import {
  Args,
  Field,
  ID,
  Int,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { PlayerLoaderService } from "../../loaders";
import { ListArgs } from "../../utils";

@ObjectType()
export class PagedLastRankingPlace {
  @Field(() => Int)
  count?: number;

  @Field(() => [RankingLastPlace])
  rows?: RankingLastPlace[];
}

@Resolver(() => RankingLastPlace)
export class LastRankingPlaceResolver {
  constructor(
    private readonly rankingSystemService: RankingSystemService,
    private readonly playerLoader: PlayerLoaderService
  ) {}

  @Query(() => RankingLastPlace)
  async rankingLastPlace(@Args("id", { type: () => ID }) id: string): Promise<RankingLastPlace> {
    const lastRankingPlace = await RankingLastPlace.findByPk(id);

    if (!lastRankingPlace) {
      throw new NotFoundException(id);
    }
    return lastRankingPlace;
  }

  @Query(() => [RankingLastPlace])
  async rankingLastPlaces(@Args() listArgs: ListArgs): Promise<RankingLastPlace[]> {
    return RankingLastPlace.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => RankingSystem)
  async rankingSystem(@Parent() rankingPlace: RankingLastPlace): Promise<RankingSystem> {
    const system = await this.rankingSystemService.getById(rankingPlace.systemId);
    if (!system) {
      throw new NotFoundException(`${RankingSystem.name}: ${rankingPlace.systemId}`);
    }
    return system;
  }

  @ResolveField(() => Player, { nullable: true })
  async player(@Parent() rankingPlace: RankingLastPlace): Promise<Player | null> {
    return this.playerLoader.load(rankingPlace.playerId);
  }

  // @Mutation(returns => RankingLastPlace)
  // async RankingLastPlace(
  //   @Args('LastRankingPlaceData') LastRankingPlaceData: LastRankingPlaceInput,
  // ): Promise<RankingLastPlace> {
  //   const recipe = await this.recipesService.create(LastRankingPlaceData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async RankingLastPlace(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
