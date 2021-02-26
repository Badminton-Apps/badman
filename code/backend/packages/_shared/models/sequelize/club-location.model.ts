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
  Default,
  NotNull,
  AllowNull
} from 'sequelize-typescript';
import { BuildOptions } from 'sequelize/types';
import { Club } from './club.model';
import { Location } from './event/location.model';

@Table({
  schema: 'public'
})
export class ClubLocation extends Model {
  constructor(values?: Partial<ClubLocation>, options?: BuildOptions) {
    super(values, options);
  }
  @ForeignKey(() => Location)
  @AllowNull(false)
  @Column
  locationId: string;

  @ForeignKey(() => Club)
  @AllowNull(false)
  @Column
  clubId: string;
}
