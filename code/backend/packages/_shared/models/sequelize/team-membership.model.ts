import {
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  Model
} from 'sequelize-typescript';
import { BuildOptions } from 'sequelize/types';
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  schema: 'public'
})
export class TeamMembership extends Model<TeamMembership> {
  constructor(values?: Partial<TeamMembership>, options?: BuildOptions) {
    super(values, options);
  }

  @ForeignKey(() => Player)
  @Column({ unique: 'unique_constraint' })
  playerId: number;

  @ForeignKey(() => Team)
  @Column({ unique: 'unique_constraint' })
  teamId: number;

  @Column({ unique: 'unique_constraint' })
  start: Date;

  @Column
  end?: Date;
}
