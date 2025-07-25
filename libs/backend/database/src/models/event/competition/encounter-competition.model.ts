import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  CreationOptional,
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
  InferAttributes,
  InferCreationAttributes,
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
import { Relation } from '../../../wrapper';
import { Comment } from '../../comment.model';
import { Notification } from '../../personal';
import { Player } from '../../player.model';
import { Team } from '../../team.model';
import { Game } from '../game.model';
import { Location } from '../location.model';
import { Assembly } from './assembly.model';
import { DrawCompetition } from './draw-competition.model';
import { EncounterChange } from './encounter-change';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A EncounterCompetition' })
export class EncounterCompetition extends Model<
  InferAttributes<EncounterCompetition>,
  InferCreationAttributes<EncounterCompetition>
> {
  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

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
  homeScore!: CreationOptional<number>;

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
  awayScore!: CreationOptional<number>;

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

  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  gameLeaderId?: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'enteredById')
  enteredBy?: Relation<Player>;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'acceptedById')
  acceptedBy?: Relation<Player>;

  @Field(() => Boolean, { nullable: false })
  @Column(DataType.BOOLEAN)
  finished?: boolean;

  @Field(() => Boolean, { nullable: false })
  @Column(DataType.BOOLEAN)
  homeCaptainPresent?: boolean;

  @Field(() => Boolean, { nullable: false })
  @Column(DataType.BOOLEAN)
  awayCaptainPresent?: boolean;

  @Field(() => Boolean, { nullable: false })
  @Column(DataType.BOOLEAN)
  gameLeaderPresent?: boolean;

  @Field(() => Boolean, { nullable: false })
  @Column(DataType.BOOLEAN)
  gameLeaderAccepted?: boolean;

  @Field(() => Boolean, { nullable: false })
  @Column(DataType.BOOLEAN)
  homeCaptainAccepted?: boolean;

  @Field(() => Boolean, { nullable: false })
  @Column(DataType.BOOLEAN)
  awayCaptainAccepted?: boolean;

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

  @Field(() => Location, { nullable: true })
  @BelongsTo(() => Location, {
    foreignKey: 'locationId',
    onDelete: 'CASCADE',
  })
  location?: Relation<Location>;

  @ForeignKey(() => Location)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  locationId?: string;

  @Field(() => Location, { nullable: true })
  @BelongsTo(() => Location, {
    foreignKey: 'originalLocationId',
    onDelete: 'CASCADE',
  })
  originalLocation?: Relation<Location>;

  @ForeignKey(() => Location)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  originalLocationId?: string;

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

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'home_comment',
    },
  })
  homeComments?: Relation<Comment[]>;

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'away_comment',
    },
  })
  awayComments?: Relation<Comment[]>;

  @Field(() => Comment, { nullable: true })
  @HasOne(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'game_leader_comment',
    },
  })
  gameLeaderComment?: Relation<Comment>;

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'home_comment_change',
    },
  })
  homeCommentsChange?: Relation<Comment[]>;

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'away_comment_change',
    },
  })
  awayCommentsChange?: Relation<Comment[]>;

  @Field(() => Comment, { nullable: true })
  @HasOne(() => Comment, {
    foreignKey: 'linkId',
    constraints: true,
    scope: {
      linkType: 'encounter',
    },
  })
  encounterComment?: Relation<Comment>;

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

  // Belongs to player
  getAcceptedBy!: BelongsToGetAssociationMixin<Player>;
  setAcceptedBy!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to player
  getEnteredBy!: BelongsToGetAssociationMixin<Player>;
  setEnteredBy!: BelongsToSetAssociationMixin<Player, string>;

  // Has one EncounterChange
  getEncounterChange!: HasOneGetAssociationMixin<EncounterChange>;
  setEncounterChange!: HasOneSetAssociationMixin<EncounterChange, string>;

  // Has one Location
  getLocation!: BelongsToGetAssociationMixin<Location>;
  setLocation!: BelongsToSetAssociationMixin<Location, string>;

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

  // Has one Location
  getGameLeaderComment!: BelongsToGetAssociationMixin<Comment>;
  setGameLeaderComment!: BelongsToSetAssociationMixin<Comment, string>;

  // Has many HomeComment
  getHomeComments!: HasManyGetAssociationsMixin<Comment>;
  setHomeComments!: HasManySetAssociationsMixin<Comment, string>;
  addHomeComments!: HasManyAddAssociationsMixin<Comment, string>;
  addHomeComment!: HasManyAddAssociationMixin<Comment, string>;
  removeHomeComment!: HasManyRemoveAssociationMixin<Comment, string>;
  removeHomeComments!: HasManyRemoveAssociationsMixin<Comment, string>;
  hasHomeComment!: HasManyHasAssociationMixin<Comment, string>;
  hasHomeComments!: HasManyHasAssociationsMixin<Comment, string>;
  countHomeComments!: HasManyCountAssociationsMixin;

  // Has many AwayComment
  getAwayComments!: HasManyGetAssociationsMixin<Comment>;
  setAwayComments!: HasManySetAssociationsMixin<Comment, string>;
  addAwayComments!: HasManyAddAssociationsMixin<Comment, string>;
  addAwayComment!: HasManyAddAssociationMixin<Comment, string>;
  removeAwayComment!: HasManyRemoveAssociationMixin<Comment, string>;
  removeAwayComments!: HasManyRemoveAssociationsMixin<Comment, string>;
  hasAwayComment!: HasManyHasAssociationMixin<Comment, string>;
  hasAwayComments!: HasManyHasAssociationsMixin<Comment, string>;
  countAwayComments!: HasManyCountAssociationsMixin;

  // Has one EncounterComment
  getEncounterComment!: BelongsToGetAssociationMixin<Comment>;
  setEncounterComment!: BelongsToSetAssociationMixin<Comment, string>;


  // Has many HomeCommentsChange
  getHomeCommentsChanges!: HasManyGetAssociationsMixin<Comment>;
  setHomeCommentsChanges!: HasManySetAssociationsMixin<Comment, string>;
  addHomeCommentsChanges!: HasManyAddAssociationsMixin<Comment, string>;
  addHomeCommentsChange!: HasManyAddAssociationMixin<Comment, string>;
  removeHomeCommentsChange!: HasManyRemoveAssociationMixin<Comment, string>;
  removeHomeCommentsChanges!: HasManyRemoveAssociationsMixin<Comment, string>;
  hasHomeCommentsChange!: HasManyHasAssociationMixin<Comment, string>;
  hasHomeCommentsChanges!: HasManyHasAssociationsMixin<Comment, string>;
  countHomeCommentsChanges!: HasManyCountAssociationsMixin;

  // Has many AwayCommentsChange
  getAwayCommentsChanges!: HasManyGetAssociationsMixin<Comment>;
  setAwayCommentsChanges!: HasManySetAssociationsMixin<Comment, string>;
  addAwayCommentsChanges!: HasManyAddAssociationsMixin<Comment, string>;
  addAwayCommentsChange!: HasManyAddAssociationMixin<Comment, string>;
  removeAwayCommentsChange!: HasManyRemoveAssociationMixin<Comment, string>;
  removeAwayCommentsChanges!: HasManyRemoveAssociationsMixin<Comment, string>;
  hasAwayCommentsChange!: HasManyHasAssociationMixin<Comment, string>;
  hasAwayCommentsChanges!: HasManyHasAssociationsMixin<Comment, string>;
  countAwayCommentsChanges!: HasManyCountAssociationsMixin;
}

@InputType()
export class updateEncounterCompetitionInput {
  @Field(() => Boolean, { nullable: true })
  gameLeaderPresent?: boolean;

  @Field(() => Boolean, { nullable: true })
  homeCaptainPresent?: boolean;

  @Field(() => Boolean, { nullable: true })
  awayCaptainPresent?: boolean;

  @Field(() => Boolean, { nullable: true })
  gameLeaderAccepted?: boolean;

  @Field(() => Boolean, { nullable: true })
  homeCaptainAccepted?: boolean;

  @Field(() => Boolean, { nullable: true })
  awayCaptainAccepted?: boolean;

  @Field(() => String, { nullable: true })
  startHour?: string;

  @Field(() => String, { nullable: true })
  endHour?: string;

  @Field(() => String, { nullable: true })
  shuttle?: string;

  @Field(() => Boolean, { nullable: true })
  accepted?: boolean;

  @Field(() => String, { nullable: true })
  acceptedById?: string;

  @Field(() => Date, { nullable: true })
  acceptedOn?: Date;

  @Field(() => Boolean, { nullable: true })
  finished?: boolean;

  @Field(() => String, { nullable: true })
  enteredById?: string;

  @Field(() => Date, { nullable: true })
  enteredOn?: Date;
}
