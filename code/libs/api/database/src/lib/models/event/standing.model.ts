import { Field, ID, ObjectType } from '@nestjs/graphql';
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
@ObjectType({ description: 'A Standing' })
export class Standing extends Model {
  constructor(values?: Partial<Standing>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @BelongsTo(() => EventEntry, 'entryId')
  entry?: EventEntry;

  @ForeignKey(() => EventEntry)
  @Field({ nullable: true })
  @Column
  entryId: string;

  @Field({ nullable: true })
  @Column
  position: number;

  @Field({ nullable: true })
  @Column
  points: number;

  @Field({ nullable: true })
  @Column
  played: number;

  @Field({ nullable: true })
  @Column
  gamesWon: number;
  @Field({ nullable: true })
  @Column
  gamesLost: number;

  @Field({ nullable: true })
  @Column
  setsWon: number;
  @Field({ nullable: true })
  @Column
  setsLost: number;

  @Field({ nullable: true })
  @Column
  totalPointsWon: number;

  @Field({ nullable: true })
  @Column
  totalPointsLost: number;

  /**
   * Competition: encounters won
   * Tournament: Ignored
   */
  @Field({ nullable: true })
  @Column
  won?: number;

  /**
   * Competition: encounters draw
   * Tournament: Ignored
   */
  @Field({ nullable: true })
  @Column
  tied?: number;

  /**
   * Competition: encounters lost
   * Tournament: Ignored
   */
  @Field({ nullable: true })
  @Column
  lost?: number;

  restartCount() {
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
