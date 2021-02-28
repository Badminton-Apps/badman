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
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions
} from 'sequelize';
import { Game } from './game.model';
import { Location } from './location.model';

@Table({
  timestamps: true,
  schema: 'event' 
} as TableOptions)
export class Court extends Model {
  constructor(values?: Partial<Court>, options?: BuildOptions) {
    super(values, options);
  }

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

  // Belongs to Location
  getLocation!: BelongsToGetAssociationMixin<Location>;
  setLocation!: BelongsToSetAssociationMixin<Location, string>;
}
