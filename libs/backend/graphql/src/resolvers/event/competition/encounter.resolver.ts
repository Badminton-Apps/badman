import { User } from '@badman/backend-authorization';
import {
  Assembly,
  Comment,
  DrawCompetition,
  EncounterChange,
  EncounterCompetition,
  Game,
  Location,
  Player,
  Team,
} from '@badman/backend-database';
import { VisualService } from '@badman/backend-visual';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEncounterCompetition {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterCompetition])
  rows?: EncounterCompetition[];
}

@Resolver(() => EncounterCompetition)
export class EncounterCompetitionResolver {
  private readonly logger = new Logger(EncounterCompetitionResolver.name);

  constructor(private readonly visualService: VisualService) {}

  @Query(() => EncounterCompetition)
  async encounterCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EncounterCompetition> {
    const encounterCompetition = await EncounterCompetition.findByPk(id);

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => PagedEncounterCompetition)
  async encounterCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EncounterCompetition[] }> {
    return EncounterCompetition.findAndCountAll(
      ListArgs.toFindOptions(listArgs)
    );
  }

  @ResolveField(() => DrawCompetition)
  async drawCompetition(
    @Parent() encounter: EncounterCompetition
  ): Promise<DrawCompetition> {
    return encounter.getDrawCompetition();
  }

  @ResolveField(() => Location)
  async location(@Parent() encounter: EncounterCompetition): Promise<Location> {
    return encounter.getLocation();
  }

  @ResolveField(() => Team)
  async home(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getHome();
  }

  @ResolveField(() => Team)
  async away(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getAway();
  }

  @ResolveField(() => [Assembly])
  async assemblies(
    @Parent() encounter: EncounterCompetition,
    @Args() listArgs: ListArgs
  ): Promise<Assembly[]> {
    return encounter.getAssemblies(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EncounterChange)
  async encounterChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<EncounterChange> {
    return encounter.getEncounterChange();
  }

  @ResolveField(() => [Game])
  async games(@Parent() encounter: EncounterCompetition): Promise<Game[]> {
    return encounter.getGames();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeComments(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayComments(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeCommentsChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayCommentsChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  @Mutation(() => Boolean)
  async changeDate(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
    @Args('date') date: Date,

    @Args('updateBadman') updateBadman: boolean,
    @Args('updateVisual') updateVisual: boolean,
    @Args('closeChangeRequests') closeChangeRequests: boolean
  ) {
    const encounter = await EncounterCompetition.findByPk(id);

    if (!encounter) {
      throw new NotFoundException(`${EncounterCompetition.name}: ${id}`);
    }

    if (!(await user.hasAnyPermission(['change-any:encounter']))) {
      throw new UnauthorizedException(
        `You do not have permission to edit this encounter`
      );
    }

    if (updateBadman) {
      await encounter.update({ date: date });
    }

    if (updateVisual) {
      const draw = await encounter.getDrawCompetition({
        attributes: ['id'],
      });
      const subEvent = await draw.getSubEventCompetition({
        attributes: ['id'],
      });
      const event = await subEvent.getEventCompetition({
        attributes: ['id', 'visualCode'],
      });

      if (!event.visualCode) {
        throw new Error(`Event has no visual code`);
      }

      if (!encounter.visualCode) {
        throw new Error(`Encounter has no visual code`);
      }

      await this.visualService.changeDate(
        event.visualCode,
        encounter.visualCode,
        date
      );
    }

    if (closeChangeRequests) {
      const change = await encounter.getEncounterChange();
      if (!change) {
        throw new Error(`Encounter has no change request`);
      }

      await change.update({ accepted: true });
    }

    return true;
  }
}
