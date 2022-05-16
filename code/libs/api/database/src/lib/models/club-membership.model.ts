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
import { Field, ID } from '@nestjs/graphql';

@Table({
  schema: 'public',
})
export class ClubMembership extends Model {
  constructor(values?: Partial<ClubMembership>, options?: BuildOptions) {
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
  @Unique('ClubMemberships_playerId_clubId_unique')
  @AllowNull(false)
  @Field({ nullable: true })
  @Column
  start: Date;


}
