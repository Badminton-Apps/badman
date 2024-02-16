import {
  Column,
  Index,
  ForeignKey,
  Model,
  Table,
  DataType,
  Unique,
  PrimaryKey,
  IsUUID,
  Default,
  AllowNull,
} from 'sequelize-typescript';
import { ClubMembershipType } from '@badman/utils';
import { BuildOptions } from 'sequelize';
import { Club } from './club.model';
import { Player } from './player.model';
import { Field, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import { Relation } from '../wrapper';

@Table({
  schema: 'public',
})
@ObjectType({ description: 'A ClubPlayerMembership' })
export class ClubPlayerMembership extends Model {
  constructor(values?: Partial<ClubPlayerMembership>, options?: BuildOptions) {
    super(values, options);
  }

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

  club?: Relation<Club>;
  player?: Relation<Player>;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  end?: Date;

  @Default(true)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  active?: boolean;

  @Default(ClubMembershipType.NORMAL)
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM(...Object.keys(ClubMembershipType)))
  membershipType?: Relation<ClubMembershipType>;

  // Below is a hacky way to make the Unique across FK's + start
  // issue: (https://github.com/sequelize/sequelize/issues/12988)
  @Unique('ClubPlayerMemberships_playerId_clubId_unique')
  @AllowNull(false)
  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  start?: Date;
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
