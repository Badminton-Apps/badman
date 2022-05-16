import { Field, ID, ObjectType } from '@nestjs/graphql';
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
import { Team } from '../../team.model';
import { Game } from '../game.model';
import { DrawCompetition } from './draw-competition.model';
import { EncounterChange } from './encounter-change';

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
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  date: Date;

  @Field({ nullable: true })
  @Column
  originalDate: Date;

  @HasMany(() => Game, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition',
    },
  })
  games: Game[];

  @Field(() => DrawCompetition, { nullable: true })
  @BelongsTo(() => DrawCompetition, {
    foreignKey: 'drawId',
    onDelete: 'CASCADE',
  })
  draw?: DrawCompetition;

  @ForeignKey(() => DrawCompetition)
  @Field({ nullable: true })
  @Column
  drawId: string;

  @Field(() => Team, { nullable: true })
  @BelongsTo(() => Team, 'homeTeamId')
  home: Team;

  @Field({ nullable: true })
  @Column
  homeScore: number;

  @ForeignKey(() => Team)
  @Field({ nullable: true })
  @Column
  homeTeamId: string;

  @Field(() => Team, { nullable: true })
  @BelongsTo(() => Team, 'awayTeamId')
  away: Team;

  @Field({ nullable: true })
  @Column
  awayScore: number;

  @ForeignKey(() => Team)
  @Field({ nullable: true })
  @Column
  awayTeamId: string;

  @Field({ nullable: true })
  @Column
  synced: Date;

  @Field({ nullable: true })
  @Column
  visualCode: string;

  @Field(() => EncounterChange, { nullable: true })
  @HasOne(() => EncounterChange, {
    foreignKey: 'encounterId',
    onDelete: 'CASCADE',
  })
  encounterChange: EncounterChange;

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
  getDraw!: BelongsToGetAssociationMixin<DrawCompetition>;
  setDraw!: BelongsToSetAssociationMixin<DrawCompetition, string>;

  // Belongs to Home
  getHome!: BelongsToGetAssociationMixin<Team>;
  setHome!: BelongsToSetAssociationMixin<Team, string>;

  // Belongs to Away
  getAway!: BelongsToGetAssociationMixin<Team>;
  setAway!: BelongsToSetAssociationMixin<Team, string>;

  // Has one EncounterChange
  getEncounterChange!: HasOneGetAssociationMixin<EncounterChange>;
  setEncounterChange!: HasOneSetAssociationMixin<EncounterChange, string>;
}
