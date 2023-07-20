import {
  Field,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';

@ObjectType({ description: 'An Exception'})
export class AvailabilityExceptionType {
  @Field(() => Date, { nullable: true })
  start?: Date;
  @Field(() => Date, { nullable: true })
  end?: Date;
  @Field(() => Int, { nullable: true })
  courts?: number;
}
@InputType()
export class AvailabilityExceptionInputType extends PartialType(
  OmitType(AvailabilityExceptionType, [] as const),
  InputType
) {}
