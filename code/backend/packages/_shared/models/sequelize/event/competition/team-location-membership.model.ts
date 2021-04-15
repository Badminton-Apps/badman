import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import { Team } from '../../team.model';
import { Location } from '../location.model';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: false,
  schema: 'event'
})
export class TeamLocationCompetition extends Model {
  @PrimaryKey
  @ForeignKey(() => Team)
  @Column
  teamId: string; 

  @PrimaryKey
  @ForeignKey(() => Location)
  @Column
  locationId: string;
}
