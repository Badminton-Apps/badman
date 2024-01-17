import { Field, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import { Column, DataType, Default, IsUUID, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript';

@Table({
  timestamps: true,
  schema: 'system',
})
@ObjectType({ description: 'A Service' })
export class Service extends Model {
  @Field(() => Date, { nullable: true })
  updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => String, { nullable: false })
  @Unique('unique_constraint')
  @Column(DataType.STRING)
  name!: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  renderId?: string;

  @Field(() => String, { nullable: false })
  @Column(DataType.STRING)
  status!: 'starting' | 'started' | 'stopped';
}

@InputType()
export class ServiceUpdateInput extends PartialType(
  OmitType(Service, ['createdAt', 'updatedAt'] as const),
  InputType,
) {}

@InputType()
export class ServiceNewInput extends PartialType(OmitType(ServiceUpdateInput, ['id'] as const), InputType) {}
