import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
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
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  HasOne,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Player } from '../../player.model';
import { Team } from '../../team.model';
import { Game } from '../game.model';
import { DrawCompetition } from './draw-competition.model';
import { EncounterChange } from './encounter-change';
import { Notification } from '../../personal';
import { Assembly } from './assembly.model';
import { Relation } from '../../../wrapper';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A EncounterCompetition' })
export class EncounterCompetition extends Model {
  constructor(values?: Partial<EncounterCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  date?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  originalDate?: Date;

  @HasMany(() => Game, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition',
    },
  })
  games?: Relation<Game[]>;

  @Field(() => DrawCompetition, { nullable: true })
  @BelongsTo(() => DrawCompetition, {
    foreignKey: 'drawId',
    onDelete: 'CASCADE',
  })
  drawCompetition?: Relation<DrawCompetition>;

  @ForeignKey(() => DrawCompetition)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  drawId?: string;

  @Field(() => Team, { nullable: true })
  @BelongsTo(() => Team, 'homeTeamId')
  home?: Relation<Team>;

  @Field(() => Int)
  @Default(0)
  @Column(DataType.NUMBER)
  homeScore!: number;

  @ForeignKey(() => Team)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  homeTeamId?: string;

  @Field(() => Team, { nullable: true })
  @BelongsTo(() => Team, 'awayTeamId')
  away?: Relation<Team>;

  @Field(() => Int)
  @Default(0)
  @Column(DataType.NUMBER)
  awayScore!: number;

  @ForeignKey(() => Team)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  awayTeamId?: string;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  synced?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  visualCode?: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'gameLeaderId')
  gameLeader?: Relation<Player>;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'enteredById')
  enteredBy?: Relation<Player>;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'acceptedById')
  acceptedBy?: Relation<Player>;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  enteredOn?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  acceptedOn?: Date;

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  accepted?: boolean;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  shuttle?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  startHour?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  endHour?: string;


  @Field(() => EncounterChange, { nullable: true })
  @HasOne(() => EncounterChange, {
    foreignKey: 'encounterId',
    onDelete: 'CASCADE',
  })
  encounterChange?: Relation<EncounterChange>;

  @HasMany(() => Notification, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'encounter',
    },
  })
  notifications?: Relation<Notification[]>;

  @Field(() => [Assembly], { nullable: true })
  @HasMany(() => Assembly, {
    foreignKey: 'encounterId',
    onDelete: 'CASCADE',
  })
  assemblies?: Relation<Assembly[]>;

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

  // Belongs to Draw
  getDrawCompetition!: BelongsToGetAssociationMixin<DrawCompetition>;
  setDrawCompetition!: BelongsToSetAssociationMixin<DrawCompetition, string>;

  // Belongs to Home
  getHome!: BelongsToGetAssociationMixin<Team>;
  setHome!: BelongsToSetAssociationMixin<Team, string>;

  // Belongs to Away
  getAway!: BelongsToGetAssociationMixin<Team>;
  setAway!: BelongsToSetAssociationMixin<Team, string>;

  // Has one EncounterChange
  getEncounterChange!: HasOneGetAssociationMixin<EncounterChange>;
  setEncounterChange!: HasOneSetAssociationMixin<EncounterChange, string>;

  // Belongs to GameLeader
  getGameLeader!: BelongsToGetAssociationMixin<Player>;
  setGameLeader!: BelongsToSetAssociationMixin<Player, string>;

  // Has many Assemblie
  getAssemblies!: HasManyGetAssociationsMixin<Assembly>;
  setAssemblies!: HasManySetAssociationsMixin<Assembly, string>;
  addAssemblies!: HasManyAddAssociationsMixin<Assembly, string>;
  addAssembly!: HasManyAddAssociationMixin<Assembly, string>;
  removeAssemblie!: HasManyRemoveAssociationMixin<Assembly, string>;
  removeAssemblies!: HasManyRemoveAssociationsMixin<Assembly, string>;
  hasAssembly!: HasManyHasAssociationMixin<Assembly, string>;
  hasAssemblies!: HasManyHasAssociationsMixin<Assembly, string>;
  countAssemblies!: HasManyCountAssociationsMixin;
}
