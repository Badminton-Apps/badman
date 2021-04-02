import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { Location } from '../location.model';
import { EventCompetition } from './event-competition.model';

@Table({
  timestamps: false,
  schema: 'event'
})
export class LocationEventCompetition extends Model {
  @PrimaryKey
  @ForeignKey(() => EventCompetition)
  @Column
  eventId: string;

  @PrimaryKey
  @ForeignKey(() => Location)
  @Column
  locationId: string;
}
