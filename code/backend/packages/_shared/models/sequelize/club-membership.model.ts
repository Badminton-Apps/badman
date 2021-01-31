import {
  Column,
  Index,
  ForeignKey,
  Model,
  Table,
  DataType,
  Unique,
  PrimaryKey,
  AutoIncrement,
  IsUUID,
  Default
} from 'sequelize-typescript';
import { BuildOptions } from 'sequelize/types';
import { Club } from './club.model';
import { Player } from './player.model';

@Table({
  schema: 'public',
})
export class ClubMembership extends Model<ClubMembership> {
  constructor(values?: Partial<ClubMembership>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @ForeignKey(() => Player)
  @Unique('unique_constraint')
  @Column
  playerId: string;

  @ForeignKey(() => Club)
  @Unique('unique_constraint')
  @Column
  clubId: string;

  @Unique('unique_constraint')
  @PrimaryKey
  @Column
  start: Date;

  @Column
  end?: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  active?: boolean;
}
