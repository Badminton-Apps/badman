import {
  Field,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';

@ObjectType({ description: 'An Exception'})
export class ExceptionType {
  @Field(() => Date, { nullable: true })
  start?: Date;
  @Field(() => Date, { nullable: true })
  end?: Date;
  @Field(() => Int, { nullable: true })
  courts?: number;
}
@InputType()
export class ExceptionInputType extends PartialType(
  OmitType(ExceptionType, [] as const),
  InputType
) {}
