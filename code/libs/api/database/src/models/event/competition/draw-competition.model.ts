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
  HasManySetAssociationsMixin,
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
  Unique,
} from 'sequelize-typescript';
import { EventEntry } from '../entry.model';
import { EncounterCompetition } from './encounter-competition.model';
import { SubEventCompetition } from './sub-event-competition.model';
import { DrawType } from '../../../enums';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A DrawCompetition' })
export class DrawCompetition extends Model {
  constructor(values?: Partial<DrawCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Unique('DrawCompetitions_unique_constraint')
  @Field({ nullable: true })
  @Column
  name: string;

  @Unique('DrawCompetitions_unique_constraint')
  @Field({ nullable: true })
  @Column
  visualCode: string;

  @Unique('DrawCompetitions_unique_constraint')
  @Field(() => String,{ nullable: true })
  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  type: DrawType;

  @Field({ nullable: true })
  @Column
  size: number;

  @Field(() => SubEventCompetition, { nullable: true })
  @BelongsTo(() => SubEventCompetition, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE',
  })
  subEventCompetition?: SubEventCompetition;

  @Unique('DrawCompetitions_unique_constraint')
  @ForeignKey(() => SubEventCompetition)
  @Field({ nullable: true })
  @Column
  subeventId: string;

  @HasMany(() => EncounterCompetition, {
    foreignKey: 'drawId',
    onDelete: 'CASCADE',
  })
  encounterCompetitions: EncounterCompetition[];

  @HasMany(() => EventEntry, {
    foreignKey: 'drawId',
    onDelete: 'CASCADE',
    scope: {
      entryType: 'competition',
    },
  })
  entries: EventEntry[];

  // Belongs to SubEvent
  getSubEventCompetition!: BelongsToGetAssociationMixin<SubEventCompetition>;
  setSubEventCompetition!: BelongsToSetAssociationMixin<SubEventCompetition, string>;

  // Has many Encounter
  getEncounterCompetitions!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setEncounterCompetitions!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addEncounterCompetitions!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addEncounterCompetition!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeEncounterCompetition!: HasManyRemoveAssociationMixin<EncounterCompetition, string>;
  removeEncounterCompetitions!: HasManyRemoveAssociationsMixin<
    EncounterCompetition,
    string
  >;
  hasEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasEncounterCompetitions!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countEncounterCompetitions!: HasManyCountAssociationsMixin;

  // Has many Entries
  getEntries!: HasManyGetAssociationsMixin<EventEntry>;
  setEntries!: HasManySetAssociationsMixin<EventEntry, string>;
  addEntries!: HasManyAddAssociationsMixin<EventEntry, string>;
  addEntry!: HasManyAddAssociationMixin<EventEntry, string>;
  removeEntries!: HasManyRemoveAssociationMixin<EventEntry, string>;
  removeEntry!: HasManyRemoveAssociationsMixin<EventEntry, string>;
  hasEntries!: HasManyHasAssociationMixin<EventEntry, string>;
  hasEntry!: HasManyHasAssociationsMixin<EventEntry, string>;
  countEntries!: HasManyCountAssociationsMixin;
}
