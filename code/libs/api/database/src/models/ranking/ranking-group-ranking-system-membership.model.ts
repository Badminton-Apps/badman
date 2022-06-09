import { Field } from '@nestjs/graphql';
import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { RankingSystem } from './ranking-system.model';
import { RankingGroup } from './ranking-group.model';

@Table({
  timestamps: false,
  schema: 'ranking',
})
export class RankingSystemRankingGroupMembership extends Model {
  @ForeignKey(() => RankingSystem)
  @Field({ nullable: true })
  @Column
  systemId: string;

  @ForeignKey(() => RankingGroup)
  @Field({ nullable: true })
  @Column
  groupId: string;
}
