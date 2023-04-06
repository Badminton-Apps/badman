import { Field } from '@nestjs/graphql';
import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { RankingGroup } from '../../ranking';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: false,
  schema: 'ranking',
})
export class RankingGroupSubEventCompetitionMembership extends Model {
  @PrimaryKey
  @ForeignKey(() => SubEventCompetition)
  @Field({ nullable: true })
  @Column
  subEventId: string;

  @PrimaryKey
  @ForeignKey(() => RankingGroup)
  @Field({ nullable: true })
  @Column
  groupId: string;
}
