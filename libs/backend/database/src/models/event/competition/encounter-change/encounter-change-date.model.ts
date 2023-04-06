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
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  selected?: boolean;

  @BelongsTo(() => EncounterChange, {
    foreignKey: 'encounterChangeId',
    onDelete: 'CASCADE',
  })
  encounterChange?: EncounterChange;

  @ForeignKey(() => EncounterChange)
  @Field({ nullable: true })
  @Column
  encounterChangeId: string;

  @Field({ nullable: true })
  @Column
  date: Date;

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
