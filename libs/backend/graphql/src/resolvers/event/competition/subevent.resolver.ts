import {
  DrawCompetition,
  EventCompetition,
  EventEntry,
  RankingGroup,
  RankingLastPlace,
  RankingSystem,
  SubEventCompetition,
  SubEventCompetitionAverageLevel,
} from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CACHE_TTL } from '@badman/backend-cache';

@Resolver(() => SubEventCompetition)
export class SubEventCompetitionResolver {
  private readonly logger = new Logger(SubEventCompetitionResolver.name);

  constructor(@Inject(CACHE_MANAGER) private readonly _cacheManager: Cache) {}

  @Query(() => SubEventCompetition)
  async subEventCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<SubEventCompetition> {
    const subEventCompetition = await SubEventCompetition.findByPk(id);

    if (!subEventCompetition) {
      throw new NotFoundException(id);
    }
    return subEventCompetition;
  }

  @Query(() => [SubEventCompetition])
  async subEventCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<SubEventCompetition[]> {
    return SubEventCompetition.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EventCompetition)
  async eventCompetition(
    @Parent() subEvent: SubEventCompetition
  ): Promise<EventCompetition> {
    return subEvent.getEventCompetition();
  }

  @ResolveField(() => [DrawCompetition])
  async drawCompetitions(
    @Parent() subEvent: SubEventCompetition,
    @Args() listArgs: ListArgs
  ): Promise<DrawCompetition[]> {
    return subEvent.getDrawCompetitions(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [RankingGroup])
  async rankingGroups(
    @Parent() subEvent: SubEventCompetition
  ): Promise<RankingGroup[]> {
    return subEvent.getRankingGroups();
  }

  @ResolveField(() => [EventEntry])
  async eventEntries(
    @Parent() subEvent: SubEventCompetition
  ): Promise<EventEntry[]> {
    return subEvent.getEventEntries();
  }

  @ResolveField(() => [SubEventCompetitionAverageLevel], {
    complexity: ({ childComplexity }) => childComplexity * 100,
    description: 'Get the average level of the players within sub event',
    nullable: true,
  })
  async averageLevel(
    @Parent() subEvent: SubEventCompetition
  ): Promise<SubEventCompetitionAverageLevel[]> {
    const cacheKey = `subevent-competition-average-level-${subEvent.id}`;
    const cached = await this._cacheManager.get<
      SubEventCompetitionAverageLevel[]
    >(cacheKey);
    if (cached) {
      return cached;
    }

    const avagrages: SubEventCompetitionAverageLevel[] = [];

    // Get the draws and encounters for this sub event
    const draws = await subEvent.getDrawCompetitions();
    const encounters = await Promise.all(
      draws.map((draw) => draw.getEncounterCompetitions())
    ).then((encounters) => encounters.flat());

    // Get all the games for the encounters
    const games = await Promise.all(
      encounters.map((encounter) => encounter.getGames())
    ).then((games) => games.flat());

    // get all players
    const players = await Promise.all(
      games.map((game) => game.getPlayers())
    ).then((players) => players.flat());

    this.logger.debug(`Found ${players.length} players`);

    // With all the games we count how many times a player has played
    // and store this in a map so we can use it later for calculating a weighted average
    // And also create a set of unique players
    const uniquePlayersMale = new Set([
      ...players.filter((p) => p.gender == 'M').map((player) => player.id),
    ]);

    const countPerMale = new Map();
    uniquePlayersMale.forEach((player) => {
      countPerMale.set(player, players.filter((p) => p.id == player).length);
    });

    const countPerFemale = new Map();
    const uniquePlayersFeMale = new Set([
      ...players.filter((p) => p.gender == 'F').map((player) => player.id),
    ]);

    uniquePlayersFeMale.forEach((player) => {
      countPerFemale.set(player, players.filter((p) => p.id == player).length);
    });

    // Get our ranking system
    const primarySystem = await RankingSystem.findOne({
      where: {
        primary: true,
      },
    });

    if (!primarySystem) {
      throw new NotFoundException(
        `${RankingSystem.name}: primary ranking system not found`
      );
    }

    // skip male average calculation if the event is female only
    if (subEvent.eventType !== SubEventTypeEnum.F) {
      // Get the current ranking place for the players
      const avg = await this.getMaleAverages(
        primarySystem,
        uniquePlayersMale,
        countPerMale
      );
      avagrages.push(avg);
    }

    // skip female average calculation if the event is male only
    if (subEvent.eventType !== SubEventTypeEnum.M) {
      const avg = await this.getFemaleAverages(
        primarySystem,
        uniquePlayersFeMale,
        countPerFemale
      );

      avagrages.push(avg);
    }

    // Cache this for a week
    await this._cacheManager.set(cacheKey, avagrages, CACHE_TTL);
    return avagrages;
  }

  /**
   * Get the average level of the female players
   * @param primarySystem the primary ranking system
   * @param uniquePlayersFeMale a set of unique female players
   * @param countPerFemale a map of player id and count of amount of games in the event
   * @returns @memberof SubEventCompetitionResolver
   */
  private async getMaleAverages(
    primarySystem: RankingSystem,
    uniquePlayersMale: Set<string>,
    countPerMale: Map<string, number>
  ) {
    const rankingPlacesMale = await RankingLastPlace.findAll({
      where: {
        systemId: primarySystem.id,
        playerId: [...uniquePlayersMale],
      },
    });

    // calculate average level of single
    let singleMales = 0;
    const averageLevelSingleMale = rankingPlacesMale.reduce((acc, cur) => {
      if (!cur?.playerId) {
        throw new NotFoundException('No Player id');
      }
      if (!cur?.single) {
        return acc;
      }
      const count = countPerMale.get(cur.playerId) || 0;
      singleMales += count;
      return acc + cur.single * count;
    }, 0);

    // calculate average level of double
    let doubleMales = 0;
    const averageLevelDoubleMale = rankingPlacesMale.reduce((acc, cur) => {
      if (!cur?.playerId) {
        throw new NotFoundException('No Player id');
      }
      if (!cur?.double) {
        return acc;
      }
      const count = countPerMale.get(cur.playerId) || 0;
      doubleMales += count;
      return acc + cur.double * count;
    }, 0);

    // calculate average level of mix
    let mixMales = 0;
    const averageLevelMixedMale = rankingPlacesMale.reduce((acc, cur) => {
      if (!cur?.playerId) {
        throw new NotFoundException('No Player id');
      }
      if (!cur?.mix) {
        return acc;
      }
      const count = countPerMale.get(cur.playerId) || 0;
      mixMales += count;
      return acc + cur.mix * count;
    }, 0);

    return {
      gender: 'M',
      single: averageLevelSingleMale / singleMales,
      singleCount: singleMales,
      double: averageLevelDoubleMale / doubleMales,
      doubleCount: doubleMales,
      mix: averageLevelMixedMale / mixMales,
      mixCount: mixMales,
    } as SubEventCompetitionAverageLevel;
  }

  /**
   * Get the average level of the male players
   * @param primarySystem the primary ranking system
   * @param uniquePlayersMale a set of unique male players
   * @param countPerMale a map of player id and count of amount of games in the event
   * @returns @memberof SubEventCompetitionResolver
   */
  private async getFemaleAverages(
    primarySystem: RankingSystem,
    uniquePlayersFeMale: Set<string>,
    countPerFemale: Map<string, number>
  ) {
    const rankingPlacesFemale = await RankingLastPlace.findAll({
      where: {
        systemId: primarySystem.id,
        playerId: [...uniquePlayersFeMale],
      },
    });

    let singleFemales = 0;
    const averageLevelSingleFemale = rankingPlacesFemale.reduce((acc, cur) => {
      if (!cur?.playerId) {
        throw new NotFoundException('No Player id');
      }

      if (!cur?.single) {
        return acc;
      }
      const count = countPerFemale.get(cur.playerId) || 0;
      singleFemales += count;
      return acc + cur.single * count;
    }, 0);

    let doubleFemales = 0;
    const averageLevelDoubleFemale = rankingPlacesFemale.reduce((acc, cur) => {
      if (!cur?.playerId) {
        throw new NotFoundException('No Player id');
      }

      if (!cur?.double) {
        return acc;
      }
      const count = countPerFemale.get(cur.playerId) || 0;
      doubleFemales += count;
      return acc + cur.double * count;
    }, 0);

    let mixFemales = 0;
    const averageLevelMixedFemale = rankingPlacesFemale.reduce((acc, cur) => {
      if (!cur?.playerId) {
        throw new NotFoundException('No Player id');
      }
      if (!cur?.mix) {
        return acc;
      }
      const count = countPerFemale.get(cur.playerId) || 0;
      mixFemales += count;
      return acc + cur.mix * count;
    }, 0);

    return {
      gender: 'F',
      single: averageLevelSingleFemale / singleFemales,
      singleCount: singleFemales,
      double: averageLevelDoubleFemale / doubleFemales,
      doubleCount: doubleFemales,
      mix: averageLevelMixedFemale / mixFemales,
      mixCount: mixFemales,
    } as SubEventCompetitionAverageLevel;
  }
}
