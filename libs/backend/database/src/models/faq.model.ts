import {
  ObjectType,
  Field,
  ID,
  InputType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import { BuildOptions } from 'sequelize';
import {
  Table,
  Default,
  DataType,
  IsUUID,
  PrimaryKey,
  Column,
  Model,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
  schema: 'public',
})
@ObjectType({ description: 'A faq' })
export class Faq extends Model {
  constructor(values?: Partial<Faq>, options?: BuildOptions) {
    super(values, options);
  }

  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  override id!: string;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Field(() => String)
  @Column(DataType.STRING)
  question?: string;

  @Field(() => String)
  @Column(DataType.STRING)
  answer?: string;
}

@InputType()
export class FaqUpdateInput extends PartialType(
  OmitType(Faq, ['createdAt', 'updatedAt'] as const),
  InputType
) {}

@InputType()
export class FaqNewInput extends PartialType(
  OmitType(FaqUpdateInput, ['id'] as const),
  InputType
) {}
