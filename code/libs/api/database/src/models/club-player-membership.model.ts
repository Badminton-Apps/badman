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
import { BuildOptions } from 'sequelize';
import { Club } from './club.model';
import { Player } from './player.model';
import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';

@Table({
  schema: 'public',
})
@ObjectType({ description: 'A TeamPlayerMembership' })
export class ClubPlayerMembership extends Model {
  constructor(values?: Partial<ClubPlayerMembership>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @ForeignKey(() => Player)
  @AllowNull(false)
  @Index('player_club_index')
  @Field({ nullable: true })
  @Column
  playerId: string;

  @ForeignKey(() => Club)
  @AllowNull(false)
  @Index('player_club_index')
  @Field({ nullable: true })
  @Column
  clubId: string;

  club: Club;
  player: Player;

  @Field({ nullable: true })
  @Column
  end?: Date;

  @Default(true)
  @Field({ nullable: true })
  @Column(DataType.BOOLEAN)
  active?: boolean;

  // Below is a hacky way to make the Unique across FK's + start
  // issue: (https://github.com/sequelize/sequelize/issues/12988)
  @Unique('ClubPlayerMemberships_playerId_clubId_unique')
  @AllowNull(false)
  @Field({ nullable: true })
  @Column
  start: Date;
}

@InputType()
export class ClubPlayerMembershipUpdateInput extends PartialType(
  OmitType(ClubPlayerMembership, ['createdAt', 'updatedAt'] as const),
  InputType
) {}

@InputType()
export class ClubPlayerMembershipNewInput extends PartialType(
  OmitType(ClubPlayerMembershipUpdateInput, ['id'] as const),
  InputType
) {}
