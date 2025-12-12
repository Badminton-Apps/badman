import { AssemblyInput, AssemblyOutput, AssemblyValidationService } from "@badman/backend-assembly";
import { User } from "@badman/backend-authorization";
import {
  Assembly,
  Player,
  PlayerRankingType,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
} from "@badman/backend-database";
import { getRankingProtected, sortPlayers } from "@badman/utils";
import { Logger, NotFoundException } from "@nestjs/common";
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver(() => AssemblyOutput)
export class AssemblyResolver {
  private readonly logger = new Logger(AssemblyResolver.name);
  constructor(private assemblyService: AssemblyValidationService) {}

  @Query(() => AssemblyOutput, {
    description: `Validate the assembly\n\r**note**: the levels are the ones from may!`,
  })
  async validateAssembly(
    @User() user: Player,
    @Args("assembly") assembly: AssemblyInput
  ): Promise<AssemblyOutput> {
    return this.assemblyService.validate(assembly, { playerId: user.id, teamId: assembly.teamId });
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
      include: [RankingLastPlace],
    });

    const system = await RankingSystem.findByPk(assembly.systemId);

    if (!system) {
      throw new NotFoundException(`${RankingSystem.name}: ${assembly.systemId}`);
    }

    const results = await Promise.all(
      p.map(async (player) => {
        const ranking = await player.getCurrentRanking(assembly.systemId ?? "");
        const place = getRankingProtected(ranking as RankingPlace, system);

        return {
          ...player.toJSON(),
          single: place?.single,
          double: place?.double,
          mix: place?.mix,
        };
      })
    );

    return results.sort(sortPlayers);
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

  @Mutation(() => Assembly)
  async createAssembly(@User() user: Player, @Args("assembly") assembly: AssemblyInput) {
    if (!assembly) throw new Error("Assembly is required");
    if (!assembly.encounterId) throw new Error("Encounter is required");
    if (!assembly.teamId) throw new Error("Team is required");
    if (!user?.id) throw new Error("User is required");

    this.logger.debug(
      `Saving assembly for encounter ${assembly.encounterId} and team ${assembly.teamId}, by player ${user.fullName}`
    );

    try {
      const [assemblyDb, created] = await Assembly.findOrCreate({
        where: {
          encounterId: assembly.encounterId,
          teamId: assembly.teamId,
        },
        defaults: {
          captainId: assembly?.captainId,
          description: assembly?.description,
          encounterId: assembly.encounterId,
          isComplete: assembly.isComplete,
          teamId: assembly.teamId,
          playerId: user.id,
          assembly: {
            single1: assembly?.single1 || undefined,
            single2: assembly?.single2 || undefined,
            single3: assembly?.single3 || undefined,
            single4: assembly?.single4 || undefined,
            double1: (assembly?.double1 || []).filter((id) => id != null),
            double2: (assembly?.double2 || []).filter((id) => id != null),
            double3: (assembly?.double3 || []).filter((id) => id != null),
            double4: (assembly?.double4 || []).filter((id) => id != null),
            subtitudes: assembly?.subtitudes || [],
          },
        } as Assembly,
      });

      if (!created) {
        this.logger.debug(
          `UPDATED: Assembly for encounter with ID ${assembly.encounterId} existed in the database and will be updated`
        );

        // Build update object with only provided fields
        const updateData: Partial<Assembly> = {
          playerId: user.id, // Always update the player who made the change
        };

        // Only update fields that are explicitly provided
        if (assembly.captainId !== undefined) updateData.captainId = assembly.captainId;
        if (assembly.description !== undefined) updateData.description = assembly.description;
        if (assembly.encounterId !== undefined) updateData.encounterId = assembly.encounterId;
        if (assembly.teamId !== undefined) updateData.teamId = assembly.teamId;
        if (assembly.isComplete !== undefined) updateData.isComplete = assembly.isComplete;

        // Handle assembly data - ensure all keys are always present
        const currentAssembly = assemblyDb.assembly || {};

        // Start with a complete structure with all required keys
        const updatedAssembly = {
          single1: currentAssembly.single1 || undefined,
          single2: currentAssembly.single2 || undefined,
          single3: currentAssembly.single3 || undefined,
          single4: currentAssembly.single4 || undefined,
          double1: currentAssembly.double1 || [],
          double2: currentAssembly.double2 || [],
          double3: currentAssembly.double3 || [],
          double4: currentAssembly.double4 || [],
          subtitudes: currentAssembly.subtitudes || [],
        };

        // Only update fields that are explicitly provided
        if (assembly.single1 !== undefined) updatedAssembly.single1 = assembly.single1;
        if (assembly.single2 !== undefined) updatedAssembly.single2 = assembly.single2;
        if (assembly.single3 !== undefined) updatedAssembly.single3 = assembly.single3;
        if (assembly.single4 !== undefined) updatedAssembly.single4 = assembly.single4;
        if (assembly.double1 !== undefined)
          updatedAssembly.double1 = (assembly.double1 || []).filter((id) => id != null);
        if (assembly.double2 !== undefined)
          updatedAssembly.double2 = (assembly.double2 || []).filter((id) => id != null);
        if (assembly.double3 !== undefined)
          updatedAssembly.double3 = (assembly.double3 || []).filter((id) => id != null);
        if (assembly.double4 !== undefined)
          updatedAssembly.double4 = (assembly.double4 || []).filter((id) => id != null);
        if (assembly.subtitudes !== undefined)
          updatedAssembly.subtitudes = assembly.subtitudes || [];

        updateData.assembly = updatedAssembly;

        return assemblyDb.update(updateData);
      }

      this.logger.debug(
        `CREATED: A new assembly for encounter with ID ${assembly.encounterId} was created.`
      );
      return assemblyDb;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }
}
