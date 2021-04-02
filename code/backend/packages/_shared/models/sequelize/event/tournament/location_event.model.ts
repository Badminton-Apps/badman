import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { Location } from '../location.model';
import { EventTournament } from './event-tournament.model';

@Table({
  timestamps: false,
  schema: 'event'
})
export class LocationEventTournament extends Model {
  @PrimaryKey
  @ForeignKey(() => EventTournament)
  @Column
  eventId: string;

  @PrimaryKey
  @ForeignKey(() => Location)
  @Column
  locationId: string;
}
