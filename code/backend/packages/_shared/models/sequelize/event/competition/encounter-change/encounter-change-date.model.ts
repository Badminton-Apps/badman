import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { DrawCompetition } from '../draw-competition.model';
import { Game } from '../../game.model';
import { Team } from '../../../team.model';
import { EncounterCompetition } from '../encounter-competition.model';
import { EncounterChange } from './encounter-change.model';
import { Availability } from '../../../../enums';

@Table({
  timestamps: true,
  schema: 'event'
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
    onDelete: 'CASCADE'
  })
  encounterChange?: EncounterChange[];

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
  setEncounterChange!: BelongsToSetAssociationMixin<EncounterChange, String>;
}