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
  BelongsToGetAssociationMixin, 
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin, 
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin, 
  BelongsToManyRemoveAssociationsMixin, 
  BelongsToManySetAssociationsMixin,
  BelongsToSetAssociationMixin
} from 'sequelize';
import { Club } from './club.model';
import { SubEventCompetition } from './event';
import { Player } from './player.model';
import { TeamPlayerMembership } from './team-player-membership.model';
import { TeamSubEventMembership } from './team-subEvent-membership.model';

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

  @BelongsToMany(
    () => SubEventCompetition,
    () => TeamSubEventMembership
  )
  subEvents: SubEventCompetition[];

  @BelongsTo(() => Club, 'ClubId')
  club?: Club;

  @ForeignKey(() => Club)
  @Unique('unique_constraint')
  @Column
  ClubId: string;

  @BelongsToMany(
    () => Player,
    () => TeamPlayerMembership
  )
  players: Player[];

  // Belongs to Club
  getClub!: BelongsToGetAssociationMixin<Club>;
  setClub!: BelongsToSetAssociationMixin<Club, string>;

  // Belongs to many Player
  getPlayers!: BelongsToManyGetAssociationsMixin<Player>;
  setPlayer!: BelongsToManySetAssociationsMixin<Player, string>;
  addPlayers!: BelongsToManyAddAssociationsMixin<Player, string>;
  addPlayer!: BelongsToManyAddAssociationMixin<Player, string>;
  removePlayer!: BelongsToManyRemoveAssociationMixin<Player, string>;
  removePlayers!: BelongsToManyRemoveAssociationsMixin<Player, string>;
  hasPlayer!: BelongsToManyHasAssociationMixin<Player, string>;
  hasPlayers!: BelongsToManyHasAssociationsMixin<Player, string>;
  countPlayer!: BelongsToManyCountAssociationsMixin;

  // Belongs to many SubEvent
  getSubEvents!: BelongsToManyGetAssociationsMixin<SubEventCompetition>;
  setSubEvent!: BelongsToManySetAssociationsMixin<SubEventCompetition, string>;
  addSubEvents!: BelongsToManyAddAssociationsMixin<SubEventCompetition, string>;
  addSubEvent!: BelongsToManyAddAssociationMixin<SubEventCompetition, string>;
  removeSubEvent!: BelongsToManyRemoveAssociationMixin<SubEventCompetition, string>;
  removeSubEvents!: BelongsToManyRemoveAssociationsMixin<SubEventCompetition, string>;
  hasSubEvent!: BelongsToManyHasAssociationMixin<SubEventCompetition, string>;
  hasSubEvents!: BelongsToManyHasAssociationsMixin<SubEventCompetition, string>;
  countSubEvent!: BelongsToManyCountAssociationsMixin;
}
