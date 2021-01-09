import {
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  Model
} from 'sequelize-typescript';
import { SubEvent } from '../..';
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  schema: "public"
})
export class SubEventMembership extends Model<SubEventMembership> {
  @ForeignKey(() => Team)
  @Column
  teamId: number;

  @ForeignKey(() => SubEvent)
  @Column
  subEventId: number;
}
