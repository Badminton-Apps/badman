import {
  BeforeCreate,
  BeforeUpdate,
  BelongsTo,
  BelongsToMany,
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
  BelongsToSetAssociationMixin,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize';
import { Club } from './club.model';
import { EncounterCompetition, SubEventCompetition } from './event';
import { Player } from './player.model';
import { TeamPlayerMembership } from './team-player-membership.model';
import { TeamSubEventMembership } from './team-subEvent-membership.model';
import { SubEventType } from '../enums';

@Table({
  timestamps: true,
  schema: 'public'
})
export class Team extends Model {
  @BeforeUpdate
  @BeforeCreate
  static setAbbriviation(instance: Team) {
    if (!instance.abbreviation) {
      const suffix = (instance?.name?.substr(instance?.name?.length - 4).match(/(\d+[GHD])/) ?? [''])[0];
      let club = instance.name.replace(` ${suffix}`, '')
      club = club.replace(/[^0-9a-zA-Z]+/, ' ');
      
      if (club.indexOf(' ') !== -1){
        club = club.match(/\b(\w)/g)?.join('');
      }

      if (suffix.length){
        instance.abbreviation = `${club} ${suffix}`
      }
    }
  }

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

  @Column
  type: SubEventType;

  @HasMany(() => EncounterCompetition, 'homeTeamId')
  homeEncounters: EncounterCompetition;

  @HasMany(() => EncounterCompetition, 'awayTeamId')
  awayEncounters: EncounterCompetition;

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
  removeSubEvent!: BelongsToManyRemoveAssociationMixin<
    SubEventCompetition,
    string
  >;
  removeSubEvents!: BelongsToManyRemoveAssociationsMixin<
    SubEventCompetition,
    string
  >;
  hasSubEvent!: BelongsToManyHasAssociationMixin<SubEventCompetition, string>;
  hasSubEvents!: BelongsToManyHasAssociationsMixin<SubEventCompetition, string>;
  countSubEvent!: BelongsToManyCountAssociationsMixin;

  // Has many HomeEncounter
  getHomeEncounters!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setHomeEncounters!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addHomeEncounters!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addHomeEncounter!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeHomeEncounter!: HasManyRemoveAssociationMixin<
    EncounterCompetition,
    string
  >;
  removeHomeEncounters!: HasManyRemoveAssociationsMixin<
    EncounterCompetition,
    string
  >;
  hasHomeEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasHomeEncounters!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countHomeEncounters!: HasManyCountAssociationsMixin;

  // Has many AwayEncounter
  getAwayEncounters!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setAwayEncounters!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addAwayEncounters!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addAwayEncounter!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeAwayEncounter!: HasManyRemoveAssociationMixin<
    EncounterCompetition,
    string
  >;
  removeAwayEncounters!: HasManyRemoveAssociationsMixin<
    EncounterCompetition,
    string
  >;
  hasAwayEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasAwayEncounters!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countAwayEncounters!: HasManyCountAssociationsMixin;
}
