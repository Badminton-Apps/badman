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
import { Availability } from '../../../../enums';
import { EncounterChange } from './encounter-change.model';

@Table({
  timestamps: true,
  schema: 'event',
})
export class EncounterChangeDate extends Model {
  constructor(values?: Partial<EncounterChangeDate>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  selected?: boolean;

  @BelongsTo(() => EncounterChange, {
    foreignKey: 'encounterChangeId',
    onDelete: 'CASCADE',
  })
  encounterChange?: EncounterChange;

  @ForeignKey(() => EncounterChange)
  @Column
  encounterChangeId: string;

  @Column
  date: Date;

  @Column(DataType.ENUM('POSSIBLE', 'NOT_POSSIBLE'))
  availabilityHome?: Availability;

  @Column(DataType.ENUM('POSSIBLE', 'NOT_POSSIBLE'))
  availabilityAway?: Availability;

  // Belongs to EncounterChange
  getEncounterChange!: BelongsToGetAssociationMixin<EncounterChange>;
  setEncounterChange!: BelongsToSetAssociationMixin<EncounterChange, string>;
}
