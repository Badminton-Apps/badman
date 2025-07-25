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
import { DrawType } from '@badman/utils';
import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import { Relation } from '../../../wrapper';
import { Game } from '../game.model';

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
  @Column(DataType.UUIDV4)
  override id!: string;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Unique('DrawCompetitions_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name!: string;

  @Unique('DrawCompetitions_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  visualCode?: string;

  @Unique('DrawCompetitions_unique_constraint')
  @Field(() => String)
  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  type!: DrawType;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  size?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  risers?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  fallers?: number;

  @Field(() => SubEventCompetition, { nullable: true })
  @BelongsTo(() => SubEventCompetition, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE',
  })
  subEventCompetition?: Relation<SubEventCompetition>;

  @Unique('DrawCompetitions_unique_constraint')
  @ForeignKey(() => SubEventCompetition)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  subeventId?: string;

  @HasMany(() => EncounterCompetition, {
    foreignKey: 'drawId',
    onDelete: 'CASCADE',
  })
  encounterCompetitions?: EncounterCompetition[];

  @HasMany(() => EventEntry, {
    foreignKey: 'drawId',
    onDelete: 'CASCADE',
    scope: {
      entryType: 'competition',
    },
  })
  eventEntries?: Relation<EventEntry[]>;

    // Has many Game
    getGames!: HasManyGetAssociationsMixin<Game>;
    setGames!: HasManySetAssociationsMixin<Game, string>;
    addGames!: HasManyAddAssociationsMixin<Game, string>;
    addGame!: HasManyAddAssociationMixin<Game, string>;
    removeGame!: HasManyRemoveAssociationMixin<Game, string>;
    removeGames!: HasManyRemoveAssociationsMixin<Game, string>;
    hasGame!: HasManyHasAssociationMixin<Game, string>;
    hasGames!: HasManyHasAssociationsMixin<Game, string>;
    countGames!: HasManyCountAssociationsMixin;

  // Belongs to SubEvent
  getSubEventCompetition!: BelongsToGetAssociationMixin<SubEventCompetition>;
  setSubEventCompetition!: BelongsToSetAssociationMixin<SubEventCompetition, string>;

  // Has many Encounter
  getEncounterCompetitions!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setEncounterCompetitions!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addEncounterCompetitions!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addEncounterCompetition!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeEncounterCompetition!: HasManyRemoveAssociationMixin<EncounterCompetition, string>;
  removeEncounterCompetitions!: HasManyRemoveAssociationsMixin<EncounterCompetition, string>;
  hasEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasEncounterCompetitions!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countEncounterCompetitions!: HasManyCountAssociationsMixin;

  // Has many EventEntrie
  getEventEntries!: HasManyGetAssociationsMixin<EventEntry>;
  setEventEntries!: HasManySetAssociationsMixin<EventEntry, string>;
  addEventEntries!: HasManyAddAssociationsMixin<EventEntry, string>;
  addEventEntry!: HasManyAddAssociationMixin<EventEntry, string>;
  removeEventEntry!: HasManyRemoveAssociationMixin<EventEntry, string>;
  removeEventEntries!: HasManyRemoveAssociationsMixin<EventEntry, string>;
  hasEventEntry!: HasManyHasAssociationMixin<EventEntry, string>;
  hasEventEntries!: HasManyHasAssociationsMixin<EventEntry, string>;
  countEventEntries!: HasManyCountAssociationsMixin;
}

@InputType()
export class DrawCompetitionUpdateInput extends PartialType(
  OmitType(DrawCompetition, ['createdAt', 'updatedAt', 'subEventCompetition'] as const),
  InputType,
) {}

@InputType()
export class DrawCompetitionNewInput extends PartialType(
  OmitType(DrawCompetitionUpdateInput, ['id'] as const),
  InputType,
) {}
