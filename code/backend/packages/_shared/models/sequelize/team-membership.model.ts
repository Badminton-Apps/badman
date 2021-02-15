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
  Default,
  NotNull,
  AllowNull
} from 'sequelize-typescript';
import { BuildOptions } from 'sequelize/types';
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  schema: 'public'
})
export class TeamMembership extends Model {
  constructor(values?: Partial<TeamMembership>, options?: BuildOptions) {
    super(values, options);
  }

  @ForeignKey(() => Player)
  @AllowNull(false)
  @Column
  playerId: string;

  @ForeignKey(() => Team)
  @AllowNull(false)
  @Column
  teamId: string;

  
  @Column
  end?: Date;

  // Below is a hacky way to make the Unique across FK's + start
  // issue: (https://github.com/sequelize/sequelize/issues/12988)
  @Unique('TeamMemberships_teamId_playerId_unique')
  @AllowNull(false)
  @Column
  start: Date;

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

}
