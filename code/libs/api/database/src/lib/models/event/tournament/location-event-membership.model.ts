import { Field } from '@nestjs/graphql';
import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Location } from '../location.model';
import { EventTournament } from './event-tournament.model';

@Table({
  timestamps: false,
  schema: 'event',
})
export class LocationEventTournamentMembership extends Model {
  @PrimaryKey
  @ForeignKey(() => EventTournament)
  @Field({ nullable: true })
  @Column
  eventId: string;

  @PrimaryKey
  @ForeignKey(() => Location)
  @Field({ nullable: true })
  @Column
  locationId: string;
}
