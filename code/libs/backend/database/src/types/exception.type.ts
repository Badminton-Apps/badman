import { Field, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';

@ObjectType({ description: 'An Exception' })
export class ExceptionType {
  @Field({ nullable: true })
  start: Date;
  @Field({ nullable: true })
  end: Date;
  @Field({ nullable: true })
  courts: number;
}
@InputType()
export class ExceptionInputType extends PartialType(
  OmitType(ExceptionType, [] as const),
  InputType
) {}
