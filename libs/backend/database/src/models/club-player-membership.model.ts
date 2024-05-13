import { ClubMembershipType } from '@badman/utils';
import { Field, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
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

@Table({
  schema: 'public',
})
@ObjectType({ description: 'A ClubPlayerMembership' })
export class ClubPlayerMembership extends Model<
  InferAttributes<ClubPlayerMembership>,
  InferCreationAttributes<ClubPlayerMembership>
> {
  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @ForeignKey(() => Player)
  @AllowNull(false)
  @Index('player_club_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  declare playerId?: string;

  @ForeignKey(() => Club)
  @AllowNull(false)
  @Index('player_club_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  declare clubId?: string;

  @BelongsTo(() => Club, 'clubId')
  declare club?: Relation<Club>;

  @BelongsTo(() => Player, 'playerId')
  declare player?: Relation<Player>;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  declare end?: Date | null;

  @Default(false)
  @Field(() => Boolean)
  @Column(DataType.BOOLEAN)
  declare confirmed?: boolean;

  @Default(true)
  @Field(() => Boolean)
  @Column(DataType.VIRTUAL(DataType.BOOLEAN)) //[Sequelize.literal('start < now() AND (end IS NULL OR end > now())')]
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
  declare membershipType?: Relation<ClubMembershipType>;

  // Below is a hacky way to make the Unique across FK's + start
  // issue: (https://github.com/sequelize/sequelize/issues/12988)
  @Unique('ClubPlayerMemberships_playerId_clubId_unique')
  @AllowNull(false)
  @Field(() => Date, { defaultValue: new Date() })
  @Column(DataType.DATE)
  declare start: Date;

  // Belongs to Club
  declare getClub: BelongsToGetAssociationMixin<Club>;
  declare setClub: BelongsToSetAssociationMixin<Club, string>;

  // Belongs to Player
  declare getPlayer: BelongsToGetAssociationMixin<Player>;
  declare setPlayer: BelongsToSetAssociationMixin<Player, string>;
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
