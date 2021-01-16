import { BelongsTo, Column, HasMany, Model, Table, TableOptions } from 'sequelize-typescript';
import { Game, Location } from '.';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Court extends Model<Court> {
  @Column
  name: string;

  @HasMany(() => Game, 'courtId')
  games: Game[];

  @BelongsTo(() => Location, 'locationId')
  location: Location;
}
