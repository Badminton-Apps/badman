import {
  BelongsTo,
  BelongsToMany,
  Column,
  Model,
  Table
} from 'sequelize-typescript';
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyRemoveAssociationMixin
} from 'sequelize/types';
import { Club } from './club.model';
import { SubEvent } from './event';
import { Player } from './player.model';
import { TeamMembership } from './team-membership.model';

@Table({
  timestamps: true,
  schema: 'public'
})
export class Team extends Model<Team> {
  @Column
  name: string;

  @Column
  abbreviation: string;

  @BelongsTo(() => SubEvent, 'SubEventId')
  subEvents?: SubEvent;

  @BelongsTo(() => Club, 'ClubId')
  club?: Club;

  @BelongsToMany(
    () => Player,
    () => TeamMembership
  )
  players: Player[];

  public getPlayers!: BelongsToManyGetAssociationsMixin<Player>;
  public addPlayer!: BelongsToManyAddAssociationMixin<Player, number>;
  public removePlayer!: BelongsToManyRemoveAssociationMixin<Player, number>;
  public hasPlayer!: BelongsToManyHasAssociationMixin<Player, number>;
}
