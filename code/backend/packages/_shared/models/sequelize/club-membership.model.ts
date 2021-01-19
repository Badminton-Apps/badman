import { Column, ForeignKey, Model, Table, DataType } from 'sequelize-typescript';
import { Club } from './club.model';
import { Player } from './player.model';

@Table({
  schema: "public"
})
export class ClubMembership extends Model<ClubMembership> {
  @ForeignKey(() => Player)
  @Column({ unique: 'unique_constraint' })
  playerId: number;

  @ForeignKey(() => Club)
  @Column({ unique: 'unique_constraint' })
  clubId: number;

  @Column
  start?: Date;

  @Column
  end?: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  active?: boolean;
}
