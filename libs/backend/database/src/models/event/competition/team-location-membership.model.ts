import { Field, ID } from '@nestjs/graphql';
import { Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Team } from '../../team.model';
import { Location } from '../location.model';

@Table({
  timestamps: false,
  schema: 'event',
})
export class TeamLocationCompetition extends Model {
  @PrimaryKey
  @ForeignKey(() => Team)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  teamId?: string;

  @PrimaryKey
  @ForeignKey(() => Location)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  locationId?: string;
}
