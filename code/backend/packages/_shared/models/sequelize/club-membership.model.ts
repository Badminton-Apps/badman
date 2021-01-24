import { Column, ForeignKey, Model, Table, DataType } from 'sequelize-typescript';
import { BuildOptions } from 'sequelize/types';
import { Club } from './club.model';
import { Player } from './player.model';

@Table({
  schema: "public"
})
export class ClubMembership extends Model<ClubMembership> {
  constructor(values?: Partial<ClubMembership>, options?: BuildOptions) {
    super(values, options);
  }

  @ForeignKey(() => Player)
  @Column({ unique: 'unique_constraint' })
  playerId: number;

  @ForeignKey(() => Club)
  @Column({ unique: 'unique_constraint' })
  clubId: number;

  @Column({ unique: 'unique_constraint' })
  start: Date;

  @Column
  end?: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  active?: boolean;
}
