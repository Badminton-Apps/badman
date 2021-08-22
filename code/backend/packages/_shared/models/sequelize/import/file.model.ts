import {
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique
} from 'sequelize-typescript';
import { BuildOptions } from 'sequelize';
import { EventImportType } from '../../enums/eventType.enum';

@Table({
  timestamps: true,
  tableName: 'Files',
  schema: 'import'
} as TableOptions)
export class ImporterFile extends Model {
  constructor(values?: Partial<ImporterFile>, options ?: BuildOptions){
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
  @Column(DataType.ENUM('COMPETITION_CP', 'COMPETITION_XML', 'TOURNAMENT'))
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
  visualCode: string;

  @Default(false)
  @Column
  importing: boolean;

  @Column
  tournamentNumber: number;
}
