import {
  Column,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  PrimaryKey,
  IsUUID,
  Default,
  DataType,
  Index
} from 'sequelize-typescript';
import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin } from 'sequelize';
import { Player } from './player.model';

@Table({
  timestamps: true,
  schema: 'public'
})
export class RequestLink extends Model {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  sub: string

  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @ForeignKey(() => Player)
  @Index
  @Column
  playerId: string;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;
}
