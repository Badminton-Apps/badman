import { Field, InputType, Int, ObjectType, OmitType, PartialType } from '@nestjs/graphql';

@ObjectType({ description: 'An Exception' })
export class ExceptionType {
  @Field(() => Date, { nullable: true })
  start?: Date;
  @Field(() => Date, { nullable: true })
  end?: Date;
  @Field(() => Int, { nullable: true })
  courts?: number;
}

@InputType()
export class AvailabilityExceptionInputType extends PartialType(
  OmitType(ExceptionType, [] as const),
  InputType,
) {}

@ObjectType({ description: 'An Exception' })
export class InfoEventType {
  @Field(() => Date, { nullable: true })
  start?: Date;
  @Field(() => Date, { nullable: true })
  end?: Date;
  @Field(() => String, { nullable: true })
  name?: string;
}

@InputType()
export class InfoEventInputType extends PartialType(
  OmitType(InfoEventType, [] as const),
  InputType,
) {}
