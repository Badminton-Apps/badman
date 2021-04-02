import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Role } from '.';
import { Player } from '../player.model';
import { Claim } from './claim.model';

@Table({
  timestamps: true,
  schema: 'security'
})
export class RoleClaimMembership extends Model {
  @ForeignKey(() => Role)
  @Column
  roleId: number;

  @ForeignKey(() => Claim)
  @Column
  claimId: number;
}
