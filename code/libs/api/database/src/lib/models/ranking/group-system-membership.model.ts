import { Field } from '@nestjs/graphql';
import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { RankingSystem } from './system.model';
import { RankingSystemGroup } from './group.model';

@Table({
  timestamps: false,
  schema: 'ranking',
})
export class GroupSystemsMembership extends Model {
  @ForeignKey(() => RankingSystem)
  @Field({ nullable: true })
  @Column
  systemId: string;

  @ForeignKey(() => RankingSystemGroup)
  @Field({ nullable: true })
  @Column
  groupId: string;
}
