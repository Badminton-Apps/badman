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
import { EventImportType } from '../../enums/eventType.enum';

@Table({
  timestamps: true,
  tableName: 'Files',
  schema: 'import'
} as TableOptions)
export class ImporterFile extends Model<ImporterFile> {
  @Column({ unique: 'unique_constraint' })
  name: string;

  @Column({
    unique: 'unique_constraint',
    type: DataType.ENUM('COMPETITION_CP', 'COMPETITION_XML', 'TOERNAMENT')
  })
  type: EventImportType;

  @Column
  fileLocation: string;

  @Column({ unique: 'unique_constraint' })
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

  @Column
  toernamentNumber: number;

  @HasMany(() => ImportSubEvents, 'FileId')
  subEvents: ImportSubEvents[];
}
