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
  @Column({ unique: 'unique_constraint' })
  playerId: number;

  @ForeignKey(() => Team)
  @Column({ unique: 'unique_constraint' })
  teamId: number;

  start: Date;

  @Column
  end?: Date;
}
