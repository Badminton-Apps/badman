import { Field } from '@nestjs/graphql';
import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Player } from '../player.model';
import { Claim } from './claim.model';

@Table({
  timestamps: true,
  schema: 'security',
})
export class PlayerClaimMembership extends Model {
  @ForeignKey(() => Player)
  @Field({ nullable: true })
  @Column
  playerId: number;

  @ForeignKey(() => Claim)
  @Field({ nullable: true })
  @Column
  claimId: number;
}
