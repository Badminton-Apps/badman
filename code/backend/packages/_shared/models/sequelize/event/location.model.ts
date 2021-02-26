import {
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique
} from 'sequelize-typescript';
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyRemoveAssociationMixin
} from 'sequelize';
import { Club } from '../../..';
import { ClubLocation } from '../club-location.model';
import { Court } from './court.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Location extends Model {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Column
  address: string;

  @Column
  postalcode: string;

  @Column
  city: string;

  @Column
  state: string;

  @Column
  phone: string;

  @Column
  fax: string;

  @HasMany(() => Court, 'locationId')
  courts: Court;

  @BelongsToMany(
    () => Club,
    () => ClubLocation
  )
  clubs: Club[];

  public getClubs!: BelongsToManyGetAssociationsMixin<Club>;
  public addClub!: BelongsToManyAddAssociationMixin<Club, string>;
  public removeClub!: BelongsToManyRemoveAssociationMixin<Club, string>;
  public hasClub!: BelongsToManyHasAssociationMixin<Club, string>;
}
