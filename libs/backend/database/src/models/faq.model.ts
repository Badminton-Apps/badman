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

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field({ nullable: true })
  createdAt?: Date;

  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id!: string;

  @Field()
  @Column
  question: string;

  @Field()
  @Column
  answer: string;
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
