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
  HasOneSetAssociationMixin
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
  Unique
} from 'sequelize-typescript';
import { DrawCompetition } from './draw-competition.model';
import { Game } from '../game.model';
import { Team } from '../../team.model';
import { EncounterChange } from './encounter-change';

@Table({
  timestamps: true,
  schema: 'event'
})
export class EncounterCompetition extends Model {
  constructor(values?: Partial<EncounterCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  date: Date;

  @Column
  originalDate: Date;

  @HasMany(() => Game, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition'
    }
  })
  games: Game[];

  @BelongsTo(() => DrawCompetition, {
    foreignKey: 'drawId',
    onDelete: 'CASCADE'
  })
  draw?: DrawCompetition[];

  @ForeignKey(() => DrawCompetition)
  @Column
  drawId: string;

  @BelongsTo(() => Team, 'homeTeamId')
  home: Team;

  @ForeignKey(() => Team)
  @Column
  homeTeamId: string;

  @BelongsTo(() => Team, 'awayTeamId')
  away: Team;

  @ForeignKey(() => Team)
  @Column
  awayTeamId: string;

  @HasOne(() => EncounterChange, {
    foreignKey: 'encounterId',
    onDelete: 'CASCADE'
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
  setEncounterChange!: HasOneSetAssociationMixin<EncounterChange, String>;
}
