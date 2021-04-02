import { BuildOptions } from 'sequelize';
import {
  AllowNull,
  Column,
  ForeignKey,
  Model,
  Table
} from 'sequelize-typescript';
import { SubEventCompetition } from './event';
import { Team } from './team.model';

@Table({
  schema: 'event'
})
export class TeamSubEventMembership extends Model {
  constructor(
    values?: Partial<TeamSubEventMembership>,
    options?: BuildOptions
  ) {
    super(values, options);
  }

  @ForeignKey(() => SubEventCompetition)
  @AllowNull(false)
  @Column
  subEventId: string;

  @ForeignKey(() => Team)
  @AllowNull(false)
  @Column
  teamId: string;
}
