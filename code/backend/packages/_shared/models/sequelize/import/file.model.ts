import { table } from 'console';
import {
  Column,
  HasMany,
  Model,
  DataType,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { ImportSubEvents } from '.';
import { EventType } from '../../enums/eventType.enum';

@Table({
  timestamps: true,
  tableName: 'Files',
  schema: 'import'
} as TableOptions)
export class ImporterFile extends Model<ImporterFile> {
  @Column
  name: string;

  @Column(DataType.ENUM('COMPETITION_CP', 'COMPETITION_XML', 'TOERNAMENT'))
  type: EventType;

  @Column
  fileLocation: string;

  @Column
  firstDay: Date;

  @Column
  dates: string;

  @Column
  linkCode: string;

  @Column
  webID: string;

  @Column
  uniCode: string;

  @Column
  importing: boolean;

  @HasMany(() => ImportSubEvents, 'FileId')
  subEvents: ImportSubEvents[];
}
