import { table } from 'console';
import {
  Column,
  HasMany,
  Model,
  DataType,
  Table,
  TableOptions,
  PrimaryKey,
  IsUUID,
  Unique,
  Default
} from 'sequelize-typescript';
import { ImportSubEvent } from './import-sub-events.model';
import { EventImportType } from '../../enums/eventType.enum';
import {
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize';

@Table({
  timestamps: true,
  tableName: 'Files',
  schema: 'import'
} as TableOptions)
export class ImporterFile extends Model {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('COMPETITION_CP', 'COMPETITION_XML', 'TOERNAMENT'))
  type: EventImportType;

  @Unique('unique_constraint')
  @Column
  firstDay: Date;

  @Column
  fileLocation: string;

  @Column
  dates: string;

  @Column
  linkCode: string;

  @Column
  webID: string;

  @Column
  uniCode: string;

  @Default(false)
  @Column
  importing: boolean;

  @Column
  toernamentNumber: number;

  @HasMany(() => ImportSubEvent, { foreignKey: 'FileId', onDelete: 'CASCADE' })
  subEvents: ImportSubEvent[];

  // Has many SubEvent
  getSubEvents!: HasManyGetAssociationsMixin<ImportSubEvent>;
  setSubEvents!: HasManySetAssociationsMixin<ImportSubEvent, string>;
  addSubEvents!: HasManyAddAssociationsMixin<ImportSubEvent, string>;
  addSubEvent!: HasManyAddAssociationMixin<ImportSubEvent, string>;
  removeSubEvent!: HasManyRemoveAssociationMixin<ImportSubEvent, string>;
  removeSubEvents!: HasManyRemoveAssociationsMixin<ImportSubEvent, string>;
  hasSubEvent!: HasManyHasAssociationMixin<ImportSubEvent, string>;
  hasSubEvents!: HasManyHasAssociationsMixin<ImportSubEvent, string>;
  countSubEvents!: HasManyCountAssociationsMixin;
}
