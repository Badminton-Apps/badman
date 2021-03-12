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
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  schema: 'public'
})
export class TeamPlayerMembership extends Model {
  constructor(values?: Partial<TeamPlayerMembership>, options?: BuildOptions) {
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

  @AllowNull(false)
  @Default(false)
  @Column
  base: boolean;

  // Below is a hacky way to make the Unique across FK's + start
  // issue: (https://github.com/sequelize/sequelize/issues/12988)
  @Unique('TeamPlayerMemberships_teamId_playerId_unique')
  @AllowNull(false)
  @Column
  start: Date;

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;
}
