import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table
} from 'sequelize-typescript';
import { TeamMembershipType } from '../enums';
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  schema: 'public'
})
export class TeamMembership extends Model<TeamMembership> {
  @ForeignKey(() => Player)
  @Column
  playerId: number;

  @ForeignKey(() => Team)
  @Column
  teamId: number;

  @Column(DataType.ENUM('BASE', 'NORMAL'))
  type: TeamMembershipType;

  @Column
  start: Date;

  @Column
  end?: Date;
}
