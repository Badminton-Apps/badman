import { User } from "@badman/backend-authorization";
import {
  EncounterValidationInput,
  EncounterValidationOutput,
  EncounterValidationService,
} from "@badman/backend-change-encounter";
import {
  Assembly,
  Comment,
  DrawCompetition,
  EncounterChange,
  EncounterCompetition,
  Game,
  Location,
  Player,
  RankingSystem,
  Team,
  updateEncounterCompetitionInput,
  updateTempTeamCaptainInput,
} from "@badman/backend-database";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { PointsService } from "@badman/backend-ranking";
import { InjectQueue } from "@nestjs/bull";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import {
  Args,
  Field,
  ID,
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Queue } from "bull";
import { Sequelize } from "sequelize-typescript";
import { QueryTypes, Op } from "sequelize";
import { ListArgs } from "../../../utils";

@ObjectType()
export class PagedEncounterCompetition {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterCompetition])
  rows?: EncounterCompetition[];
}

@ObjectType()
export class PlayerEncounterCompetition {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterCompetition])
  rows?: EncounterCompetition[];
}

@Resolver(() => EncounterCompetition)
export class EncounterCompetitionResolver {
  private readonly logger = new Logger(EncounterCompetitionResolver.name);

  constructor(
    @InjectQueue(SyncQueue) private syncQueue: Queue,
    private _sequelize: Sequelize,
    private _pointService: PointsService,
    private encounterValidationService: EncounterValidationService
  ) {}

  @Query(() => EncounterCompetition)
  async encounterCompetition(
    @Args("id", { type: () => ID }) id: string
  ): Promise<EncounterCompetition> {
    const encounterCompetition = await EncounterCompetition.findByPk(id);

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => [EncounterCompetition])
  async playerEncounterCompetitions(
    @User() user: Player,
    @Args() listArgs: ListArgs
  ): Promise<EncounterCompetition[]> {
    try {
      // Use the provided playerId or fall back to the logged-in user's ID
      const targetPlayerId = user?.id;

      this.logger.log(
        `[playerEncounterCompetitions] Query for player ${targetPlayerId} - take: ${listArgs.take}, skip: ${listArgs.skip}, order: ${JSON.stringify(listArgs.order)}`
      );

      if (!targetPlayerId) {
        this.logger.warn("[playerEncounterCompetitions] No player ID found");
        return [];
      }

      // Execute the raw query with proper error handling
      const queryResult = await this._sequelize.query(
        `
        SELECT DISTINCT ec.id, ec."date"
        FROM event."EncounterCompetitions" ec
        LEFT JOIN "Teams" t_home ON ec."homeTeamId" = t_home.id
        LEFT JOIN "Teams" t_away ON ec."awayTeamId" = t_away.id
        LEFT JOIN "TeamPlayerMemberships" tpm_home ON t_home.id = tpm_home."teamId" AND tpm_home."playerId" = :playerId
        LEFT JOIN "TeamPlayerMemberships" tpm_away ON t_away.id = tpm_away."teamId" AND tpm_away."playerId" = :playerId
        LEFT JOIN event."Games" g ON g."linkId" = ec.id AND g."linkType" = 'competition'
        LEFT JOIN event."GamePlayerMemberships" gpm ON g.id = gpm."gameId" AND gpm."playerId" = :playerId
        WHERE ec."date" IS NOT NULL
          AND (
            -- 1. Game Leader
            ec."gameLeaderId" = :playerId
            OR
            -- 2. Temp Captains
            ec."tempHomeCaptainId" = :playerId
            OR
            ec."tempAwayCaptainId" = :playerId
            OR
            -- 3. Team Captains
            t_home."captainId" = :playerId
            OR
            t_away."captainId" = :playerId
            OR
            -- 4. Team Members (active memberships)
            (tpm_home."playerId" = :playerId 
             AND tpm_home."start" <= ec."date"
             AND (tpm_home."end" IS NULL OR tpm_home."end" >= ec."date"))
            OR
            (tpm_away."playerId" = :playerId
             AND tpm_away."start" <= ec."date"
             AND (tpm_away."end" IS NULL OR tpm_away."end" >= ec."date"))
            OR
            -- 5. Game Players
            gpm."playerId" = :playerId
          )
          AND (
            -- Must have exactly 8 completed games
            SELECT COUNT(*)
            FROM event."Games" g_count
            WHERE g_count."linkId" = ec.id 
              AND g_count."linkType" = 'competition'
              AND g_count."winner" IS NOT NULL 
              AND g_count."winner" != 0
          ) = 8
      `,
        {
          replacements: { playerId: targetPlayerId },
          type: QueryTypes.SELECT,
        }
      );

      // Safely handle the query results
      if (!Array.isArray(queryResult)) {
        this.logger.error("[playerEncounterCompetitions] Query result is not an array", {
          resultType: typeof queryResult,
          hasStack: "stack" in (queryResult || {}),
        });
        return [];
      }

      // Extract encounter IDs from the results
      const encounterIds: string[] = [];
      for (const row of queryResult) {
        if (row && typeof row === "object" && "id" in row && typeof row.id === "string") {
          encounterIds.push(row.id);
        }
      }

      if (encounterIds.length === 0) {
        this.logger.log("[playerEncounterCompetitions] No encounters found for player");
        return [];
      }

      // Set default values for pagination
      const take = listArgs.take || 3;
      const skip = listArgs.skip || 0;
      const order = listArgs.order || [{ field: "date", direction: "DESC" }];

      // Create find options with validated parameters
      const findOptions = ListArgs.toFindOptions({
        ...listArgs,
        take,
        skip,
        order,
      });

      // Fetch the actual encounter records
      const encounters = await EncounterCompetition.findAll({
        ...findOptions,
        where: {
          id: {
            [Op.in]: encounterIds,
          },
        },
      });

      this.logger.log(
        `[playerEncounterCompetitions] Returning ${encounters.length} encounters for player ${targetPlayerId}`
      );
      return encounters;
    } catch (error) {
      this.logger.error("[playerEncounterCompetitions] Error occurred:", error);
      // Always return an empty array instead of letting the error bubble up
      // This prevents Content-Type mismatch issues when clients disconnect
      return [];
    }
  }

