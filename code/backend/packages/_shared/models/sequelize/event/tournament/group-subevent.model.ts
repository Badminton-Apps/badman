import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { RankingSystemGroup } from '../../ranking';
import { SubEventTournament } from './sub-event-tournament.model';

@Table({
  timestamps: false,
  schema: 'ranking'
})
export class GroupSubEventTournament extends Model {
  @PrimaryKey
  @ForeignKey(() => SubEventTournament)
  @Column
  subEventId: string;

  @PrimaryKey
  @ForeignKey(() => RankingSystemGroup)
  @Column
  groupId: string;
}
