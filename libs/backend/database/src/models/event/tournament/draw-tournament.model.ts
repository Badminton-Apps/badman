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
import {
  BuildOptions,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
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
import { SubEventTournament } from './sub-event-tournament.model';
import { DrawType } from '@badman/utils';
import { Game } from '../game.model';
import { Standing } from '../standing.model';
import { EventEntry } from '../entry.model';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Relation } from '../../../wrapper';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A DrawTournament' })
export class DrawTournament extends Model {
  constructor(values?: Partial<DrawTournament>, options?: BuildOptions) {
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

  @Unique('DrawTournaments_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name?: string;

  @Unique('DrawTournaments_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  type?: DrawType;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  size?: number;

  @HasMany(() => Game, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'tournament',
    },
  })
  games?: Relation<Game[]>;

  @HasMany(() => EventEntry, {
    foreignKey: 'drawId',
    onDelete: 'CASCADE',
    scope: {
      entryType: 'tournament',
    },
  })
  eventEntries?: Relation<EventEntry[]>;

  @Unique('DrawTournaments_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  visualCode?: string;

  @Field(() => Int)
  @Default(0)
  @Column(DataType.NUMBER)
  risers!: number;

  @Field(() => Int)
  @Default(0)
  @Column(DataType.NUMBER)
  fallers!: number;

  @Field(() => SubEventTournament, { nullable: true })
  @BelongsTo(() => SubEventTournament, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE',
  })
  subEventTournament?: Relation<SubEventTournament>;

  @Unique('DrawTournaments_unique_constraint')
  @ForeignKey(() => SubEventTournament)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  subeventId?: string;

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

  // Has many Standing
  getStandings!: HasManyGetAssociationsMixin<Standing>;
  setStandings!: HasManySetAssociationsMixin<Standing, string>;
  addStandings!: HasManyAddAssociationsMixin<Standing, string>;
  addStanding!: HasManyAddAssociationMixin<Standing, string>;
  removeStanding!: HasManyRemoveAssociationMixin<Standing, string>;
  removeStandings!: HasManyRemoveAssociationsMixin<Standing, string>;
  hasStanding!: HasManyHasAssociationMixin<Standing, string>;
  hasStandings!: HasManyHasAssociationsMixin<Standing, string>;
  countStandings!: HasManyCountAssociationsMixin;

  // Belongs to SubEvent
  getSubEventTournament!: BelongsToGetAssociationMixin<SubEventTournament>;
  setSubEventTournament!: BelongsToSetAssociationMixin<SubEventTournament, string>;

  // Has many EventEntries
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
