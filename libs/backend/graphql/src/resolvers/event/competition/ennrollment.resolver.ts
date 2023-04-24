import {
  EnrollmentInput,
  EnrollmentOutput,
  EnrollmentValidationService,
} from '@badman/backend-enrollment';
import { Logger } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => EnrollmentOutput)
export class EnrollmentResolver {
  private readonly logger = new Logger(EnrollmentResolver.name);
  constructor(private enrollmentService: EnrollmentValidationService) {}

  @Query(() => EnrollmentOutput, {
    description: `Validate the enrollment\n\r**note**: the levels are the ones from may!`,
  })
  async enrollmentValidation(
    @Args('enrollment') enrollment: EnrollmentInput
  ): Promise<EnrollmentOutput> {
    return this.enrollmentService.fetchAndValidate(
      enrollment,
      EnrollmentValidationService.defaultValidators()
    );
  }

  // @ResolveField(() => [PlayerRankingType])
  // async titularsPlayers(
  //   @Parent() enrollment: EnrollmentOutput
  // ): Promise<PlayerRankingType[]> {
  //   if (!enrollment.titularsPlayerData) return [];

  //   const p = await Player.findAll({
  //     where: {
  //       id: enrollment?.titularsPlayerData
  //         ?.filter((player) => player != null || player != undefined)
  //         ?.map((player) => player.id),
  //     },
  //   });

  //   const system = await RankingSystem.findByPk(enrollment.systemId);

  //   return p
  //     .map((player) => ({
  //       ...player.toJSON(),
  //       single:
  //         enrollment.titularsPlayerData?.find((p) => p.id === player.id)
  //           ?.rankingPlaces?.[0]?.single ?? system.amountOfLevels,
  //       double:
  //         enrollment.titularsPlayerData?.find((p) => p.id === player.id)
  //           ?.rankingPlaces?.[0]?.double ?? system.amountOfLevels,
  //       mix:
  //         enrollment.titularsPlayerData?.find((p) => p.id === player.id)
  //           ?.rankingPlaces?.[0]?.mix ?? system.amountOfLevels,
  //     }))
  //     ?.sort(sortPlayers);
  // }

  // @ResolveField(() => [PlayerRankingType])
  // async baseTeamPlayers(
  //   @Parent() enrollment: EnrollmentOutput
  // ): Promise<PlayerRankingType[]> {
  //   if (!enrollment.basePlayersData) return [];

  //   const p = await Player.findAll({
  //     where: {
  //       id: enrollment.basePlayersData?.map((player) => player.id),
  //     },
  //   });

  //   return p
  //     .map((player) => ({
  //       ...player.toJSON(),
  //       single: enrollment.basePlayersData?.find((p) => p.id === player.id)
  //         ?.single,
  //       double: enrollment.basePlayersData?.find((p) => p.id === player.id)
  //         ?.double,
  //       mix: enrollment.basePlayersData?.find((p) => p.id === player.id)?.mix,
  //     }))
  //     ?.sort(sortPlayers);
  // }

  // @Mutation(() => Boolean)
  // async createEnrollment(
  //   @User() user: Player,
  //   @Args('enrollment') enrollment: EnrollmentInput
  // ) {
  //   if (!enrollment) throw new Error('Enrollment is required');
  //   if (!enrollment.encounterId) throw new Error('Encounter is required');
  //   if (!enrollment.teamId) throw new Error('Team is required');

  //   this.logger.debug(
  //     `Saving enrollment for encounter ${enrollment.encounterId} and team ${enrollment.teamId}, by player ${user.fullName}`
  //   );

  //   try {
  //     const [enrollmentDb, created] = await Enrollment.findOrCreate({
  //       where: {
  //         encounterId: enrollment.encounterId,
  //         teamId: enrollment.teamId,
  //         playerId: user.id,
  //       },
  //       defaults: {
  //         captainId: enrollment?.captainId,
  //         description: enrollment?.description,
  //         encounterId: enrollment.encounterId,
  //         teamId: enrollment.teamId,
  //         playerId: user.id,
  //         enrollment: {
  //           single1: enrollment?.single1 || null,
  //           single2: enrollment?.single2 || null,
  //           single3: enrollment?.single3 || null,
  //           single4: enrollment?.single4 || null,
  //           double1: enrollment?.double1 || [],
  //           double2: enrollment?.double2 || [],
  //           double3: enrollment?.double3 || [],
  //           double4: enrollment?.double4 || [],
  //           subtitudes: enrollment?.subtitudes || [],
  //         },
  //       },
  //     });

  //     if (!created) {
  //       await enrollmentDb.update({
  //         captainId: enrollment?.captainId,
  //         description: enrollment?.description,
  //         encounterId: enrollment.encounterId,
  //         teamId: enrollment.teamId,
  //         playerId: user.id,
  //         enrollment: {
  //           single1: enrollment?.single1 || null,
  //           single2: enrollment?.single2 || null,
  //           single3: enrollment?.single3 || null,
  //           single4: enrollment?.single4 || null,
  //           double1: enrollment?.double1 || [],
  //           double2: enrollment?.double2 || [],
  //           double3: enrollment?.double3 || [],
  //           double4: enrollment?.double4 || [],
  //           subtitudes: enrollment?.subtitudes || [],
  //         },
  //       });
  //     }

  //     return true;
  //   } catch (error) {
  //     this.logger.error(error);
  //     return false;
  //   }
  // }
}
