import {
  Field,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';

@ObjectType({ description: 'A Meta' })
export class CronJobMetaType {
  @Field(() => String, { nullable: true })
  jobName?: string;

  @Field(() => String, { nullable: true })
  queueName?: string;

  @Field(() => String, { nullable: true })
  arguments?: string;
}

// input type for EntryCmopetitionPlayer
@InputType()
export class CronJobMetaInputType extends PartialType(
  OmitType(CronJobMetaType, [] as const),
  InputType,
) {}
