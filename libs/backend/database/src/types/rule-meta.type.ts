import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType({ description: "A AssemblyType" })
export class RuleMetaType {
  @Field(() => [String])
  activatedForUsers?: string[];

  @Field(() => [String])
  activatedForTeams?: string[];

  @Field(() => [String])
  activatedForClubs?: string[];

  @Field(() => [String])
  deActivatedForUsers?: string[];

  @Field(() => [String])
  deActivatedForTeams?: string[];

  @Field(() => [String])
  deActivatedForClubs?: string[];
}
