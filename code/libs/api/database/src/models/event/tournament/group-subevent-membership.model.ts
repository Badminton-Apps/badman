import { Field } from '@nestjs/graphql';
import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { RankingGroup } from '../../ranking';
import { SubEventTournament } from './sub-event-tournament.model';

@Table({
  timestamps: false,
  schema: 'ranking',
})
export class RankingGroupSubEventTournamentMembership extends Model {
  @PrimaryKey
  @ForeignKey(() => SubEventTournament)
  @Field({ nullable: true })
  @Column
  subEventId: string;

  @PrimaryKey
  @ForeignKey(() => RankingGroup)
  @Field({ nullable: true })
  @Column
  groupId: string;
}
