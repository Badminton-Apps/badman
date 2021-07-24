import { Club } from '@badvlasim/shared';
import { Player } from './player.model';
import { EventCompetition } from './event/competition/event-competition.model';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { EncounterChange } from './event';

@Table({
  timestamps: true
} as TableOptions)
export class Comment extends Model {
  constructor(values?: Partial<Comment>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column(DataType.TEXT)
  message: string;

  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @ForeignKey(() => Player)
  @Index
  @Column
  playerId: string;

  @BelongsTo(() => Club, 'clubId')
  club: Club;

  @ForeignKey(() => Club)
  @Index
  @Column
  clubId: string;

  @BelongsTo(() => EventCompetition, {
    foreignKey: 'linkId',
    constraints: false
  })
  competition: EventCompetition;

  @BelongsTo(() => EncounterChange, {
    foreignKey: 'linkId',
    constraints: false
  })
  encounter: EncounterChange;

  @Index('comment_index')
  @Column
  linkId: string;

  @Index('comment_index')
  @Column
  linkType: string;

  // Belongs to Competition
  getCompetition!: BelongsToGetAssociationMixin<EventCompetition>;
  setCompetition!: BelongsToSetAssociationMixin<EventCompetition, string>;
}
