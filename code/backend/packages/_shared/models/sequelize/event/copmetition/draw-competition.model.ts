import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import {
  BuildOptions,
  HasManyGetAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize/types';
import { Game } from '..';
import { DrawType } from '../../..';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class DrawCompetition extends Model {
  constructor(values?: Partial<DrawCompetition>, options?: BuildOptions) {
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
  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  type: DrawType;

  @Column
  size: number;

  @HasMany(() => Game, {
    foreignKey: 'drawId',
    constraints: false,
    scope: {
      drawType: 'Tournament'
    }
  })
  games: Game[];

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsTo(() => SubEventCompetition, 'SubEventId')
  subEvent?: SubEventCompetition[];

  @Unique('unique_constraint')
  @ForeignKey(() => SubEventCompetition)
  @Column
  SubEventId: string;

  public getGames!: HasManyGetAssociationsMixin<Game>;
  public setGames!: HasManySetAssociationsMixin<Game, string>;
}
