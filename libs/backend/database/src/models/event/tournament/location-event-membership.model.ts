import { Field, ID } from '@nestjs/graphql';
import { Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Location } from '../location.model';
import { EventTournament } from './event-tournament.model';

@Table({
  timestamps: false,
  schema: 'event',
})
export class LocationEventTournamentMembership extends Model {
  @PrimaryKey
  @ForeignKey(() => EventTournament)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  eventId?: string;

  @PrimaryKey
  @ForeignKey(() => Location)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  locationId?: string;
}
