import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions, HasOneGetAssociationMixin, HasOneSetAssociationMixin } from 'sequelize';
import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasOne,
  Model,
  Table,
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

  @Column({
    type: DataType.STRING,
    field: 'meta'
  })
  private _meta!: string;

  get meta(): TeamSubEventMembershipBadmintonBvlMembershipMeta {
    return JSON.parse(this._meta);
  }

  set meta(value: TeamSubEventMembershipBadmintonBvlMembershipMeta) {
    this._meta = JSON.stringify(value);
  }
}

export interface TeamSubEventMembershipBadmintonBvlMembershipMeta {
  teamIndex: number;
  players: TeamSubEventMembershipBadmintonBvlMembershipPlayerMeta[];
}

export interface TeamSubEventMembershipBadmintonBvlMembershipPlayerMeta {
  id: string;
  single: number;
  double: number;
  mix: number;
  gender: string;
}
