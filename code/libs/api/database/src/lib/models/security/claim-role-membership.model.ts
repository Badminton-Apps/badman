import { Field } from '@nestjs/graphql';
import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Role } from '.';
import { Claim } from './claim.model';

@Table({
  timestamps: true,
  schema: 'security',
})
export class RoleClaimMembership extends Model {
  @ForeignKey(() => Role)
  @Field({ nullable: true })
  @Column
  roleId: number;

  @ForeignKey(() => Claim)
  @Field({ nullable: true })
  @Column
  claimId: number;
}
