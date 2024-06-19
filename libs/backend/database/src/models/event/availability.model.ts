import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
} from 'sequelize-typescript';
import {
  AvailabilityExceptionInputType,
  AvailiblyDayInputType,
  AvailiblyDayType,
  ExceptionType,
} from '../../types';
import { Relation } from '../../wrapper';
import { Location } from './location.model';

@Table({
  timestamps: true,
  schema: 'event',
  tableName: 'Availabilities',
} as TableOptions)
@ObjectType({ description: 'A Availability' })
export class Availability extends Model<
  InferAttributes<Availability>,
  InferCreationAttributes<Availability>
> {
  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  season?: number;

  @Field(() => [AvailiblyDayType], { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  days?: Relation<AvailabilityDay[]>;

  @Field(() => [ExceptionType], { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  exceptions?: Relation<AvailabilityException[]>;

  @BelongsTo(() => Location, {
    foreignKey: 'locationId',
    constraints: false,
  })
  location?: Relation<Location>;

  @ForeignKey(() => Location)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  locationId?: string;

  // Belongs to Location
  getLocation!: BelongsToGetAssociationMixin<Location>;
  setLocation!: BelongsToSetAssociationMixin<Location, string>;
}

export interface AvailabilityException {
  start?: Date;
  end?: Date;
  courts?: number;
}

export interface AvailabilityDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime?: string;
  endTime?: string;
  courts?: number;
}

@InputType()
export class AvailabilityUpdateInput extends PartialType(
  OmitType(Availability, ['createdAt', 'updatedAt', 'location', 'days', 'exceptions'] as const),
  InputType,
) {
  @Field(() => [AvailiblyDayInputType])
  days?: Relation<AvailabilityDay[]>;

  @Field(() => [AvailabilityExceptionInputType])
  exceptions?: AvailabilityException[];
}

@InputType()
export class AvailabilityNewInput extends PartialType(
  OmitType(AvailabilityUpdateInput, ['id'] as const),
  InputType,
) {}
