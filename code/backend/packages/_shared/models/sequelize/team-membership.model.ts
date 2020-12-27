import {
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  Model
} from 'sequelize-typescript';
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  schema: "public"
})
export class TeamMembership extends Model<TeamMembership> {
  @ForeignKey(() => Player)
  @Column
  playerId: number;

  @ForeignKey(() => Team)
  @Column
  teamId: number;

  @Column
  start: Date;

  @Column
  end?: Date;
}
