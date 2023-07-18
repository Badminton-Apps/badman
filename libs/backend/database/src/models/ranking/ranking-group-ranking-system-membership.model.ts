import { Field, ID } from '@nestjs/graphql';
import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { RankingSystem } from './ranking-system.model';
import { RankingGroup } from './ranking-group.model';

@Table({
  timestamps: false,
  schema: 'ranking',
})
export class RankingSystemRankingGroupMembership extends Model {
  @ForeignKey(() => RankingSystem)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  systemId?: string;

  @ForeignKey(() => RankingGroup)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  groupId?: string;
}
