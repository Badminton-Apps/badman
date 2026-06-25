import { EncounterChange, EncounterChangeDate, Location, Player } from "@badman/backend-database";
import { NotFoundException } from "@nestjs/common";
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
import { ListArgs } from "../../../utils";
import { User } from "@badman/backend-authorization";
import {
  FinalizeEncounterChangeInput,
  ProposeEncounterChangeDatesInput,
  TriageEncounterChangeInput,
} from "./encounter-change.input";
import {
  FinalizeEncounterChangeResult,
  ProposeEncounterChangeDatesResult,
  TriageEncounterChangeResult,
} from "./encounter-change.result";
import { EncounterChangeService } from "./encounter-change.service";

@ObjectType()
export class PagedEncounterChange {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterChange])
  rows?: EncounterChange[];
}

@Resolver(() => EncounterChange)
export class EncounterChangeCompetitionResolver {
  constructor(private encounterChangeService: EncounterChangeService) {}

  @Query(() => EncounterChange)
  async encounterChange(@Args("id", { type: () => ID }) id: string): Promise<EncounterChange> {
    const encounterChange = await EncounterChange.findByPk(id);
    if (!encounterChange) {
      throw new NotFoundException(id);
    }
    return encounterChange;
  }

  @Query(() => PagedEncounterChange)
  async encounterChanges(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EncounterChange[] }> {
    return EncounterChange.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [EncounterChangeDate])
  async dates(@Parent() encounterChange: EncounterChange): Promise<EncounterChangeDate[]> {
    return encounterChange.getDates();
  }

  @Mutation(() => ProposeEncounterChangeDatesResult)
  async proposeEncounterChangeDates(
    @User() user: Player,
    @Args("input") input: ProposeEncounterChangeDatesInput
  ): Promise<ProposeEncounterChangeDatesResult> {
    return this.encounterChangeService.propose(user, input);
  }

  @Mutation(() => TriageEncounterChangeResult)
  async triageEncounterChange(
    @User() user: Player,
    @Args("input") input: TriageEncounterChangeInput
  ): Promise<TriageEncounterChangeResult> {
    return this.encounterChangeService.triage(user, input);
  }

  @Mutation(() => FinalizeEncounterChangeResult)
  async finalizeEncounterChange(
    @User() user: Player,
    @Args("input") input: FinalizeEncounterChangeInput
  ): Promise<FinalizeEncounterChangeResult> {
    return this.encounterChangeService.finalize(user, input);
  }
}

@Resolver(() => EncounterChangeDate)
export class EncounterChangeDateCompetitionResolver {
  @ResolveField(() => Location)
  async dates(@Parent() encounterChangeDate: EncounterChangeDate): Promise<Location> {
    return encounterChangeDate.getLocation();
  }
}
