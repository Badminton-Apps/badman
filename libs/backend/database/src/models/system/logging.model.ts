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
  Table,
} from 'sequelize-typescript';
import { Relation } from '../../wrapper';
import { Player } from '../player.model';
import { InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { LoggingAction } from '@badman/utils';

@Table({
  timestamps: true,
  schema: 'system',
  tableName: 'Logs',
})
export class Logging extends Model<InferAttributes<Logging>, InferCreationAttributes<Logging>> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  declare updatedAt?: Date;
  declare createdAt?: Date;

  @BelongsTo(() => Player, 'playerId')
  player?: Relation<Player>;

  @ForeignKey(() => Player)
  @Index
  @Column(DataType.UUIDV4)
  playerId?: string;

  @Column(DataType.STRING)
  action!: LoggingAction;

  @Column({
    type: DataType.JSON,
  })
  meta?: unknown;
}
