import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'An Exception' })
export class ExceptionType {
  @Field({ nullable: true })
  start: Date;
  @Field({ nullable: true })
  end: Date;
  @Field({ nullable: true })
  courts: number;
}
