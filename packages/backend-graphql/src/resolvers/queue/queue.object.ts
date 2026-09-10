import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

/**
 * Live Bull/Redis counters for a single queue.
 *
 * These are not persisted anywhere: they are read straight from Redis on every
 * request, so two calls a second apart can legitimately disagree.
 */
@ObjectType()
export class QueueStats {
  @Field(() => String)
  declare name: string;

  @Field(() => Int)
  declare waiting: number;

  @Field(() => Int)
  declare active: number;

  @Field(() => Int)
  declare completed: number;

  @Field(() => Int)
  declare failed: number;

  @Field(() => Int)
  declare delayed: number;
}

/**
 * A single Bull job, flattened for transport.
 *
 * Bull keeps only a small window of finished jobs (see `removeOnComplete` /
 * `removeOnFail` in `@badman/backend-queue`), so this is a live view, not a history.
 */
@ObjectType()
export class QueueJob {
  @Field(() => ID)
  declare id: string;

  @Field(() => String)
  declare queue: string;

  @Field(() => String)
  declare name: string;

  @Field(() => String)
  declare state: string;

  /** `job.data`, JSON-stringified — the shape differs per job name. */
  @Field(() => String, { nullable: true })
  declare data?: string;

  @Field(() => String, { nullable: true })
  declare failedReason?: string;

  @Field(() => Int)
  declare attemptsMade: number;

  @Field(() => Int)
  declare attemptsTotal: number;

  @Field(() => Date, { nullable: true })
  declare processedOn?: Date;

  @Field(() => Date, { nullable: true })
  declare finishedOn?: Date;
}
