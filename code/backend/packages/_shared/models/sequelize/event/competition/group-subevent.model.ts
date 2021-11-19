import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { RankingSystemGroup } from '../../ranking';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: false,
  schema: 'ranking'
})
export class GroupSubEventCompetition extends Model {
  @PrimaryKey
  @ForeignKey(() => SubEventCompetition)
  @Column
  subEventId: string;

  @PrimaryKey
  @ForeignKey(() => RankingSystemGroup)
  @Column
  groupId: string;
}
