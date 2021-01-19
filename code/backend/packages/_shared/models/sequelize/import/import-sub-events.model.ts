import {
  Column,
  HasOne,
  DataType,
  Model,
  Table,
  TableOptions,
  BelongsTo,
  ForeignKey
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
  @Column({ unique: 'unique_constraint' })
  name: string;

  @Column({
    unique: 'unique_constraint',
    type: DataType.ENUM('M', 'F', 'MX', 'MINIBAD')
  })
  eventType: SubEventType;

  @Column({ unique: 'unique_constraint', type: DataType.ENUM('S', 'D', 'MX') })
  gameType: GameType;

  @Column({
    unique: 'unique_constraint',
    type: DataType.ENUM('KO', 'POULE', 'QUALIFICATION')
  })
  drawType: DrawType;

  @Column({
    unique: 'unique_constraint',
    type: DataType.ENUM('PROV', 'LIGA', 'NATIONAAL')
  })
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
  @Column({ unique: 'unique_constraint' })
  FileId: number;
}
