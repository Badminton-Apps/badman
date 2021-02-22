import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { BuildOptions, HasManyGetAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize/types';
import { Game } from '..';
import { DrawType } from '../../..';
import { SubEventTournament } from './sub-event-tournament.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class DrawTournament extends Model {
  constructor(values?: Partial<DrawTournament>, options?: BuildOptions) {
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

  @BelongsTo(() => SubEventTournament, 'SubEventId')
  subEvent?: SubEventTournament[];

  @Unique('unique_constraint')
  @ForeignKey(() => SubEventTournament)
  @Column
  SubEventId: string;

  public getGames!: HasManyGetAssociationsMixin<Game>;
  public setGames!: HasManySetAssociationsMixin<Game, string>;
}
