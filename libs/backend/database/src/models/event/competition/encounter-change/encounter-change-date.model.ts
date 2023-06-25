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
} from 'sequelize-typescript';
import { ChangeEncounterAvailability } from '@badman/utils';
import { EncounterChange } from './encounter-change.model';
import { Relation } from '../../../../wrapper';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A EncounterChangeDate' })
export class EncounterChangeDate extends Model {
  constructor(values?: Partial<EncounterChangeDate>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  selected?: boolean;

  @BelongsTo(() => EncounterChange, {
    foreignKey: 'encounterChangeId',
    onDelete: 'CASCADE',
  })
  encounterChange?: Relation<EncounterChange>;

  @ForeignKey(() => EncounterChange)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  encounterChangeId?: string;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  date?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('POSSIBLE', 'NOT_POSSIBLE'))
  availabilityHome?: ChangeEncounterAvailability;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('POSSIBLE', 'NOT_POSSIBLE'))
  availabilityAway?: ChangeEncounterAvailability;

  // Belongs to EncounterChange
  getEncounterChange!: BelongsToGetAssociationMixin<EncounterChange>;
  setEncounterChange!: BelongsToSetAssociationMixin<EncounterChange, string>;
}

@InputType()
export class EncounterChangeDateUpdateInput extends PartialType(
  OmitType(EncounterChangeDate, [
    'createdAt',
    'updatedAt',
    'encounterChange',
  ] as const),
  InputType
) {}

@InputType()
export class EncounterChangeDateNewInput extends PartialType(
  OmitType(EncounterChangeDateUpdateInput, ['id'] as const),
  InputType
) {}
