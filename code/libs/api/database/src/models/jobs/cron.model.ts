import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { BuildOptions } from 'sequelize';
import {
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
  schema: 'job',
})
@ObjectType({ description: 'A Cron' })
export class Cron extends Model {
  constructor(values?: Partial<Cron>, options?: BuildOptions) {
    super(values, options);
  }

  // #region fields
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  cron: string;

  @Field({ nullable: true })
  @Column
  type: string;

  @Field({ nullable: true })
  @Column
  lastRun: Date;

  @Field({ nullable: true })
  @Column
  running: boolean;

  @Field({ nullable: true })
  @Column
  scheduled: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column(DataType.JSON)
  meta: object;
}
