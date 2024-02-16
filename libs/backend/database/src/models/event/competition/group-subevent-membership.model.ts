import { Field, ID } from '@nestjs/graphql';
import { Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { RankingGroup } from '../../ranking';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: false,
  schema: 'ranking',
})
export class RankingGroupSubEventCompetitionMembership extends Model {
  @PrimaryKey
  @ForeignKey(() => SubEventCompetition)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  subEventId?: string;

  @PrimaryKey
  @ForeignKey(() => RankingGroup)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  groupId?: string;
}
