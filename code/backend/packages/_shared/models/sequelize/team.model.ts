import { BelongsTo, BelongsToMany, Model, Table, Column } from 'sequelize-typescript';
import { Player } from './player.model';
import { SubEvent } from './sub-event.model';
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

  @BelongsToMany(
    () => Player,
    () => TeamMembership
  )
  players: Player[];
}
