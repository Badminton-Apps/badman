import { Field } from '@nestjs/graphql';
import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Team } from '../../team.model';
import { Location } from '../location.model';

@Table({
  timestamps: false,
  schema: 'event',
})
export class TeamLocationCompetition extends Model {
  @PrimaryKey
  @ForeignKey(() => Team)
  @Field({ nullable: true })
  @Column
  teamId: string;

  @PrimaryKey
  @ForeignKey(() => Location)
  @Field({ nullable: true })
  @Column
  locationId: string;
}
