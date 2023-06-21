import { TeamMembershipType } from '@badman/utils';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BuildOptions, SaveOptions } from 'sequelize';
import {
  AfterBulkCreate,
  AfterCreate,
  AllowNull,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { ClubPlayerMembership } from './club-player-membership.model';
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  schema: 'public',
})
@ObjectType()
export class TeamPlayerMembership extends Model {
  constructor(values?: Partial<TeamPlayerMembership>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  id: string;

  @ForeignKey(() => Player)
  @AllowNull(false)
  @Index('player_team_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId: string;

  @ForeignKey(() => Team)
  @AllowNull(false)
  @Index('player_team_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  teamId: string;

  @Default(TeamMembershipType.REGULAR)
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM(...Object.keys(TeamMembershipType)))
  membershipType?: TeamMembershipType;

  @Column(DataType.DATE)
  end?: Date;

  // Below is a hacky way to make the Unique across FK's + start
  // issue: (https://github.com/sequelize/sequelize/issues/12988)
  @Unique('TeamPlayerMemberships_teamId_playerId_unique')
  @AllowNull(false)
  @Column(DataType.DATE)
  start: Date;

  @AfterCreate
  static async checkIfPlayerIsInClub(
    instance: TeamPlayerMembership,
    options: SaveOptions
  ) {
    const team = await Team.findByPk(instance.teamId, {
      transaction: options.transaction,
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const connection = await ClubPlayerMembership.findOne({
      order: [['end', 'desc']],
      where: { playerId: instance.playerId },
      transaction: options.transaction,
    });
    if (!connection) {
      // create new
      await new ClubPlayerMembership({
        clubId: team.clubId,
        playerId: instance.playerId,
        start: new Date(),
      }).save({ transaction: options.transaction });
    } else {
      if (connection.clubId !== team.clubId) {
        // Terminate last
        const now = new Date();
        connection.end = now;
        connection.save({ transaction: options.transaction });

        // Create new
        await new ClubPlayerMembership({
          clubId: team.clubId,
          playerId: instance.playerId,
          start: new Date(),
        }).save({ transaction: options.transaction });
      }
    }
  }

  @AfterBulkCreate
  static async checkIfPlayersIsInClub(
    instances: TeamPlayerMembership[],
    options: SaveOptions
  ) {
    for (const team of instances) {
      await this.checkIfPlayerIsInClub(team, options);
    }
  }
}