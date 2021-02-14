import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyRemoveAssociationMixin
} from 'sequelize/types';
import { Club } from './club.model';
import { SubEvent } from './event';
import { Player } from './player.model';
import { TeamMembership } from './team-membership.model';

@Table({
  timestamps: true,
  schema: 'public'
})
export class Team extends Model {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Column
  abbreviation: string;

  @BelongsTo(() => SubEvent, 'SubEventId')
  subEvents?: SubEvent;

  @BelongsTo(() => Club, 'ClubId')
  club?: Club;

  @ForeignKey(() => Club)
  @Unique('unique_constraint')
  @Column
  ClubId: string;

  @BelongsToMany(
    () => Player,
    () => TeamMembership
  )
  players: Player[];

  public getPlayers!: BelongsToManyGetAssociationsMixin<Player>;
  public addPlayer!: BelongsToManyAddAssociationMixin<Player, string>;
  public removePlayer!: BelongsToManyRemoveAssociationMixin<Player, string>;
  public hasPlayer!: BelongsToManyHasAssociationMixin<Player, string>;
}
