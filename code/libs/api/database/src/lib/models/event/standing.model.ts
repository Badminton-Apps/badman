import { BuildOptions } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
} from 'sequelize-typescript';
import { EventEntry } from './entry.model';

@Table({
  timestamps: true,
  schema: 'event',
} as TableOptions)
export class Standing extends Model {
  constructor(values?: Partial<Standing>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @BelongsTo(() => EventEntry, 'entryId')
  entry?: EventEntry;

  @ForeignKey(() => EventEntry)
  @Column
  entryId: string;

  @Column
  position: number;

  @Column
  points: number;

  @Column
  played: number;

  @Column
  gamesWon: number;
  @Column
  gamesLost: number;

  @Column
  setsWon: number;
  @Column
  setsLost: number;

  @Column
  totalPointsWon: number;

  @Column
  totalPointsLost: number;

  /**
   * Competition: encounters won
   * Tournament: Ignored
   */
  @Column
  won?: number;

  /**
   * Competition: encounters draw
   * Tournament: Ignored
   */
  @Column
  tied?: number;

  /**
   * Competition: encounters lost
   * Tournament: Ignored
   */
  @Column
  lost?: number;

  restartCount(){
    this.position = 0;
    this.points = 0;
    this.played = 0;
    this.gamesWon = 0;  
    this.gamesLost = 0;
    this.setsWon = 0;
    this.setsLost = 0;
    this.totalPointsWon = 0;
    this.totalPointsLost = 0;
    this.won = 0;
    this.tied = 0;
    this.lost = 0;
  }
}
