import { QueueName, Ranking, Simulation, Sync, UpdateRankingJob } from '@badman/backend-queue';
import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import {
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { CronJobMetaType } from '../../types';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({
  timestamps: true,
  schema: 'system',
})
@ObjectType({ description: 'Cron job' })
export class CronJob extends Model<InferAttributes<CronJob>, InferCreationAttributes<CronJob>> {
  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => Date, { nullable: true })
  declare updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  declare createdAt?: Date;

  @Field(() => String, { nullable: false })
  @Unique('unique_constraint')
  @Column(DataType.STRING)
  declare name: string;

  @Field(() => String, { nullable: false })
  @Column(DataType.STRING)
  type!: 'ranking' | 'sync';

  @Field(() => String, { nullable: false })
  @Unique('unique_constraint')
  @Column(DataType.STRING)
  cronTime!: string;

  @Field(() => CronJobMetaType, { nullable: false })
  @Column({
    type: DataType.JSON,
  })
  meta?: CronJobMeta;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  lastRun?: Date;

  @Field(() => Boolean, { nullable: false })
  @Default(false)
  @Column({
    type: DataType.VIRTUAL,
    get(this: CronJob) {
      const amount = this.getDataValue('amount') ?? 0;
      return amount > 0;
    },
  })
  running?: boolean;

  @Field(() => Int, { nullable: false })
  @Default(0)
  @Column(DataType.INTEGER)
  amount?: number;
}

@InputType()
export class CronJobUpdateInput extends PartialType(
  OmitType(CronJob, ['createdAt', 'updatedAt'] as const),
  InputType,
) {}

@InputType()
export class CronJobNewInput extends PartialType(
  OmitType(CronJobUpdateInput, ['id'] as const),
  InputType,
) {}

export type CronJobMeta = QueueCronJob;

export interface QueueCronJob {
  jobName: Sync | Simulation | Ranking;
  queueName: QueueName;
  arguments: UpdateRankingJob;
}
