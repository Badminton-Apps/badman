import {
  BelongsToMany,
  Column,
  Model,
  Table,
  PrimaryKey,
  AutoIncrement,
  Unique,
  HasMany
} from 'sequelize-typescript';
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  HasManyGetAssociationsMixin
} from 'sequelize/types';
import { Team } from '../..';
import { ClubMembership } from './club-membership.model';
import { Player } from './player.model';

@Table({
  timestamps: true,
  schema: 'public'
})
export class Club extends Model<Club> {
  @Column
  name: string;

  @Column
  abbreviation: string;

  @Column
  clubId?: number;

  @HasMany(() => Team, 'ClubId')
  teams?: Team[];

  @BelongsToMany(
    () => Player,
    () => ClubMembership
  )
  players: Player[];

  public getPlayers!: BelongsToManyGetAssociationsMixin<Player>; // Note the null assertions!
  public addPlayer!: BelongsToManyAddAssociationMixin<Player, number>;
  public hasPlayer!: BelongsToManyHasAssociationMixin<Player, number>;
}
