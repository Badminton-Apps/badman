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
  TableOptions,
  Unique
} from 'sequelize-typescript';
import { EventCompetition, EventTournament } from '.';
import { Court } from './court.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Location extends Model {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Column
  address: string;

  @Column
  postalcode: string;

  @Column
  city: string;

  @Column
  state: string;

  @Column
  phone: string;

  @Column
  fax: string;

  @HasMany(() => Court, 'locationId')
  courts: Court;

  @BelongsTo(() => EventTournament, {
    foreignKey: 'eventId',
    constraints: false,
    scope: {
      eventType: 'tournament'
    }
  })
  eventTournament: EventTournament;

  @BelongsTo(() => EventCompetition, {
    foreignKey: 'eventId',
    constraints: false,
    scope: {
      eventType: 'competition'
    }
  })
  eventCompetition: EventCompetition;

  @Unique('unique_constraint')
  @Column
  eventId: string;

  @Unique('unique_constraint')
  @Column
  eventType: string;
}
