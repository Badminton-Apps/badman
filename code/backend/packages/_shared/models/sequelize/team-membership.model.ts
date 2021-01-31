import {
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  Model,
  PrimaryKey,
  IsUUID,
  Unique,
  DataType,
  Default
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

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @ForeignKey(() => Player)
  @Unique('unique_constraint')
  @Column
  playerId: string;

  @ForeignKey(() => Team)
  @Unique('unique_constraint')
  @Column
  teamId: string;

  @Unique('unique_constraint')
  @Column
  start: Date;

  @Column
  end?: Date;
}
