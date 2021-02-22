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
import { ImportSubEvent } from '.';
import { EventImportType } from '../../enums/eventType.enum';

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
  tournamentNumber: number;

  @HasMany(() => ImportSubEvent, 'FileId')
  subEvents: ImportSubEvent[];
}
