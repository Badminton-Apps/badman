import {
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique
} from 'sequelize-typescript';
<<<<<<< HEAD:code/backend/packages/_shared/models/sequelize/event/tournament/event-tournament.model.ts
import { BuildOptions } from 'sequelize/types';
import { Location, SubEventTournament } from '..';

=======
import {
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize/types';
import { EventType } from '../../enums';
import { SubEvent } from './sub-event.model';
>>>>>>> main:code/backend/packages/_shared/models/sequelize/event/event.model.ts

@Table({
  timestamps: true,
  schema: 'event'
})
export class EventTournament extends Model {
  constructor(values?: Partial<EventTournament>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  tournamentNumber: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column
  firstDay: Date;

  @Column
  dates: string; 

  @HasMany(() => SubEventTournament, 'EventId')
  subEvents: SubEventTournament[];


<<<<<<< HEAD:code/backend/packages/_shared/models/sequelize/event/tournament/event-tournament.model.ts
  @HasMany(() => Location, {
    foreignKey: 'eventId',
    constraints: false,
    scope: {
      drawType: 'Tournament'
    }
  })
  locations: Location[];

=======
>>>>>>> main:code/backend/packages/_shared/models/sequelize/event/event.model.ts
  @Column
  uniCode: string;

  // Has many subEvent
  getSubEvents!: HasManyGetAssociationsMixin<SubEvent>;
  setSubEvents!: HasManySetAssociationsMixin<SubEvent, string>;
  addSubEvents!: HasManyAddAssociationsMixin<SubEvent, string>;
  addsubEvent!: HasManyAddAssociationMixin<SubEvent, string>;
  removesubEvent!: HasManyRemoveAssociationMixin<SubEvent, string>;
  removeSubEvents!: HasManyRemoveAssociationsMixin<SubEvent, string>;
  hassubEvent!: HasManyHasAssociationMixin<SubEvent, string>;
  hasSubEvents!: HasManyHasAssociationsMixin<SubEvent, string>;
  countSubEvents!: HasManyCountAssociationsMixin;
}