  // @Query(() => PagedEncounterCompetition)
  // async encounterCompetitions(
  //   @Args() listArgs: ListArgs,
  // ): Promise<{ count: number; rows: EncounterCompetition[] }> {
  //   return EncounterCompetition.findAndCountAll({
  //     ...ListArgs.toFindOptions(listArgs),
  //     include: [
  //       {
  //         model: Team,
  //         as: 'home',
  //       },
  //       {
  //         model: Team,
  //         as: 'away',
  //       },
  //     ],
  //   });
  // }

  @Query(() => PagedEncounterCompetition)
  async encounterCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EncounterCompetition[] }> {
    try {
      const result = await EncounterCompetition.findAndCountAll({
        include: [
          {
            model: Team,
            as: "home",
          },
          {
            model: Team,
            as: "away",
          },
          {
            model: Game,
            as: "games",
            include: [
              {
                model: Player,
                as: "players",
                attributes: [],
              },
            ],
          },
        ],
        ...ListArgs.toFindOptions(listArgs),
      });

      return result;
    } catch (error) {
      this.logger.error("[encounterCompetitions] Error occurred:", error);
      // Return empty result set instead of letting error bubble up
      return { count: 0, rows: [] };
    }
  }

  @ResolveField(() => DrawCompetition)
  async drawCompetition(
    @Parent() encounter: EncounterCompetition
  ): Promise<DrawCompetition | null> {
    try {
      return await encounter.getDrawCompetition();
    } catch (error) {
      this.logger.debug(
        "[drawCompetition] Client disconnected or error occurred:",
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  @ResolveField(() => Location)
  async location(@Parent() encounter: EncounterCompetition): Promise<Location | null> {
    try {
      return await encounter.getLocation();
    } catch (error) {
      this.logger.debug(
        "[location] Client disconnected or error occurred:",
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  @ResolveField(() => Team)
  async home(@Parent() encounter: EncounterCompetition): Promise<Team | null> {
    try {
      return await encounter.getHome();
    } catch (error) {
      this.logger.debug(
        "[home] Client disconnected or error occurred:",
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  @ResolveField(() => Team)
  async away(@Parent() encounter: EncounterCompetition): Promise<Team | null> {
    try {
      return await encounter.getAway();
    } catch (error) {
      this.logger.debug(
        "[away] Client disconnected or error occurred:",
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  @ResolveField(() => [Assembly])
  async assemblies(
    @User() user: Player,
    @Parent() encounter: EncounterCompetition,
    @Args() listArgs: ListArgs
  ): Promise<Assembly[]> {
    if (!user?.id) {
      return [];
    }
    return encounter.getAssemblies(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EncounterChange)
  async encounterChange(@Parent() encounter: EncounterCompetition): Promise<EncounterChange> {
    return encounter.getEncounterChange();
  }

  @ResolveField(() => Boolean)
  async isPlayerPlayed(
    @Parent() encounter: EncounterCompetition,
    @Args("playerId", { type: () => ID, nullable: true }) playerId?: string
  ): Promise<boolean> {
    if (!playerId) {
      return false;
    }

    const games = await encounter.getGames({
      include: [
        {
          model: Player,
          as: "players",
        },
      ],
    });
    return games.some((game) => game?.players?.some((player) => player.id === playerId));
  }

  @ResolveField(() => [Game])
  async games(@Parent() encounter: EncounterCompetition): Promise<Game[]> {
    try {
      return await encounter.getGames();
    } catch (error) {
      this.logger.debug(
        "[games] Client disconnected or error occurred:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  @ResolveField(() => Player)
  async gameLeader(@Parent() encounter: EncounterCompetition): Promise<Player | null> {
    try {
      return await encounter.getGameLeader();
    } catch (error) {
      this.logger.debug(
        "[gameLeader] Client disconnected or error occurred:",
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  @ResolveField(() => Player)
  async tempHomeCaptain(@Parent() encounter: EncounterCompetition): Promise<Player> {
    return encounter.getTempHomeCaptain();
  }

  @ResolveField(() => Player)
  async tempAwayCaptain(@Parent() encounter: EncounterCompetition): Promise<Player> {
    return encounter.getTempAwayCaptain();
  }

  @ResolveField(() => Player)
  async enteredBy(@Parent() encounter: EncounterCompetition): Promise<Player> {
    return encounter.getEnteredBy();
  }

  @ResolveField(() => Player)
  async acceptedBy(@Parent() encounter: EncounterCompetition): Promise<Player> {
    return encounter.getAcceptedBy();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeComments(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayComments(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  @ResolveField(() => Comment, { nullable: true })
  async gameLeaderComments(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getGameLeaderComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeCommentsChange(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayCommentsChange(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async confirmComments(@Parent() encounter: EncounterCompetition): Promise<Comment[]> {
    return encounter.getConfirmComments() || [];
  }

  @ResolveField(() => EncounterValidationOutput, {
    description: `Validate the ChangeEncounter`,
  })
  async validateEncounter(
    @User() user: Player,
    @Parent() encounter: EncounterCompetition,
    @Args("validationData", { nullable: true }) data: EncounterValidationInput
  ): Promise<EncounterValidationOutput> {
    return this.encounterValidationService.validate(
      {
        ...data,
        encounterId: encounter.id,
      },
      {
        playerId: user.id,
        teamId: data.teamId,
        clubId: data.clubId,
      }
    );
  }

  @Mutation(() => Boolean)
  async changeDate(
    @User() user: Player,
    @Args("id", { type: () => ID }) id: string,
    @Args("date") date: Date,

    @Args("updateBadman") updateBadman: boolean,
    @Args("updateVisual") updateVisual: boolean,
    @Args("closeChangeRequests") closeChangeRequests: boolean
  ) {
    const encounter = await EncounterCompetition.findByPk(id);

    if (!encounter) {
      throw new NotFoundException(`${EncounterCompetition.name}: ${id}`);
    }

    if (!(await user.hasAnyPermission(["change-any:encounter"]))) {
      throw new UnauthorizedException(`You do not have permission to edit this encounter`);
    }

    if (updateBadman) {
      await encounter.update({ date: date });
    }

    if (updateVisual) {
      await this.syncQueue.add(
        Sync.ChangeDate,
        {
          encounterId: encounter.id,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    }

    if (closeChangeRequests) {
      const change = await encounter.getEncounterChange();
      if (change) {
        await change.update({ accepted: true });
      }
    }

    return true;
  }

  @Mutation(() => Boolean)
  async recalculateEncounterCompetitionRankingPoints(
    @User() user: Player,
    @Args("encounterId", { type: () => ID }) encounterId: string,
    @Args("systemId", { type: () => ID, nullable: true }) systemId: string
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(["re-sync:points"]))) {
      throw new UnauthorizedException(`You do not have permission to sync points`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const where = systemId ? { id: systemId } : { primary: true };
      const system = await RankingSystem.findOne({
        where,
      });

      if (!system) {
        throw new NotFoundException(`${RankingSystem.name} not found for ${systemId || "primary"}`);
      }

      // find all games
      const enc = await EncounterCompetition.findByPk(encounterId, {
        transaction,
      });

      if (!enc) {
        throw new NotFoundException(`${EncounterCompetition.name}  not found for ${encounterId}`);
      }

      const games = await enc.getGames({ transaction });

      for (const game of games) {
        await this._pointService.createRankingPointforGame(system, game, {
          transaction,
        });
      }

      this.logger.log(`Recalculated ${games.length} ranking points for encounter ${encounterId}`);

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async updateGameLeader(
    @Args("encounterId") encounterId: string,
    @Args("gameLeaderId") gameLeaderId: string
  ): Promise<boolean> {
    const transaction = await this._sequelize.transaction();
    try {
      const encounter = await EncounterCompetition.findByPk(encounterId, { transaction });

      if (!encounter) {
        throw new NotFoundException(`${EncounterCompetition.name}: ${encounterId}`);
      }

      await encounter.update({ gameLeaderId }, { transaction }); // Ensure transaction is passed here

      await transaction.commit();
      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async updateTempTeamCaptain(
    @Args("encounterId") encounterId: string,
    @Args("data") updateTempTeamCaptainData: updateTempTeamCaptainInput
  ): Promise<boolean> {
    const transaction = await this._sequelize.transaction();
    try {
      const encounter = await EncounterCompetition.findByPk(encounterId, { transaction });

      if (!encounter) {
        throw new NotFoundException(`${EncounterCompetition.name}: ${encounterId}`);
      }

      await encounter.update(updateTempTeamCaptainData, { transaction });

      await transaction.commit();
      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => EncounterCompetition)
  async updateEncounterCompetition(
    @User() user: Player,
    @Args("encounterId") encounterId: string,
    @Args("data") updateEncounterCompetitionData: updateEncounterCompetitionInput
  ) {
    this.logger.log("Updating encounter record with id:", `${encounterId}`);
    const transaction = await this._sequelize.transaction();
    try {
      const encounter = await EncounterCompetition.findByPk(encounterId, { transaction });

      if (!encounter) {
        throw new NotFoundException(`${EncounterCompetition.name}: ${encounterId}`);
      }

      if (
        !(
          (await user.hasAnyPermission(["change-any:encounter"])) || [
            `change-${encounterId}:encounter`,
          ] ||
          encounter.gameLeaderId === user.id
        )
      ) {
        throw new UnauthorizedException(`You do not have permission to edit this encounter`);
      }

      const encounterChangedToFinished =
        updateEncounterCompetitionData.finished === true && encounter.finished === false;

      const encounterChangedToEntered =
        updateEncounterCompetitionData.enteredOn !== null && encounter.enteredOn === null;

      const shouldUpdateToernooiNL = encounterChangedToFinished && encounterChangedToEntered;

      const result = await encounter.update(updateEncounterCompetitionData, { transaction });

      if (shouldUpdateToernooiNL) {
        await this.syncQueue.add(
          Sync.EnterScores,
          {
            encounterId: encounter.id,
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          }
        );
      }

      await transaction.commit();
      return result.toJSON();
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
}
