import { ArgsType, Field, Int, InputType } from '@nestjs/graphql';
import { Max, Min } from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json';
import { WhereOptions } from 'sequelize';

@InputType()
export class SortOrderType {
  @Field()
  field!: string;

  @Field()
  direction!: string;
}

export class SortOrder {
  field: string;
  direction: string;
}

@ArgsType()
export class ListArgs {
  @Field(() => Int, { nullable: true })
  @Min(0)
  skip = 0;

  @Field(() => Int, { nullable: true })
  @Min(1)
  @Max(50)
  take = 25;

  @Field(() => [SortOrderType], { nullable: true })
  order?: SortOrderType[];

  @Field(() => GraphQLJSONObject, { nullable: true })
  where: WhereOptions;
}
