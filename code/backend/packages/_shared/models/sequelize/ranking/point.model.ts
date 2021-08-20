import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import { Game } from '../event/game.model';
import { Player } from '../player.model';
import { RankingSystem } from './system.model';

@Table({
  timestamps: true,
  tableName: 'Points',
  schema: 'ranking'
})
export class RankingPoint extends Model {
  constructor(values?: Partial<RankingPoint>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  points: number;

  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @BelongsTo(() => Game, 'GameId')
  game: Game;

  @BelongsTo(() => RankingSystem, {
    foreignKey: 'SystemId',
    onDelete: 'CASCADE',
  })
  type: RankingSystem;

  @Column
  rankingDate: Date;

  @Column
  differenceInLevel: number;

  @ForeignKey(() => RankingSystem)
  @Index('point_system_index')
  @Column
  SystemId: string;

  @ForeignKey(() => Player)
  @Index('point_system_index')
  @Column
  playerId: string;

  @ForeignKey(() => Game)
  @Column
  GameId: string;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to Game
  getGame!: BelongsToGetAssociationMixin<Game>;
  setGame!: BelongsToSetAssociationMixin<Game, string>;

  // Belongs to Type
  getType!: BelongsToGetAssociationMixin<RankingSystem>;
  setType!: BelongsToSetAssociationMixin<RankingSystem, string>;
}
