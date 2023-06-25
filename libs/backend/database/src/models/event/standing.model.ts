import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
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
import { Relation } from '../../wrapper';

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
  @Column(DataType.UUIDV4)
  id!: string;

  @BelongsTo(() => EventEntry, 'entryId')
  entry?: Relation<EventEntry>;

  @ForeignKey(() => EventEntry)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  entryId?: string;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  position?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  size?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  points?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  played?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  gamesWon?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  gamesLost?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  setsWon?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  setsLost?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalPointsWon?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalPointsLost?: number;

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  riser?: boolean;

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  faller?: boolean;

  /**
   * Competition: encounters won
   * Tournament: Ignored
   */
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  won?: number;

  /**
   * Competition: encounters draw
   * Tournament: Ignored
   */
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  tied?: number;

  /**
   * Competition: encounters lost
   * Tournament: Ignored
   */
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
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
