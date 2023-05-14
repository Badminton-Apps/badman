import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
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
} from 'sequelize';
import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { SecurityType } from '@badman/utils';
import { Club } from '../club.model';
import { Player } from '../player.model';
import { RoleClaimMembership } from './claim-role-membership.model';
import { Claim, ClaimUpdateInput } from './claim.model';
import { PlayerRoleMembership } from './role-player-membership.model';
import { EventCompetition, EventTournament } from '../event';
import { Team } from '../team.model';

@Table({
  timestamps: true,
  schema: 'security',
})
@ObjectType({ description: 'A Role' })
export class Role extends Model {
  constructor(values?: Partial<Role>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Index
  @Field({ nullable: true })
  @Column
  name: string;

  @Index
  @Field({ nullable: true })
  @Column
  description: string;

  @Field()
  @Column
  locked: boolean;

  @BelongsToMany(() => Claim, () => RoleClaimMembership)
  claims: (Claim & { RoleClaimMembership: RoleClaimMembership })[];

  @BelongsToMany(() => Player, () => PlayerRoleMembership)
  players: (Player & { PlayerClaimMembership: PlayerRoleMembership })[];

  @BelongsTo(() => Club, {
    foreignKey: 'linkId',
    constraints: false,
  })
  club: Club;

  @BelongsTo(() => Team, {
    foreignKey: 'linkId',
    constraints: false,
  })
  team: Team;

  @BelongsTo(() => EventCompetition, {
    foreignKey: 'linkId',
    constraints: false,
  })
  competition: EventCompetition;

  @BelongsTo(() => EventTournament, {
    foreignKey: 'linkId',
    constraints: false,
  })
  tournament: EventTournament;

  @Field({ nullable: true })
  @Column
  linkId: string;

  @Field({ nullable: true })
  @Column(
    DataType.ENUM(
      SecurityType.GLOBAL,
      SecurityType.CLUB,
      SecurityType.TEAM,
      SecurityType.COMPETITION,
      SecurityType.TOURNAMENT
    )
  )
  linkType: string;

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

  // Belongs to Team
  getTeam!: BelongsToGetAssociationMixin<Team>;
  setTeam!: BelongsToSetAssociationMixin<Team, string>;

  // Belongs to EventCompetition
  getCompetition!: BelongsToGetAssociationMixin<EventCompetition>;
  setCompetition!: BelongsToSetAssociationMixin<EventCompetition, string>;

  // Belongs to EventTournament
  getTournament!: BelongsToGetAssociationMixin<EventTournament>;
  setTournament!: BelongsToSetAssociationMixin<EventTournament, string>;
}

@InputType()
export class RoleUpdateInput extends PartialType(
  OmitType(Role, ['createdAt', 'updatedAt', 'claims'] as const),
  InputType
) {
  @Field(() => [ClaimUpdateInput])
  claims: Claim[];
}

@InputType()
export class RoleNewInput extends PartialType(
  OmitType(RoleUpdateInput, ['id'] as const),
  InputType
) {}
