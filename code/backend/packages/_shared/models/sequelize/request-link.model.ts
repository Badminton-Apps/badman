import {
  Column,
  ForeignKey,
  Model,
  Table,
  BelongsTo,
  PrimaryKey,
  IsUUID,
  Default,
  DataType
} from 'sequelize-typescript';
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

  @BelongsTo(() => Player, 'PlayerId')
  player: Player;

  @ForeignKey(() => Player)
  PlayerId: string;

  @Column
  email: string;
}
