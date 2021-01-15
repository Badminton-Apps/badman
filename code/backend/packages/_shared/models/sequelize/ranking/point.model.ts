import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
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
  SystemId: number;

  @ForeignKey(() => Player)
  PlayerId: number;

  @ForeignKey(() => Game)
  GameId: number;
}
