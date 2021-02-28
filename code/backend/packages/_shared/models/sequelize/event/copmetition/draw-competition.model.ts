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
import {
<<<<<<< HEAD:code/backend/packages/_shared/models/sequelize/event/copmetition/draw-competition.model.ts
  BuildOptions,
  HasManyGetAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize/types';
import { Game } from '..';
import { DrawType } from '../../..';
import { SubEventCompetition } from './sub-event-competition.model';

=======
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions
} from 'sequelize';
import { DrawType } from '../../enums';
import { Game } from './game.model';
import { SubEvent } from './sub-event.model';
 
>>>>>>> main:code/backend/packages/_shared/models/sequelize/event/draw.model.ts
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

<<<<<<< HEAD:code/backend/packages/_shared/models/sequelize/event/copmetition/draw-competition.model.ts
  public getGames!: HasManyGetAssociationsMixin<Game>;
  public setGames!: HasManySetAssociationsMixin<Game, string>;
=======
  // Belongs to SubEvent
  getSubEvent!: BelongsToGetAssociationMixin<SubEvent>;
  setSubEvent!: BelongsToSetAssociationMixin<SubEvent, string>;
>>>>>>> main:code/backend/packages/_shared/models/sequelize/event/draw.model.ts
}
