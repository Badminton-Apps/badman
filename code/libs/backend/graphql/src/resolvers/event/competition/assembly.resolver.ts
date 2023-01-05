import {
  AssemblyInput,
  AssemblyOutput,
  AssemblyValidationService,
} from '@badman/backend-assembly';
import {
  Player,
  PlayerRankingType,
  RankingLastPlace,
  RankingSystem,
} from '@badman/backend-database';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => AssemblyOutput)
export class AssemblyResolver {
  constructor(private assemblyService: AssemblyValidationService) {}

  @Query(() => AssemblyOutput, {
    description: `Validate the assembly\n\r**note**: the levels are the ones from may!`,
  })
  async assemblyValidation(
    @Args('assembly') assembly: AssemblyInput
  ): Promise<AssemblyOutput> {
    return this.assemblyService.fetchAndValidate(
      assembly,
      AssemblyValidationService.defaultValidators()
    );
  }

  @ResolveField(() => [PlayerRankingType])
  async titularsPlayers(
    @Parent() assembly: AssemblyOutput
  ): Promise<PlayerRankingType[]> {
    if (!assembly.titularsPlayerData) return [];

    const p = await Player.findAll({
      where: {
        id: assembly?.titularsPlayerData
          ?.filter((player) => player != null || player != undefined)
          ?.map((player) => player.id),
      },
      include: [
        {
          model: RankingLastPlace,
          attributes: ['single', 'double', 'mix'],
          where: {
            systemId: assembly.systemId,
          },
          required: false,
        },
      ],
    });

    const system = await RankingSystem.findByPk(assembly.systemId);

    return p.map((player) => ({
      ...player.toJSON(),
      single: player.rankingLastPlaces?.[0]?.single ?? system.amountOfLevels,
      double: player.rankingLastPlaces?.[0]?.double ?? system.amountOfLevels,
      mix: player.rankingLastPlaces?.[0]?.mix ?? system.amountOfLevels,
    }));
  }

  @ResolveField(() => [PlayerRankingType])
  async baseTeamPlayers(
    @Parent() draw: AssemblyOutput
  ): Promise<PlayerRankingType[]> {
    if (!draw.basePlayersData) return [];

    const p = await Player.findAll({
      where: {
        id: draw.basePlayersData?.map((player) => player.id),
      },
    });

    return p.map((player) => ({
      ...player.toJSON(),
      single: draw.basePlayersData?.find((p) => p.id === player.id)?.single,
      double: draw.basePlayersData?.find((p) => p.id === player.id)?.double,
      mix: draw.basePlayersData?.find((p) => p.id === player.id)?.mix,
    }));
  }
}
