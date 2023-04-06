import {
  AssemblyInput,
  AssemblyOutput,
  AssemblyService,
} from '@badman/backend-assembly';
import { User } from '@badman/backend-authorization';
import {
  Assembly,
  Player,
  PlayerRankingType,
  RankingSystem,
} from '@badman/backend-database';
import { sortPlayers } from '@badman/utils';
import { Logger } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

@Resolver(() => AssemblyOutput)
export class AssemblyResolver {
  private readonly logger = new Logger(AssemblyResolver.name);
  constructor(private assemblyService: AssemblyService) {}

  @Query(() => AssemblyOutput, {
    description: `Validate the assembly\n\r**note**: the levels are the ones from may!`,
  })
  async assemblyValidation(
    @Args('assembly') assembly: AssemblyInput
  ): Promise<AssemblyOutput> {
    return this.assemblyService.fetchAndValidate(
      assembly,
      AssemblyService.defaultValidators()
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
    });

    const system = await RankingSystem.findByPk(assembly.systemId);

    return p
      .map((player) => ({
        ...player.toJSON(),
        single:
          assembly.titularsPlayerData?.find((p) => p.id === player.id)
            ?.rankingPlaces?.[0]?.single ?? system.amountOfLevels,
        double:
          assembly.titularsPlayerData?.find((p) => p.id === player.id)
            ?.rankingPlaces?.[0]?.double ?? system.amountOfLevels,
        mix:
          assembly.titularsPlayerData?.find((p) => p.id === player.id)
            ?.rankingPlaces?.[0]?.mix ?? system.amountOfLevels,
      }))
      ?.sort(sortPlayers);
  }

  @ResolveField(() => [PlayerRankingType])
  async baseTeamPlayers(
    @Parent() assembly: AssemblyOutput
  ): Promise<PlayerRankingType[]> {
    if (!assembly.basePlayersData) return [];

    const p = await Player.findAll({
      where: {
        id: assembly.basePlayersData?.map((player) => player.id),
      },
    });

    return p
      .map((player) => ({
        ...player.toJSON(),
        single: assembly.basePlayersData?.find((p) => p.id === player.id)
          ?.single,
        double: assembly.basePlayersData?.find((p) => p.id === player.id)
          ?.double,
        mix: assembly.basePlayersData?.find((p) => p.id === player.id)?.mix,
      }))
      ?.sort(sortPlayers);
  }

  @Mutation(() => Boolean)
  async createAssembly(
    @User() user: Player,
    @Args('assembly') assembly: AssemblyInput
  ) {
    if (!assembly) throw new Error('Assembly is required');
    if (!assembly.encounterId) throw new Error('Encounter is required');
    if (!assembly.teamId) throw new Error('Team is required');

    this.logger.debug(
      `Saving assembly for encounter ${assembly.encounterId} and team ${assembly.teamId}, by player ${user.fullName}`
    );

    try {
      const [assemblyDb, created] = await Assembly.findOrCreate({
        where: {
          encounterId: assembly.encounterId,
          teamId: assembly.teamId,
          playerId: user.id,
        },
        defaults: {
          captainId: assembly?.captainId,
          description: assembly?.description,
          encounterId: assembly.encounterId,
          teamId: assembly.teamId,
          playerId: user.id,
          assembly: {
            single1: assembly?.single1 || null,
            single2: assembly?.single2 || null,
            single3: assembly?.single3 || null,
            single4: assembly?.single4 || null,
            double1: assembly?.double1 || [],
            double2: assembly?.double2 || [],
            double3: assembly?.double3 || [],
            double4: assembly?.double4 || [],
            subtitudes: assembly?.subtitudes || [],
          },
        },
      });

      if (!created) {
        await assemblyDb.update({
          captainId: assembly?.captainId,
          description: assembly?.description,
          encounterId: assembly.encounterId,
          teamId: assembly.teamId,
          playerId: user.id,
          assembly: {
            single1: assembly?.single1 || null,
            single2: assembly?.single2 || null,
            single3: assembly?.single3 || null,
            single4: assembly?.single4 || null,
            double1: assembly?.double1 || [],
            double2: assembly?.double2 || [],
            double3: assembly?.double3 || [],
            double4: assembly?.double4 || [],
            subtitudes: assembly?.subtitudes || [],
          },
        });
      }

      return true;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }
}
