import {
  Column,
  HasOne,
  DataType,
  Model,
  Table,
  TableOptions,
  BelongsTo
} from 'sequelize-typescript';
import { DrawType, GameType, ImporterFile, LevelType, SubEventType } from '../../../models';

@Table({
  tableName: 'SubEvents',
  schema: 'import'
} as TableOptions)
export class ImportSubEvents extends Model<ImportSubEvents> {
  @Column
  name: string;

  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  drawType: DrawType;

  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAAL'))
  levelType: LevelType;

  @Column
  level?: number;

  @Column
  size: number;

  @Column
  internalId: number;

  @BelongsTo(() => ImporterFile, 'FileId')
  file: ImporterFile[];
}
