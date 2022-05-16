import { Field } from '@nestjs/graphql';
import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Player } from '../player.model';
import { Role } from './role.model';

@Table({
  timestamps: true,
  schema: 'security',
})
export class PlayerRoleMembership extends Model {
  @ForeignKey(() => Player)
  @Field({ nullable: true })
  @Column
  playerId: number;

  @ForeignKey(() => Role)
  @Field({ nullable: true })
  @Column
  roleId: number;
}
