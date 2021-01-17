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
import { Team } from '../..';
import { ClubMembership } from './club-membership.model';
import { Player } from './player.model';

@Table({
  timestamps: true,
  schema: "public"
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
}
 