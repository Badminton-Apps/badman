import { Field } from '@nestjs/graphql';
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Column, DataType, Default, IsUUID, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  timestamps: true,
  schema: 'system',
  tableName: 'Rules',
})
export class Rule extends Model<InferAttributes<Rule>, InferCreationAttributes<Rule>> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  declare updatedAt?: Date;
  declare createdAt?: Date;

  
  @Field(() => String)
  @Column(DataType.STRING)
  group!: string;

  @Field(() => String)
  @Column(DataType.STRING)
  name!: string;

  @Field(() => String)
  @Column(DataType.STRING)
  description!: string;

  @Field(() => Boolean)
  @Column(DataType.BOOLEAN)
  activated!: boolean;

  // @Field(() => String, { nullable: true })
  @Column({
    type: DataType.JSONB,
  })
  meta?: unknown
}

