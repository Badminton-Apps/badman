import { AssemblyInput, AssemblyOutput, AssemblyValidationService } from '@badman/backend-assembly';
import { User } from '@badman/backend-authorization';
import {
  Assembly,
  Player,
  PlayerRankingType,
  RankingPlace,
  RankingSystem,
} from '@badman/backend-database';
import { getRankingProtected, sortPlayers } from '@badman/utils';
import { Logger, NotFoundException } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => AssemblyOutput)
export class AssemblyResolver {
  private readonly logger = new Logger(AssemblyResolver.name);
  constructor(private assemblyService: AssemblyValidationService) {}

  @Query(() => AssemblyOutput, {
    description: `Validate the assembly\n\r**note**: the levels are the ones from may!`,
  })
  async assemblyValidation(@Args('assembly') assembly: AssemblyInput): Promise<AssemblyOutput> {
    return this.assemblyService.fetchAndValidate(
      assembly,
      AssemblyValidationService.defaultValidators(),
    );
  }

  @ResolveField(() => [PlayerRankingType])
  async titularsPlayers(@Parent() assembly: AssemblyOutput): Promise<PlayerRankingType[]> {
    if (!assembly.titularsPlayerData) return [];

    const p = await Player.findAll({
      where: {
        id: assembly?.titularsPlayerData
          ?.filter((player) => player != null || player != undefined)
          ?.map((player) => player.id),
      },
    });

    const system = await RankingSystem.findByPk(assembly.systemId);

    if (!system) {
      throw new NotFoundException(`${RankingSystem.name}: ${assembly.systemId}`);
    }

    return p
      .map((player) => {
        const place = getRankingProtected(
          assembly.titularsPlayerData?.find((p) => p.id === player.id)?.rankingPlaces?.[0] ??
            ({} as RankingPlace),
          system,
        );

        return {
          ...player.toJSON(),
          single: place?.single,
          double: place?.double,
          mix: place?.mix,
        };
      })
      ?.sort(sortPlayers);
  }

  @ResolveField(() => [PlayerRankingType])
  async baseTeamPlayers(@Parent() assembly: AssemblyOutput): Promise<PlayerRankingType[]> {
    if (!assembly.basePlayersData) return [];

    const p = await Player.findAll({
      where: {
        id: (assembly.basePlayersData?.map((player) => player.id) ?? []) as string[],
      },
    });

    return p
      .map((player) => ({
        ...player.toJSON(),
        single: assembly.basePlayersData?.find((p) => p.id === player.id)?.single,
        double: assembly.basePlayersData?.find((p) => p.id === player.id)?.double,
        mix: assembly.basePlayersData?.find((p) => p.id === player.id)?.mix,
      }))
      ?.sort(sortPlayers);
  }

  @Mutation(() => Boolean)
  async createAssembly(@User() user: Player, @Args('assembly') assembly: AssemblyInput) {
    if (!assembly) throw new Error('Assembly is required');
    if (!assembly.encounterId) throw new Error('Encounter is required');
    if (!assembly.teamId) throw new Error('Team is required');

    this.logger.debug(
      `Saving assembly for encounter ${assembly.encounterId} and team ${assembly.teamId}, by player ${user.fullName}`,
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
            single1: assembly?.single1 || undefined,
            single2: assembly?.single2 || undefined,
            single3: assembly?.single3 || undefined,
            single4: assembly?.single4 || undefined,
            double1: assembly?.double1 || [],
            double2: assembly?.double2 || [],
            double3: assembly?.double3 || [],
            double4: assembly?.double4 || [],
            subtitudes: assembly?.subtitudes || [],
          },
        } as Assembly,
      });

      if (!created) {
        await assemblyDb.update({
          captainId: assembly?.captainId,
          description: assembly?.description,
          encounterId: assembly.encounterId,
          teamId: assembly.teamId,
          playerId: user.id,
          assembly: {
            single1: assembly?.single1 || undefined,
            single2: assembly?.single2 || undefined,
            single3: assembly?.single3 || undefined,
            single4: assembly?.single4 || undefined,
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
