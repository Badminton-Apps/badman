import { Table, Model, Default, DataType, IsUUID, PrimaryKey, Column } from 'sequelize-typescript';
import { BuildOptions } from 'sequelize';

@Table({
  timestamps: true,
  schema: 'job'
})
export class  Cron extends Model {
  constructor(values?: Partial<Cron>, options?: BuildOptions) {
    super(values, options);
  }
 
  // #region fields
  @Default(DataType.UUIDV4)
  @IsUUID(4) 
  @PrimaryKey
  @Column 
  id: string;

  @Column
  cron: string;

  @Column
  type: string

  @Column 
  lastRun: Date;

  @Column 
  running: boolean;

  @Column(DataType.JSON)
  meta: any;

}