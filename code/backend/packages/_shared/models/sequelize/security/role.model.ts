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
} from 'sequelize';
import {
  AllowNull,
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
import { Player, RoleClaimMembership } from '..';
import { Club } from '../club.model';
import { Claim } from './claim.model';
import { PlayerRoleMembership } from './role-player-membership.model';

@Table({
  timestamps: true,
  schema: 'security'
})
export class Role extends Model {
  constructor(values?: Partial<Role>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Index
  @Column
  name: string;

  @Index
  @Column
  description: string;

  @BelongsToMany(
    () => Claim,
    () => RoleClaimMembership
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  claims: (Claim & { RoleClaimMembership: RoleClaimMembership })[];

  @BelongsToMany(
    () => Player,
    () => PlayerRoleMembership
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  players: (Player & { PlayerClaimMembership: PlayerRoleMembership })[];

  @BelongsTo(() => Club, 'clubId')
  club: Club;

  @ForeignKey(() => Club)
  @Column
  clubId: string;

  // Belongs to many Claim
  getClaims!: BelongsToManyGetAssociationsMixin<Claim>;
  setClaims!: BelongsToManySetAssociationsMixin<Claim, string>;
  addClaims!: BelongsToManyAddAssociationsMixin<Claim, string>;
  addClaim!: BelongsToManyAddAssociationMixin<Claim, string>;
  removeClaim!: BelongsToManyRemoveAssociationMixin<Claim, string>;
  removeClaims!: BelongsToManyRemoveAssociationsMixin<Claim, string>;
  hasClaim!: BelongsToManyHasAssociationMixin<Claim, string>;
  hasClaims!: BelongsToManyHasAssociationsMixin<Claim, string>;
  countClaim!: BelongsToManyCountAssociationsMixin;

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

  // Belongs to Club
  getClub!: BelongsToGetAssociationMixin<Club>;
  setClub!: BelongsToSetAssociationMixin<Club, string>;
}
