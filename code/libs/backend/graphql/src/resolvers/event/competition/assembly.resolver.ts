import {
  AssemblyInput,
  AssemblyOutput,
  AssemblyValidationService,
} from '@badman/backend-assembly';
import { Player, PlayerRankingType } from '@badman/backend-database';
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
  teamPlayers(@Parent() draw: AssemblyOutput): PlayerRankingType[] {
    return draw.baseTeamPlayersData?.map((player) => ({
      ...player.toJSON(),
      single: player.rankingPlaces?.[0].single,
      double: player.rankingPlaces?.[0].double,
      mix: player.rankingPlaces?.[0].mix,
    }));
  }

  @ResolveField(() => [PlayerRankingType])
  async baseTeamPlayers(
    @Parent() draw: AssemblyOutput
  ): Promise<PlayerRankingType[]> {
    const p = await Player.findAll({
      where: {
        id: draw.teamPlayersData?.map((player) => player.id),
      },
    });

    return p.map((player) => ({
      ...player.toJSON(),
      single: draw.teamPlayersData?.find((p) => p.id === player.id)?.single,
      double: draw.teamPlayersData?.find((p) => p.id === player.id)?.double,
      mix: draw.teamPlayersData?.find((p) => p.id === player.id)?.mix,
    }));
  }
}
