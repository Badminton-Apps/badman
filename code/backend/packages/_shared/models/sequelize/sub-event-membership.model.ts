import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { SubEvent } from './event';
import { Team } from './team.model';

@Table({
  schema: 'public'
})
export class SubEventMembership extends Model<SubEventMembership> {
  @ForeignKey(() => Team)
  @Column
  teamId: number;

  @ForeignKey(() => SubEvent)
  @Column
  subEventId: number;
}
