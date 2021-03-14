import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { SubEventCompetition } from '.';
import { Team } from './team.model';

@Table({
  schema: 'public'
})
export class SubEventMembership extends Model<SubEventMembership> {
  @ForeignKey(() => Team)
  @Column
  teamId: number;

  @ForeignKey(() => SubEventCompetition)
  @Column
  subEventId: number;
}
