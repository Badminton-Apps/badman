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
  Default,
  Index,
  HasMany
} from 'sequelize-typescript';
import { BuildOptions } from 'sequelize/types';
import {
  DrawType,
  GameType,
  ImporterFile,
  LevelType,
  SubEventType
} from '../../../models';
import { ImportDraw } from './import-draw.model';

@Table({
  tableName: 'SubEvents',
  schema: 'import'
} as TableOptions)
export class ImportSubEvent extends Model {
  constructor(values?: Partial<ImportSubEvent>, options?: BuildOptions){
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

  @Unique('unique_constraint')
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAAL'))
  levelType: LevelType;

  @Column
  level?: number;

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @HasMany(() => ImportDraw, 'SubEventId')
  draws: ImportDraw[];

  @BelongsTo(() => ImporterFile, 'FileId')
  file: ImporterFile[];

  @Unique('unique_constraint')
  @ForeignKey(() => ImporterFile)
  @Column
  FileId: string;
}
