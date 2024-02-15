import { Field, ID } from '@nestjs/graphql';
import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Player } from '../player.model';
import { Role } from './role.model';

@Table({
  timestamps: true,
  schema: 'security',
})
export class PlayerRoleMembership extends Model {
  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;
  
  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  @ForeignKey(() => Role)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  roleId?: string;
}
