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
  Index,
} from 'sequelize-typescript';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
} from 'sequelize';
import { Player } from './player.model';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@Table({
  timestamps: true,
  schema: 'public',
})
@ObjectType({ description: 'A RequestLink' })
export class RequestLink extends Model {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  sub: string;

  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @ForeignKey(() => Player)
  @Index
  @Field({ nullable: true })
  @Column
  playerId: string;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;
}
