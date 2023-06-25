import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A AssemblyType' })
export class AssemblyType {
  @Field(() => ID, { nullable: true })
  single1?: string;
  @Field(() => ID, { nullable: true })
  single2?: string;
  @Field(() => ID, { nullable: true })
  single3?: string;
  @Field(() => ID, { nullable: true })
  single4?: string;

  @Field(() => [ID], { nullable: true })
  double1?: string[];
  @Field(() => [ID], { nullable: true })
  double2?: string[];
  @Field(() => [ID], { nullable: true })
  double3?: string[];
  @Field(() => [ID], { nullable: true })
  double4?: string[];

  @Field(() => [ID], { nullable: true })
  subtitudes?: string[];
}
