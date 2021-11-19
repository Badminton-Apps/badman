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

  @Unique('DrawCompetitions_unique_constraint')
  @Column 
  name: string;

  @Unique('DrawCompetitions_unique_constraint')
  @Column
  visualCode: string;

  @Column
  size: number;
 
  @BelongsTo(() => SubEventCompetition, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE'
  })
  subEvent?: SubEventCompetition;

  @Unique('DrawCompetitions_unique_constraint')
  @ForeignKey(() => SubEventCompetition)
  @Column
  subeventId: string;

  @HasMany(() => EncounterCompetition, {
    foreignKey:  'drawId',
    onDelete: 'CASCADE'
  })
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
