import {
  BelongsTo,
  Column,
  ForeignKey,
  HasMany,
  Model,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { Game, Location } from '.';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Court extends Model<Court> {
  @Column({ unique: 'unique_constraint' })
  name: string;

  @HasMany(() => Game, 'courtId')
  games: Game[];

  @BelongsTo(() => Location, 'locationId')
  location: Location;

  @ForeignKey(() => Location)
  @Column({ unique: 'unique_constraint' })
  locationId: number;
}
