import { BelongsTo, BelongsToMany, Model, Table, Column } from 'sequelize-typescript';
import { Club } from './club.model';
import { Player } from './player.model';
import { SubEvent } from './event';
import { TeamMembership } from './team-membership.model';

@Table({
  timestamps: true,
  schema: "public"
})
export class Team extends Model<Team> {
  @Column
  name: string;

  @BelongsTo(() => SubEvent, 'SubEventId')
  subEvents?: SubEvent;

  @BelongsTo(() => Club, 'ClubId')
  club?: Club;

  @BelongsToMany(
    () => Player,
    () => TeamMembership
  )
  players: Player[];
}
 