import { Column, ForeignKey, Model, Table, BelongsTo } from 'sequelize-typescript';
import { Player } from './player.model';

@Table({
  timestamps: true,
  schema: "public"
})
export class RequestLink extends Model<RequestLink> {
  @BelongsTo(() => Player, 'PlayerId')
  player: Player;

  @ForeignKey(() => Player)
  PlayerId: number;

  @Column
  email: string;
}
