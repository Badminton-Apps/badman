import {
  Player,
  RankingPlace,
  RankingPlaceNewInput,
  RankingPlaceUpdateInput,
  RankingPlaceWriterService,
  RankingSystem,
} from "@badman/backend-database";
import { RankingSystemService } from "@badman/backend-ranking";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { Sequelize } from "sequelize-typescript";
import { User } from "@badman/backend-authorization";
import { ListArgs } from "../../utils";
import { getRankingProtected } from "@badman/utils";

@Resolver(() => RankingPlace)
export class RankingPlaceResolver {
  private readonly logger = new Logger(RankingPlaceResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private readonly rankingSystemService: RankingSystemService,
    private readonly writer: RankingPlaceWriterService
  ) {}

  @Query(() => RankingPlace)
  async rankingPlace(@Args("id", { type: () => ID }) id: string): Promise<RankingPlace> {
    let place = await RankingPlace.findByPk(id);

    if (!place) {
      throw new NotFoundException(id);
    }

    if (!place.single || !place.double || !place.mix) {
      // if one of the levels is not set, get the default from the system
      const system = await this.rankingSystemService.getById(place.systemId);
      if (!system) {
        throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
      }

      place = getRankingProtected(place, system);
    }

    return place;
  }

  @Query(() => [RankingPlace])
  async rankingPlaces(@Args() listArgs: ListArgs): Promise<RankingPlace[]> {
    const places = await RankingPlace.findAll(ListArgs.toFindOptions(listArgs));

    // if one of the levels is not set, get the default from the system
    for (let place of places) {
      if (!place.single || !place.double || !place.mix) {
        const system = await this.rankingSystemService.getById(place.systemId);

        if (!system) {
          throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
        }

        place = getRankingProtected(place, system);
      }
    }

    return places;
  }

  @ResolveField(() => RankingSystem)
  async rankingSystem(@Parent() rankingPlace: RankingPlace): Promise<RankingSystem | null> {
    return this.rankingSystemService.getById(rankingPlace.systemId);
  }

  @ResolveField(() => Player)
  async player(@Parent() rankingPlace: RankingPlace): Promise<Player> {
    return rankingPlace.getPlayer();
  }

  @Mutation(() => RankingPlace)
  async updateRankingPlace(
    @User() user: Player,
    @Args("data")
    updateRankingPlaceData: RankingPlaceUpdateInput
  ) {
    if (
      !(await user.hasAnyPermission([
        `${updateRankingPlaceData.playerId}_edit:player`,
        "edit-any:player",
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const existing = await RankingPlace.findByPk(updateRankingPlaceData.id, { transaction });

      if (!existing) {
        throw new NotFoundException(`${RankingPlace.name}: ${updateRankingPlaceData.id}`);
      }

      const system = await this.rankingSystemService.getById(existing.systemId);
      if (!system) {
        throw new NotFoundException(`${RankingSystem.name}: ${existing.systemId}`);
      }

      // Merge input with existing row, then silently clamp via writer (US1.3 / D6)
      const merged: Partial<RankingPlace> = { ...existing.toJSON(), ...updateRankingPlaceData };
      const result = await this.writer.upsertOne(merged, system, { transaction });

      await transaction.commit();
      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => RankingPlace)
  async newRankingPlace(
    @User() user: Player,
    @Args("data") newRankingPlaceData: RankingPlaceNewInput
  ) {
    if (
      !(await user.hasAnyPermission([
        `${newRankingPlaceData.playerId}_edit:player`,
        "edit-any:player",
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const player = await Player.findByPk(newRankingPlaceData.playerId, { transaction });

      if (!player) {
        throw new NotFoundException(`${Player.name}: ${newRankingPlaceData.playerId}`);
      }

      const system = await this.rankingSystemService.getById(newRankingPlaceData.systemId);
      if (!system) {
        throw new NotFoundException(`${RankingSystem.name}: ${newRankingPlaceData.systemId}`);
      }

      // Silently clamp via writer (US1.3 / D6 — no validation error returned)
      const place = await this.writer.upsertOne(newRankingPlaceData, system, { transaction });

      await transaction.commit();
      return place;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async removeRankingPlace(@User() user: Player, @Args("id", { type: () => ID }) id: string) {
    const rankingPlace = await RankingPlace.findByPk(id);

    if (!rankingPlace) {
      throw new NotFoundException(`${RankingPlace.name}: ${id}`);
    }

    if (
      !(await user.hasAnyPermission([`${rankingPlace.playerId}_edit:player`, "edit-any:player"]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      // Destroy via writer — re-points RankingLastPlace snapshot
      await this.writer.remove(rankingPlace, { transaction });

      await transaction.commit();
      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
}
