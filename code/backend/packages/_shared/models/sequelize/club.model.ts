import { Comment } from './comment.model';
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  Op,
  SaveOptions
} from 'sequelize';
import {
  AfterBulkCreate,
  AfterCreate,
  AllowNull,
  BeforeBulkCreate,
  BeforeBulkUpdate,
  BeforeCreate,
  BeforeUpdate,
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { ClubMembership } from './club-membership.model';
import { Location } from './event';
import { Player } from './player.model';
import { Claim, Role } from './security';
import { Team } from './team.model';

@Table({
  timestamps: true,
  schema: 'public'
})
export class Club extends Model {
  constructor(values?: Partial<Club>, options?: BuildOptions) {
    super(values, options);
  }

  // #region fields
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique
  @Index
  @AllowNull(false)
  @Column
  name: string;

  @Column
  abbreviation: string;

  @Column
  clubId?: number;

  @HasMany(() => Team, 'clubId')
  teams?: Team[];

  @HasMany(() => Role)
  roles?: Role[];

  @BelongsToMany(
    () => Player,
    () => ClubMembership
  )
  players: Player[];

  @HasMany(() => Location)
  locations: Location[];

  // #endregion

  // #region hooks
  @BeforeUpdate
  @BeforeCreate
  static setAbbriviation(instance: Club, options: SaveOptions) {
    if (!instance.abbreviation && instance.isNewRecord) {
      instance.abbreviation = instance?.name?.match(/\b(\w)/g)?.join('');
    }
  }

  @BeforeBulkUpdate
  @BeforeBulkCreate
  static setAbbriviations(instances: Club[], options: SaveOptions) {
    for (const instance of instances) {
      this.setAbbriviation(instance, options);
    }
  }

  static async createBaseRole(instance: Club, options: SaveOptions) {
    const [dbRole, created] = await Role.findOrCreate({
      where: {
        name: 'Admin',
        clubId: instance.id
      },
      defaults: {
        name: 'Admin'
      },
      transaction: options.transaction
    });

    if (created) {
      const claims = await Claim.findAll({
        where: {
          type: {
            [Op.in]: ['club', 'team']
          }
        },
        transaction: options.transaction
      });

      await dbRole.setClub(instance, { transaction: options.transaction });
      await dbRole.setClaims(claims, { transaction: options.transaction });
    }
  }

  static async createBaseRoles(instances: Club[], options: SaveOptions) {
    for (const club of instances) {
      await this.createBaseRole(club, options);
    }
  }

  // #endregion

  // #region mixins

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

  // Has many Location
  getLocations!: HasManyGetAssociationsMixin<Location>;
  setLocations!: HasManySetAssociationsMixin<Location, string>;
  addLocations!: HasManyAddAssociationsMixin<Location, string>;
  addLocation!: HasManyAddAssociationMixin<Location, string>;
  removeLocation!: HasManyRemoveAssociationMixin<Location, string>;
  removeLocations!: HasManyRemoveAssociationsMixin<Location, string>;
  hasLocation!: HasManyHasAssociationMixin<Location, string>;
  hasLocations!: HasManyHasAssociationsMixin<Location, string>;
  countLocations!: HasManyCountAssociationsMixin;

  // Has many Role
  getRoles!: HasManyGetAssociationsMixin<Role>;
  setRoles!: HasManySetAssociationsMixin<Role, string>;
  addRoles!: HasManyAddAssociationsMixin<Role, string>;
  addRole!: HasManyAddAssociationMixin<Role, string>;
  removeRole!: HasManyRemoveAssociationMixin<Role, string>;
  removeRoles!: HasManyRemoveAssociationsMixin<Role, string>;
  hasRole!: HasManyHasAssociationMixin<Role, string>;
  hasRoles!: HasManyHasAssociationsMixin<Role, string>;
  countRoles!: HasManyCountAssociationsMixin;

  // Has many Team
  getTeams!: HasManyGetAssociationsMixin<Team>;
  setTeams!: HasManySetAssociationsMixin<Team, string>;
  addTeams!: HasManyAddAssociationsMixin<Team, string>;
  addTeam!: HasManyAddAssociationMixin<Team, string>;
  removeTeam!: HasManyRemoveAssociationMixin<Team, string>;
  removeTeams!: HasManyRemoveAssociationsMixin<Team, string>;
  hasTeam!: HasManyHasAssociationMixin<Team, string>;
  hasTeams!: HasManyHasAssociationsMixin<Team, string>;
  countTeams!: HasManyCountAssociationsMixin;

  // #endregion
}
