import { Field } from '@nestjs/graphql';
import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { RankingSystemGroup } from '../../ranking';
import { SubEventTournament } from './sub-event-tournament.model';

@Table({
  timestamps: false,
  schema: 'ranking',
})
export class GroupSubEventTournamentMembership extends Model {
  @PrimaryKey
  @ForeignKey(() => SubEventTournament)
  @Field({ nullable: true })
  @Column
  subEventId: string;

  @PrimaryKey
  @ForeignKey(() => RankingSystemGroup)
  @Field({ nullable: true })
  @Column
  groupId: string;
}
