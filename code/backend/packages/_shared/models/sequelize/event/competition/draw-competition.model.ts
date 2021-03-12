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
import { Game } from '../game.model';
import { EncounterCompetition } from './encounter-competition.model';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class DrawCompetition extends Model {
  constructor(values?: Partial<DrawCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column 
  name: string;

  @Column
  size: number;
 
  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsTo(() => SubEventCompetition, 'subeventId')
  subEvent?: SubEventCompetition[];

  @Unique('unique_constraint')
  @ForeignKey(() => SubEventCompetition)
  @Column
  subeventId: string;

  @HasMany(() => EncounterCompetition, 'drawId')
  encounters: EncounterCompetition[];

  // Belongs to SubEvent
  getSubEvent!: BelongsToGetAssociationMixin<SubEventCompetition>;
  setSubEvent!: BelongsToSetAssociationMixin<SubEventCompetition, string>;

  // Has many Encounter
  getEncounters!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setEncounters!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addEncounters!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addEncounter!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeEncounter!: HasManyRemoveAssociationMixin<EncounterCompetition, string>;
  removeEncounters!: HasManyRemoveAssociationsMixin<EncounterCompetition, string>;
  hasEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasEncounters!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countEncounters!: HasManyCountAssociationsMixin;
}
