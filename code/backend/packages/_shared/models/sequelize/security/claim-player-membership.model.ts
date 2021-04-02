import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Player } from '../player.model';
import { Claim } from './claim.model';

@Table({
  timestamps: true,
  schema: 'security'
})
export class PlayerClaimMembership extends Model {
  @ForeignKey(() => Player)
  @Column
  userId: number;

  @ForeignKey(() => Claim)
  @Column
  claimId: number;
}
