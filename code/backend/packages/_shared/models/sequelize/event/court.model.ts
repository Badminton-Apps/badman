import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique
} from 'sequelize-typescript';
import { Game, Location } from '.';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Court extends Model<Court> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @HasMany(() => Game, 'courtId')
  games: Game[];

  @BelongsTo(() => Location, 'locationId')
  location: Location;

  @ForeignKey(() => Location)
  @Unique('unique_constraint')
  @Column
  locationId: string;
}
