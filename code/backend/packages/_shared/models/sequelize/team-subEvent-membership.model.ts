import { BuildOptions } from 'sequelize';
import {
  AllowNull,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { SubEventCompetition } from './event';
import { Team } from './team.model';

@Table({
  schema: 'public'
})
export class TeamSubEventMembership extends Model {
  @ForeignKey(() => SubEventCompetition)
  @AllowNull(false)
  @Column
  subEventId: string;

  @ForeignKey(() => Team)
  @AllowNull(false)
  @Column
  teamId: string;
}
