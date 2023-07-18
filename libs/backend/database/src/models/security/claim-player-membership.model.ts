import { Field, ID } from '@nestjs/graphql';
import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Player } from '../player.model';
import { Claim } from './claim.model';

@Table({
  timestamps: true,
  schema: 'security',
})
export class PlayerClaimMembership extends Model {
  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  @ForeignKey(() => Claim)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  claimId?: string;
}
