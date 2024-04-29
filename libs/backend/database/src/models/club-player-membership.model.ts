import { ClubMembershipType } from '@badman/utils';
import { Field, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import {
  AllowNull,
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
  Unique,
} from 'sequelize-typescript';
import { Relation } from '../wrapper';
import { Club } from './club.model';
import { Player } from './player.model';
import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin } from 'sequelize';

@Table({
  schema: 'public',
})
@ObjectType({ description: 'A ClubPlayerMembership' })
export class ClubPlayerMembership extends Model {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  override id!: string;

  @ForeignKey(() => Player)
  @AllowNull(false)
  @Index('player_club_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  @ForeignKey(() => Club)
  @AllowNull(false)
  @Index('player_club_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  clubId?: string;

  @BelongsTo(() => Club, 'clubId')
  club?: Relation<Club>;

  @BelongsTo(() => Player, 'playerId')
  player?: Relation<Player>;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  end?: Date;

  @Default(false)
  @Field(() => Boolean)
  @Column(DataType.BOOLEAN)
  confirmed?: boolean;

  @Default(true)
  @Field(() => Boolean)
  @Column(DataType.VIRTUAL)
  get active() {
    // if the start is passed and end is null or in the future, it is active
    return (
      this.confirmed &&
      this.start &&
      this.start < new Date() &&
      (!this.end || this.end > new Date())
    );
  }

  @Default(ClubMembershipType.NORMAL)
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM(...Object.keys(ClubMembershipType)))
  membershipType?: Relation<ClubMembershipType>;

  // Below is a hacky way to make the Unique across FK's + start
  // issue: (https://github.com/sequelize/sequelize/issues/12988)
  @Unique('ClubPlayerMemberships_playerId_clubId_unique')
  @AllowNull(false)
  @Field(() => Date, { defaultValue: new Date() })
  @Column(DataType.DATE)
  start!: Date;

  // Belongs to Club
  getClub!: BelongsToGetAssociationMixin<Club>;
  setClub!: BelongsToSetAssociationMixin<Club, string>;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;
}

@InputType()
export class ClubPlayerMembershipUpdateInput extends PartialType(
  OmitType(ClubPlayerMembership, ['createdAt', 'updatedAt'] as const),
  InputType,
) {}

@InputType()
export class ClubPlayerMembershipNewInput extends PartialType(
  OmitType(ClubPlayerMembershipUpdateInput, ['id'] as const),
  InputType,
) {}
