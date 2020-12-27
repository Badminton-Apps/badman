import {
  BelongsToMany,
  Column,
  Model,
  Table,
  PrimaryKey,
  AutoIncrement,
  Unique
} from 'sequelize-typescript';
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
  clubId?: number;

  @BelongsToMany(
    () => Player,
    () => ClubMembership
  )
  players: Player[];
}
 