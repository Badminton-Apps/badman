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
} from 'sequelize';
import {
  BelongsToMany,
  Column,
  DataType,
  Default,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Player } from '../player.model';
import { PlayerClaimMembership } from './claim-player-membership.model';
import { RoleClaimMembership } from './claim-role-membership.model';
import { Role } from './role.model';
import { SecurityType } from './security-types.enum';

@Table({
  timestamps: true,
  schema: 'security',
})
export class Claim extends Model {
  constructor(values?: Partial<Claim>, options?: BuildOptions) {
    super(values, options);
  }
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('Claims_name_category')
  @Index
  @Column
  name: string;

  @Index
  @Column
  description: string;

  @Unique('Claims_name_category')
  @Column
  category: string;

  @Column(DataType.ENUM(SecurityType.GLOBAL, SecurityType.CLUB, SecurityType.TEAM))
  type: SecurityType;

  @BelongsToMany(() => Player, () => PlayerClaimMembership)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  players: (Player & { PlayerClaimMembership: PlayerClaimMembership })[];

  @BelongsToMany(() => Role, () => RoleClaimMembership)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  roles: (Role & { RoleClaimMembership: RoleClaimMembership })[];

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

  // Belongs to many Role
  getRoles!: BelongsToManyGetAssociationsMixin<Role>;
  setRole!: BelongsToManySetAssociationsMixin<Role, string>;
  addRoles!: BelongsToManyAddAssociationsMixin<Role, string>;
  addRole!: BelongsToManyAddAssociationMixin<Role, string>;
  removeRole!: BelongsToManyRemoveAssociationMixin<Role, string>;
  removeRoles!: BelongsToManyRemoveAssociationsMixin<Role, string>;
  hasRole!: BelongsToManyHasAssociationMixin<Role, string>;
  hasRoles!: BelongsToManyHasAssociationsMixin<Role, string>;
  countRole!: BelongsToManyCountAssociationsMixin;
}
