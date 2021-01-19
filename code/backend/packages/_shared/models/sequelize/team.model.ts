import {
  BelongsTo,
  BelongsToMany,
  Column,
  ForeignKey,
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
  @Column({ unique: 'unique_constraint' })
  name: string;

  @Column
  abbreviation: string;

  @BelongsTo(() => SubEvent, 'SubEventId')
  subEvents?: SubEvent;

  @BelongsTo(() => Club, 'ClubId')
  club?: Club;

  @ForeignKey(() => Club)
  @Column({ unique: 'unique_constraint' })
  ClubId: number;

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
