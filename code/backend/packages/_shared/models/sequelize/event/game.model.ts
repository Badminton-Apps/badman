import {
  BelongsToGetAssociationMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
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
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { GameType } from '../../enums';
import { Player } from '../player.model';
import { RankingPoint } from '../ranking';
import { DrawTournament, DrawCompetition } from '../../..';
import { Court } from './court.model';
import { GamePlayer } from './game-player.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Game extends Model {
  constructor(values?: Partial<Game>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  playedAt: Date;

  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Column
  set1Team1?: number;
  @Column
  set1Team2?: number;
  @Column
  set2Team1?: number;
  @Column
  set2Team2?: number;
  @Column
  set3Team1?: number;
  @Column
  set3Team2?: number;

  @Column
  winner?: number;

  @BelongsTo(() => DrawTournament, {
    foreignKey: 'drawId',
    constraints: false,
    scope: {
      drawType: 'tournament'
    }
  })
  drawTournament: DrawTournament;
  rankingPoints?: RankingPoint[];
  @HasMany(() => RankingPoint, 'GameId')

  @BelongsTo(() => DrawCompetition, {
    foreignKey: 'drawId',
    constraints: false,
    scope: {
      drawType: 'competition'
    }
  })
  drawCompetition: DrawCompetition;

  @Column
  drawId: string;

  @Column
  drawType: string;

  @BelongsTo(() => Court, 'courtId')
  court: Court;

  @ForeignKey(() => Court)
  @Column
  courtId: string;

  @BelongsToMany(
    () => Player,
    () => GamePlayer
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  players: (Player & { GamePlayer: GamePlayer })[];

  // Has many RankingPoint
  getRankingPoints!: HasManyGetAssociationsMixin<RankingPoint>;
  setRankingPoints!: HasManySetAssociationsMixin<RankingPoint, string>;
  addRankingPoints!: HasManyAddAssociationsMixin<RankingPoint, string>;
  addRankingPoint!: HasManyAddAssociationMixin<RankingPoint, string>;
  removeRankingPoint!: HasManyRemoveAssociationMixin<RankingPoint, string>;
  removeRankingPoints!: HasManyRemoveAssociationsMixin<RankingPoint, string>;
  hasRankingPoint!: HasManyHasAssociationMixin<RankingPoint, string>;
  hasRankingPoints!: HasManyHasAssociationsMixin<RankingPoint, string>;
  countRankingPoints!: HasManyCountAssociationsMixin;

  // Belongs to Draw
  getDrawTournament!: BelongsToGetAssociationMixin<DrawTournament>;
  setDrawTournament!: BelongsToSetAssociationMixin<DrawTournament, string>;

  // Belongs to DrawCompetition
  getDrawCompetition!: BelongsToGetAssociationMixin<DrawCompetition>;
  setDrawCompetition!: BelongsToSetAssociationMixin<DrawCompetition, string>;

  // Belongs to Court
  getCourt!: BelongsToGetAssociationMixin<Court>;
  setCourt!: BelongsToSetAssociationMixin<Court, string>;

  // Belongs to many Player
  getPlayers!: BelongsToManyGetAssociationsMixin<Player>;
  setPlayer!: BelongsToManySetAssociationsMixin<Player, string>;
  addPlayers!: BelongsToManyAddAssociationsMixin<Player, string>;
  addPlayer!: BelongsToManyAddAssociationMixin<Player, string>;
  removePlayer!: BelongsToManyRemoveAssociationMixin<Player, string>;
  removePlayers!: BelongsToManyRemoveAssociationsMixin<Player, string>;
  hasPlayer!: BelongsToManyHasAssociationMixin<Player, string>;
  hasPlayers!: BelongsToManyHasAssociationsMixin<Player, string>;
  countPlayer!: BelongsToManyCountAssociationsMixin;
}
