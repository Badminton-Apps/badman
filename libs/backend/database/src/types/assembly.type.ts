import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A AssemblyType' })
export class AssemblyType {
  @Field({ nullable: true })
  single1: string;
  @Field({ nullable: true })
  single2: string;
  @Field({ nullable: true })
  single3: string;
  @Field({ nullable: true })
  single4: string;

  @Field(() => [String], { nullable: true })
  double1: string[];
  @Field(() => [String], { nullable: true })
  double2: string[];
  @Field(() => [String], { nullable: true })
  double3: string[];
  @Field(() => [String], { nullable: true })
  double4: string[];

  @Field(() => [String], { nullable: true })
  subtitudes: string[];
}
