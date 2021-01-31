import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
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
export class RankingPoint extends Model<RankingPoint> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  points: number;

  @BelongsTo(() => Player, 'PlayerId')
  player: Player;

  @BelongsTo(() => Game, 'GameId')
  game: Game;

  @BelongsTo(() => RankingSystem, {
    foreignKey: 'SystemId',
    onDelete: 'CASCADE'
  })
  type: RankingSystem;

  @Column
  rankingDate: Date;

  @Column
  differenceInLevel: number;

  @ForeignKey(() => RankingSystem)
  @Column
  SystemId: string;

  @ForeignKey(() => Player)
  @Column
  PlayerId: string;

  @ForeignKey(() => Game)
  @Column
  GameId: string;
}
