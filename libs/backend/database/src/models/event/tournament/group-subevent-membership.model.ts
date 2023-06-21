import { Field, ID } from '@nestjs/graphql';
import {
  Column,
  DataType,
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
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  subEventId: string;

  @PrimaryKey
  @ForeignKey(() => RankingGroup)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  groupId: string;
}
