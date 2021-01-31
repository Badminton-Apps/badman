import {
  Column,
  HasOne,
  DataType,
  Model,
  Table,
  TableOptions,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  Unique,
  IsUUID,
  Default
} from 'sequelize-typescript';
import {
  DrawType,
  GameType,
  ImporterFile,
  LevelType,
  SubEventType
} from '../../../models';

@Table({
  tableName: 'SubEvents',
  schema: 'import'
} as TableOptions)
export class ImportSubEvents extends Model<ImportSubEvents> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  drawType: DrawType;

  @Unique('unique_constraint')
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

  @ForeignKey(() => ImporterFile)
  @Column
  FileId: string;
}
