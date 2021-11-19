import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Player } from '../player.model';
import { Role } from './role.model';

@Table({
  timestamps: true,
  schema: 'security'
})
export class PlayerRoleMembership extends Model {
  @ForeignKey(() => Player)
  @Column
  playerId: number;

  @ForeignKey(() => Role)
  @Column
  roleId: number;
}
