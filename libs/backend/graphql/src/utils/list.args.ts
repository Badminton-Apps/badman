import { ArgsType, Field, Int, InputType } from '@nestjs/graphql';
import { Min } from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json';
import { FindOptions, WhereOptions } from 'sequelize';
import { queryFixer } from './queryFixer';

@InputType()
export class SortOrderType {
  @Field(() => String)
  field!: string;

  @Field(() => String)
  direction!: string;
}

export class SortOrder {
  field!: string;
  direction!: string;
}

@ArgsType()
export class WhereArgs {
  @Field(() => GraphQLJSONObject, { nullable: true })
  where?: WhereOptions;
}

@ArgsType()
export class ListArgs extends WhereArgs {
  @Field(() => Int, { nullable: true })
  @Min(0)
  skip = 0;

  @Field(() => Int, { nullable: true })
  @Min(1)
  take = 10;

  @Field(() => [SortOrderType], { nullable: true })
  order?: SortOrderType[];

  static toFindOptions(args: ListArgs) {
    return {
      limit: args.take,
      offset: args.skip,
      where: queryFixer(args.where),
      order: args.order?.map(({ field, direction }) => [field, direction]),
    } as FindOptions;
  }
}
