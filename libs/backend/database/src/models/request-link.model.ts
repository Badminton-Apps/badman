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
import { Relation } from '../wrapper';

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
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => String, {nullable: true })
  @Column(DataType.STRING)
  sub?: string;

  @BelongsTo(() => Player, 'playerId')
  player?: Relation<Player>;

  @ForeignKey(() => Player)
  @Index
  @Field(() => ID, {nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;
}
