import { BelongsTo, BelongsToMany, Model, Table, Column } from 'sequelize-typescript';
import { Club } from './club.model';
import { Player } from './player.model';
import { SubEventMembership } from './sub-event-membership.model';
import { SubEvent } from './sub-event.model';
import { TeamMembership } from './team-membership.model';

@Table({
  timestamps: true,
  schema: "public"
})
export class Team extends Model<Team> {
  @Column
  name: string;

  @BelongsTo(() => Club, 'ClubId')
  club?: Club;

  @BelongsToMany(
    () => Player,
    () => TeamMembership
  )
  players: Player[];

  @BelongsToMany(
    () => SubEvent,
    () => SubEventMembership
  )
  subEvents: SubEvent[];
}
 