import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { ClubMembershipEnum } from '../enums';
import { Club } from './club.model';
import { Player } from './player.model';

@Table({
  schema: 'public'
})
export class ClubMembership extends Model<ClubMembership> {
  @ForeignKey(() => Player)
  @Column
  playerId: number;

  @ForeignKey(() => Club)
  @Column
  clubId: number;

  @Column
  start?: Date;

  @Column
  end?: Date;

  @Column(DataType.ENUM('NORMAL', 'LOAN'))
  type: ClubMembershipEnum;
}
