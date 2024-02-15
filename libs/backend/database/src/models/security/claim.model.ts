import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
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
import { SecurityType } from '@badman/utils';

@Table({
  timestamps: true,
  schema: 'security',
})
@ObjectType({ description: 'A Claim' })
export class Claim extends Model {
  constructor(values?: Partial<Claim>, options?: BuildOptions) {
    super(values, options);
  }
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  override id!: string;
  
  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Unique('Claims_name_category')
  @Index
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name?: string;

  @Index
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  description?: string;

  @Unique('Claims_name_category')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  category?: string;

  @Field(() => String, { nullable: true })
  @Column(
    DataType.ENUM(SecurityType.GLOBAL, SecurityType.CLUB, SecurityType.TEAM)
  )
  type?: SecurityType;

  @BelongsToMany(() => Player, () => PlayerClaimMembership)
  players?: (Player & { PlayerClaimMembership?: PlayerClaimMembership })[];

  @BelongsToMany(() => Role, () => RoleClaimMembership)
  roles?: (Role & { RoleClaimMembership: RoleClaimMembership })[];

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
@InputType()
export class ClaimUpdateInput extends PartialType(
  OmitType(Claim, ['createdAt', 'updatedAt'] as const),
  InputType
) {}

@InputType()
export class ClaimNewInput extends PartialType(
  OmitType(ClaimUpdateInput, ['id'] as const),
  InputType
) {}
