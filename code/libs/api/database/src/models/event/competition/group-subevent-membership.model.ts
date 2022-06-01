import { Field } from '@nestjs/graphql';
import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { RankingGroups } from '../../ranking';
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
  @ForeignKey(() => RankingGroups)
  @Field({ nullable: true })
  @Column
  groupId: string;
}
