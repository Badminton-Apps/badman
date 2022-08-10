import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
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
  AvailiblyDayInputType,
  AvailiblyDayType,
  ExceptionInputType,
  ExceptionType as AvailabilityExceptionType,
} from '../../types';
import { Location } from './location.model';

@Table({
  timestamps: true,
  schema: 'event',
  tableName: 'Availabilities',
} as TableOptions)
@ObjectType({ description: 'A Availability' })
export class Availability extends Model {
  constructor(values?: Partial<Availability>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  year: number;

  @Field(() => [AvailiblyDayType], { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  days: AvailabilityDay[];

  @Field(() => [AvailabilityExceptionType], { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  exceptions: AvailabilityException[];

  @BelongsTo(() => Location, {
    foreignKey: 'locationId',
    constraints: false,
  })
  location: Location;

  @ForeignKey(() => Location)
  @Field({ nullable: true })
  @Column
  locationId: string;

  // Belongs to Location
  getLocation!: BelongsToGetAssociationMixin<Location>;
  setLocation!: BelongsToSetAssociationMixin<Location, string>;
}

export interface AvailabilityException {
  start: Date;
  end: Date;
  courts: number;
}

export interface AvailabilityDay {
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  startTime: string;
  endTime: string;
  courts: number;
}

@InputType()
export class AvailabilityUpdateInput extends PartialType(
  OmitType(Availability, [
    'createdAt',
    'updatedAt',
    'location',
    'days',
    'exceptions',
  ] as const),
  InputType
) {
  @Field(() => [AvailiblyDayInputType])
  days: AvailabilityDay[];

  @Field(() => [ExceptionInputType])
  exceptions: AvailabilityException[];
}

@InputType()
export class AvailabilityNewInput extends PartialType(
  OmitType(AvailabilityUpdateInput, ['id'] as const),
  InputType
) {}
